# MCP 去 Service Role 架构改造（Phase 1，Full Spec）

## 1. 背景与问题

- 当前现状：
  - MCP Server 使用 `SUPABASE_SERVICE_ROLE_KEY` 直接查询 `mcp_api_keys`。
  - Web 侧 MCP Key（用户生成/重置、管理员查看/封禁）也依赖 `getServiceRoleClient()`。
  - `SUPABASE_SERVICE_ROLE_KEY` 权限过大，不符合最小权限原则，也增加部署成本与泄漏风险。
- 触发原因：
  - 业务希望不再依赖 `SUPABASE_SERVICE_ROLE_KEY` 完成 MCP 主链路。
  - 需继续满足“封禁为永久封禁（包含后续重置）”的业务约束。
- 主要痛点：
  - 高权限密钥在多个运行时暴露，安全边界过宽。
  - MCP 部署与本地调试必须配置 service role，使用门槛高。
  - 永久封禁目前主要靠应用层约束，缺少数据库层硬约束。

## 2. 目标与非目标

### 2.1 目标

- Phase 1 内让 MCP 主链路不再依赖 `SUPABASE_SERVICE_ROLE_KEY`：
  - `packages/mcp-server` 认证链路
  - `src/app/api/user/mcp-key` 用户接口
  - `src/app/api/admin/mcp-keys` 管理接口
- 数据库侧补齐永久封禁硬约束，避免用户通过直连 API 绕过应用层逻辑。
- 保持现有 API 行为和 UI 交互语义基本不变。

### 2.2 非目标

- 不在本次移除整个 MingAI 全仓 service role 依赖（例如积分/知识库/部分管理后台能力）。
- 不改动用户教程里的 MCP 地址硬编码。
- 不引入独立鉴权服务进程。

## 3. 方案设计

### 3.1 变更范围

- 影响模块：
  - `supabase/migrations/*`（新增 migration）
  - `src/lib/mcp-keys.ts`
  - `src/app/api/user/mcp-key/route.ts`
  - `src/app/api/admin/mcp-keys/route.ts`
  - `src/lib/api-utils.ts`（管理员鉴权去 service role）
  - `packages/mcp-server/src/supabase.ts`
  - `packages/mcp-server/src/middleware.ts`
  - 文档与部署配置（README、`.env.example`、docker compose）
- 影响接口：
  - 用户 MCP Key 接口行为不变（GET/POST/PUT）。
  - 管理员 MCP Key 接口行为不变（GET/DELETE）。
  - MCP Server 仍使用 `x-api-key`/`Bearer`，内部改为 RPC 校验。
- 影响数据结构：
  - `mcp_api_keys` 增加封禁硬约束字段（`is_banned`）。
  - 新增/调整 RLS 策略、触发器与 RPC 函数。

### 3.2 实现方案

- 核心思路：
  - 以“RLS + SECURITY DEFINER RPC + 最小权限”替代 service role。
  - 用户态操作走用户 token + RLS。
  - 管理员跨用户操作走受控 RPC，并在函数内强制 admin 校验。
  - MCP Server 走 `anon key + 受限 RPC`，仅暴露 key 校验与 last_used_at 更新能力。
- 关键流程：
  - 用户 GET/POST/PUT MCP Key：使用用户会话客户端访问 `mcp_api_keys`（RLS 控制）。
  - 管理员列表/封禁：调用 `admin_list_mcp_keys`/`admin_revoke_mcp_key` RPC（函数内二次 admin 校验）。
  - MCP Server 认证：调用 `mcp_verify_api_key` RPC；命中后再调用 `mcp_touch_key_last_used`。
  - 永久封禁：管理员封禁会设置 `is_banned=true`，用户态重置被 DB 触发器和策略拒绝。
- 兼容策略（向前/向后兼容）：
  - 保持 API 路由路径与返回结构不变。
  - 旧数据自动兼容（`is_banned` 默认值回填）。
  - service role 仍可在仓库其它模块使用，但 MCP 主链路不再依赖。

### 3.3 数据库与迁移

- 是否需要 migration：是。
- 涉及对象（表/字段/索引/约束）：
  - `public.mcp_api_keys`
  - 新增列：`is_banned boolean not null default false`
  - 新增策略：用户 `SELECT/INSERT/UPDATE`（仅本人 + 未封禁）
  - 新增触发器：用户态禁止修改受保护字段、禁止对已封禁 key 执行重置类更新
  - 新增函数：`mcp_verify_api_key`、`mcp_touch_key_last_used`、`admin_list_mcp_keys`、`admin_revoke_mcp_key`
- 回填策略：
  - 历史数据 `is_banned` 统一默认为 `false`。
  - 已封禁旧数据通过 `is_active=false` 保持封禁语义；后续管理员封禁写入 `is_banned=true`。
- RLS/权限影响：
  - 用户仅可读写本人未封禁 key。
  - 管理员跨用户访问仅通过 RPC，函数内执行 admin 校验。
  - `anon` 仅允许执行 MCP 必需 RPC，不开放表级访问。

## 4. 验收标准

- 功能验收：
  - MCP Server 无 `SUPABASE_SERVICE_ROLE_KEY` 仍可完成 key 校验与请求处理。
  - 用户 MCP Key 生成/查看/重置功能正常。
  - 管理员 MCP Key 列表/封禁功能正常。
  - 被封禁用户无法通过任何用户态更新恢复 key。
- 接口验收：
  - 现有 MCP 相关接口路径与主要响应结构保持兼容。
- 性能/稳定性验收：
  - MCP 认证链路无明显性能回退（单次认证增加 1 次 RPC 调用可接受）。
  - 异常情况下返回明确错误码与错误信息。
- 回归范围：
  - `src/tests/mcp-key-logic.test.ts`
  - `packages/mcp-server/tests/middleware.test.mjs`
  - `packages/mcp-server/tests/session-manager.test.mjs`
  - 文档配置与 docker compose 启动说明。

## 5. 测试计划

- 单元测试：
  - MCP key 逻辑测试改为用户态 client + RPC stub。
  - 新增 `mcp-server` 对匿名 key 依赖与 RPC 调用路径约束测试。
- 集成/路由测试：
  - 验证 `/api/user/mcp-key` 与 `/api/admin/mcp-keys` 主要成功/失败路径。
- 手动验证步骤：
  - 用户创建 key -> MCP 客户端可调用。
  - 管理员封禁 -> 用户重置失败 -> MCP 客户端旧 key 失效且无法恢复。

## 6. 风险与回滚

- 失败信号：
  - MCP Server 出现大量 401/500（RPC 调用失败或权限错误）。
  - 管理员列表为空或封禁无效。
  - 用户重置出现误拒绝或误放行。
- 风险等级：中高（涉及鉴权与权限边界）。
- 回滚步骤：
  - 回滚本次 migration 与代码变更。
  - 临时恢复原 service role 路径（`getServiceRoleClient` + 表直接访问）。

## 7. 里程碑与任务拆分

- M1：测试先行，明确新权限边界下的失败用例。
- M2：完成 migration（RLS + RPC + 封禁硬约束）。
- M3：改造 Web MCP API 与 mcp-server 调用层。
- M4：文档与部署配置更新，执行受影响测试。

## 8. 关联信息

- 相关 issue：无。
- 相关 PR：本次待提交 PR。
- 关联文档：
  - `docs/specs/2026-02-11-mcp-ban-and-user-ui.md`
  - `docs/specs/README.md`
  - `docs/specs/templates/spec-full.md`
