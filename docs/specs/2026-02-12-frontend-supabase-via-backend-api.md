# 前端 Supabase 全量改为后端 API 代理（Full Spec）

## 1. 背景与问题

- 当前现状：
  - 前端大量页面/组件直接使用 `@/lib/supabase`（浏览器 Supabase Client）访问 Auth 与数据表。
  - 这要求配置 `NEXT_PUBLIC_SUPABASE_URL` 与 `NEXT_PUBLIC_SUPABASE_ANON_KEY`，前端运行时可见。
- 触发原因：
  - 业务要求前端不再直连 Supabase，统一走后端 API。
- 主要痛点：
  - 前端与 Supabase 耦合度高，认证状态分散在前端 SDK。
  - 需要在不大规模改页面调用方的前提下完成架构切换。

## 2. 目标与非目标

### 2.1 目标

- 前端侧不再直接创建 Supabase Browser Client。
- `@/lib/supabase` 改为“后端 API 代理客户端”：
  - `auth.*` 通过后端路由处理并写入服务端 cookie。
  - `from(...).*`、`rpc(...)` 通过后端代理执行。
- 运行配置以 `SUPABASE_URL` / `SUPABASE_ANON_KEY` 为主，不再要求用户手工填写 `NEXT_PUBLIC_*`。
- 移除 `SUPABASE_SYSTEM_ADMIN_ACCESS_TOKEN` 入口，仅保留系统管理员邮箱密码登录。

### 2.2 非目标

- 不改动业务接口路径与响应结构（现有 `/api/*` 业务接口尽量保持兼容）。
- 不在本次重写全部业务路由权限模型（继续依赖 RLS + 现有受控封装）。

## 3. 方案设计

### 3.1 变更范围

- 影响模块：
  - `src/lib/supabase.ts`
  - `src/app/api/auth/route.ts`（新增）
  - `src/app/api/supabase/proxy/route.ts`（新增）
  - `src/lib/api-utils.ts`
  - `src/lib/supabase-server.ts`
  - `.env.example` / README / docker compose
  - 相关边界测试
- 影响接口：
  - 新增后端代理接口：`/api/auth`、`/api/supabase/proxy`
- 影响数据结构：
  - 无数据库结构变更

### 3.2 实现方案

- 核心思路：
  - 用“同名薄适配器”替换浏览器 Supabase SDK，保留调用形态，底层转发到后端 API。
  - 后端用 `SUPABASE_URL + SUPABASE_ANON_KEY` 与用户 access token 执行真实查询。
- 关键流程：
  - 登录/注册/登出/用户更新：前端调用 `/api/auth`，服务端签发与更新 `sb-access-token`/`sb-refresh-token`。
  - `supabase.from(...).xxx`：前端记录链式调用，再统一提交到 `/api/supabase/proxy` 执行。
  - 路由鉴权：`getAuthContext` 优先读 Bearer，再读 `sb-access-token` cookie。
- 兼容策略：
  - `@/lib/supabase` 暴露形态与常用返回结构保持兼容（`{ data, error }`）。
  - 服务端环境变量读取对 `NEXT_PUBLIC_*` 保留回退以兼容旧环境（文档主推 `SUPABASE_*`）。

### 3.3 数据库与迁移（如适用）

- 是否需要 migration：否
- 涉及对象（表/字段/索引/约束）：无
- 回填策略：无
- RLS/权限影响：
  - 仍由 Supabase RLS 控制；后端代理不引入 bypass。

## 4. 验收标准

- 功能验收：
  - 前端不再直接创建 Supabase Browser Client。
  - 主要页面登录态、用户接口调用可正常工作。
  - `SUPABASE_SYSTEM_ADMIN_ACCESS_TOKEN` 不再被运行时读取。
- 接口验收：
  - 业务接口继续可用，新增代理接口返回稳定 JSON 结构。
- 性能/稳定性验收：
  - 代理层错误可观测（统一错误返回与日志）。
- 回归范围：
  - `src/tests/supabase-server-auth.test.ts`
  - 新增 auth/proxy 边界测试
  - 受影响路由回归（社区/聊天/命盘等最小集）

## 5. 测试计划

- 单元测试：
  - 检查 `src/lib/supabase.ts` 不再依赖 Browser Client / `NEXT_PUBLIC_*`。
  - 检查 `src/lib/supabase-server.ts` 不再读取 `SUPABASE_SYSTEM_ADMIN_ACCESS_TOKEN`。
- 集成/路由测试：
  - `/api/auth` 登录、获取会话、登出路径。
  - `/api/supabase/proxy` 基础查询与鉴权失败路径。
- 手动验证步骤：
  - 登录 -> 访问需登录页面 -> 登出 -> 验证权限收敛。

## 6. 风险与回滚

- 失败信号：
  - 前端大面积 401（cookie 或 token 透传异常）。
  - 链式查询行为不兼容导致页面报错。
- 风险等级：高
- 回滚步骤：
  - 回退 `src/lib/supabase.ts` 到 Browser Client 实现。
  - 停用新增代理路由，恢复旧环境变量使用方式。

## 7. 里程碑与任务拆分

- M1：边界测试先行（红灯）。
- M2：实现 `/api/auth` 与 cookie 会话。
- M3：实现 `/api/supabase/proxy` 与 `src/lib/supabase.ts` 代理化。
- M4：清理 `SUPABASE_SYSTEM_ADMIN_ACCESS_TOKEN` 与文档/环境变量。

## 8. 关联信息

- 相关 issue：无
- 相关 PR：本次改造提交
- 关联文档：
  - `docs/specs/README.md`
  - `docs/specs/templates/spec-full.md`
