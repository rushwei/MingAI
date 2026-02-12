# 全局移除 SUPABASE_SERVICE_ROLE_KEY（Phase 2，Full Spec）

## 1. 背景与问题

- 当前现状：
  - Phase 1 已完成 MCP 主链路去 service role。
  - 仓库内仍有大量模块通过 `getServiceRoleClient()` 间接依赖 `SUPABASE_SERVICE_ROLE_KEY`。
  - `ai-config`、系统任务（提醒/通知/积分恢复）与部分服务端模块仍保留 service role 假设。
- 触发原因：
  - 需求明确要求“最终移除 `SUPABASE_SERVICE_ROLE_KEY`”。
  - 希望统一权限模型，减少超高权限密钥使用面。
- 主要痛点：
  - 当前权限模型混合（用户态 RLS + service role 绕过），维护复杂度高。
  - 部分链路（系统任务）没有用户上下文，无法直接复用用户态 RLS。

## 2. 目标与非目标

### 2.1 目标

- 代码运行链路中彻底移除 `SUPABASE_SERVICE_ROLE_KEY` 依赖。
- 统一改为：`anon key + 系统管理员会话`（受 RLS + admin policy 约束）。
- 完成 Phase 2 涉及模块清理：
  - `src/lib/server/ai-config.ts`
  - 系统任务（提醒、通知、积分恢复）所依赖的数据访问链路
  - 向量索引触发链路（Web -> Edge Function）
- 文档、环境变量、测试同步更新。

### 2.2 非目标

- 不在本次重写所有业务 API 的数据访问范式（允许保留 `getServiceRoleClient()` 名称作为兼容层）。
- 不调整现有业务功能对外契约（API 路径/响应结构保持兼容）。

## 3. 方案设计

### 3.1 变更范围

- 影响模块：
  - `src/lib/supabase-server.ts`
  - `src/lib/api-utils.ts`（兼容导出保留）
  - `src/lib/server/ai-config.ts`
  - `src/lib/ai-stats.ts`
  - `src/lib/knowledge-base/vector-index.ts`
  - `supabase/functions/create-vector-index/index.ts`
  - 通知模块中 `auth.admin.getUserById` 依赖点
  - `.env.example`、README、手册、测试
- 影响接口：
  - 不改变对外 API。
  - 新增/使用系统管理员会话环境变量（email/password）。
- 影响数据结构：
  - migration 新增 admin 判定函数、管理员邮箱查询 RPC、admin 全权限策略补齐。

### 3.2 实现方案

- 核心思路：
  - 服务端“特权客户端”不再使用 service role key，改为 anon key + `accessToken()` 动态注入系统管理员 access token。
  - access token 通过系统管理员账号登录缓存获取（email/password）。
  - DB 通过统一 admin policy 允许管理员角色执行跨用户系统任务。
- 关键流程：
  - 普通用户链路：继续使用用户会话客户端（RLS）。
  - 系统任务链路：使用系统管理员会话客户端（RLS + Admin policy）。
  - 向量索引 Edge Function：由 `INTERNAL_API_SECRET` 鉴权替代 service role header。
- 兼容策略：
  - 保留 `getServiceRoleClient()` 导出名，内部语义切换为“系统管理员会话客户端”。
  - 若系统管理员凭证未配置，相关能力降级（记录错误并回退，不直接崩溃）。

### 3.3 数据库与迁移

- 是否需要 migration：是。
- 涉及对象：
  - `public.is_admin_user()`（SECURITY DEFINER）
  - `public.admin_get_auth_user_emails(uuid[])`（SECURITY DEFINER）
  - 已启用 RLS 的 `public.*` 表新增 `Admins full access` 策略
- 回填策略：不涉及数据回填。
- RLS/权限影响：
  - admin 用户新增统一跨表读写能力（受认证身份约束）。

## 4. 验收标准

- 功能验收：
  - 运行代码不再读取 `SUPABASE_SERVICE_ROLE_KEY`。
  - `ai-config` 仍可从 DB 读取模型（系统管理员凭证已配置时）。
  - 系统任务（提醒/通知/积分恢复）保持可用。
  - 向量索引触发链路可用（改为 internal secret）。
- 接口验收：
  - 对外 API 行为保持兼容。
- 回归范围：
  - `src/tests/ai-config-boundary.test.ts`
  - MCP/server 与相关系统任务测试
  - lint 与受影响测试集。

## 5. 测试计划

- 单元测试：
  - 新增/修改边界测试，确保代码中不再出现 `SUPABASE_SERVICE_ROLE_KEY`。
  - 覆盖 `supabase-server` 新认证路径关键标识。
- 集成测试：
  - 回归 MCP、通知、提醒、模型配置读取相关路由测试。
- 手动验证：
  - 配置系统管理员凭证后，验证后台管理与系统任务链路可执行。

## 6. 风险与回滚

- 失败信号：
  - 系统任务批量失败（401/403）。
  - AI 模型配置读取回退到 env，DB 配置不生效。
  - 管理员通知邮件链路无法获取邮箱。
- 风险等级：高（权限架构切换）。
- 回滚步骤：
  - 回滚本次 migration 与客户端改造。
  - 临时恢复 service role 路径。

## 7. 里程碑与任务拆分

- M1：边界测试先行（红灯）。
- M2：数据库权限模型落地（函数 + policy）。
- M3：服务端客户端、ai-config、系统任务链路切换。
- M4：文档与环境变量收口，执行回归测试。

## 8. 关联信息

- 相关 issue：无。
- 相关 PR：本次待提交 PR。
- 关联文档：
  - `docs/specs/2026-02-11-mcp-no-service-role-phase1.md`
