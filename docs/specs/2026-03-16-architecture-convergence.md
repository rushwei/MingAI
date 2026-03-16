# 架构收口整改（Full Spec）

## 1. 背景与问题

- 当前现状：
  - 浏览器侧仍通过 `@/lib/supabase` 持有一套自定义 Supabase Query Proxy，并通过 `/api/supabase/proxy` 执行数据读写。
  - 认证、数据库访问、缓存失效和 feature API 边界没有完全收口，导致浏览器层与服务端层都在维护数据库访问协议。
  - 聊天域的页面层、API 路由和会话访问层职责过重，存在重复的认证、会话、积分和上下文装配逻辑。
  - `data-sources` 继续依赖 side-effect 初始化和手写联合类型，扩展与维护成本偏高。
  - `mcp-core` 的工具定义、调用分发和 Markdown 格式化分散在多个文件维护，最近已出现工具名回归。
- 触发原因：
  - 历史上为降低迁移成本保留了薄适配层，但这些适配层已经演化成第二套运行协议。
  - 新功能持续叠加到 chat、records、knowledge-base、MCP 等核心域，没有同步完成边界收口。
- 主要痛点：
  - 浏览器和服务端都能“直接操作数据库语义”，结构不够优雅，变更面过大。
  - 工具契约、多数据源注册和聊天流程的单一真源缺失，导致重复实现与回归风险增大。
  - `getServiceRoleClient` 的语义已与实际实现不符，影响理解和后续治理。

## 2. 目标与非目标

### 2.1 目标

- 删除浏览器侧通用 Supabase Query Proxy，浏览器不再通过通用 Supabase adapter 做表查询或 RPC。
- 认证能力收敛到单一 `src/lib/auth.ts` 入口，业务数据访问统一走 feature-owned HTTP API。
- 将聊天域拆成薄页面 + 薄 route + 领域服务，新增正式的 conversations API，移除 chat 页面中的持久化细节。
- 将 `data-sources` 改成 manifest 驱动，删除 side-effect 初始化入口。
- 将 `mcp-core` 改成单一 tool registry 驱动 schema、dispatch 和 formatter。
- 将 `getServiceRoleClient` 全仓重命名为 `getSystemAdminClient`，消除误导性命名。

### 2.2 非目标

- 不修改数据库 schema、RLS 策略或业务对外 API 语义。
- 不重做现有命理算法或重设计页面视觉。
- 不在本次引入新的第三方状态管理或 AI SDK 框架。

## 3. 方案设计

### 3.1 变更范围

- 影响模块：
  - `src/lib/auth.ts`
  - `src/lib/supabase.ts`（降级为兼容导出，不再承载 query proxy）
  - `src/app/api/supabase/proxy/route.ts`
  - `src/app/api/conversations/*`
  - `src/app/api/chat/route.ts`
  - `src/lib/chat/conversation.ts` 与相关 chat 子模块
  - `src/lib/data-sources/*`
  - `packages/mcp-core/src/*`
  - 所有浏览器侧直接导入 `@/lib/supabase` 的调用点
- 影响接口：
  - 新增 `/api/conversations`、`/api/conversations/[id]`
  - 删除 `/api/supabase/proxy`
  - `@mingai/mcp-core` package root 导出保持兼容，但内部驱动方式改变
- 影响数据结构：
  - 无数据库结构变更

### 3.2 实现方案

- 核心思路：
  - 彻底删除旧 Query Proxy，先完成调用点迁移再移除 `/api/supabase/proxy`；`src/lib/supabase.ts` 仅保留兼容导出，不再承载数据库协议。
  - 用“单一真源”替代重复 switch / side-effect register / 隐式代理协议。
- 关键流程：
  - 浏览器认证统一由 `auth.ts` 调 `/api/auth`，所有 `supabase.auth.*` 调用迁移到单一入口。
  - 浏览器数据操作改走现有 feature API；缺失的 conversations API 本轮新增。
  - chat 域优先抽出 conversations 持久化与会话读取，页面层不再直接查库；route 完整拆分留在下一轮继续收口。
  - `data-sources` 用 manifest 同时导出 `DataSourceType`、loader registry 和 provider lookup。
  - `mcp-core` 新增 registry，`tools`、`handleToolCall`、`formatAsMarkdown` 全部从 registry 派生。
- 兼容策略（向前/向后兼容）：
  - 浏览器对外业务行为保持一致，内部不保留旧 query proxy。
  - `src/lib/supabase.ts` 保留为兼容导出，供旧测试和少量遗留 require 使用，但不允许继续承载 `.from/.rpc`。
  - conversations 与 chat 的已有 URL、页面交互、流式结构保持兼容。
  - `@mingai/mcp-core` 对外仍导出 `tools` / `handleToolCall` / `formatAsMarkdown`。

### 3.3 数据库与迁移（如适用）

- 是否需要 migration：
  - 否
- 涉及对象（表/字段/索引/约束）：
  - 无
- 回填策略：
  - 无
- RLS/权限影响：
  - 无新增权限模型，仅收口调用路径和命名

## 4. 验收标准

- 功能验收：
  - 浏览器应用代码不再新增 `@/lib/supabase` 或 `supabase.from/rpc` 调用。
  - `/api/supabase/proxy` 被删除，现有页面通过 feature API 仍能完成同等操作。
  - chat 页面通过 `/api/conversations` 完成会话持久化与读取，不再直接持有数据库访问细节。
  - `data-sources` 新增类型只需修改一个 registry 文件即可生效。
  - `mcp-core` 新增或重命名工具时不再需要同步修改多份 switch。
- 接口验收：
  - `/api/conversations`、`/api/conversations/[id]` 覆盖会话列表、详情、创建、更新、删除。
  - `@mingai/mcp-core` 的既有公开导出和当前 canonical tool names 保持可用。
- 性能/稳定性验收：
  - `pnpm lint`、`pnpm test`、`pnpm -C packages/mcp-core build` 全部通过。
  - 不新增因认证同步失败导致的首屏登录态闪烁或 chat 流式回归。
- 回归范围：
  - auth
  - chat / conversations
  - records / community / divination history
  - data-sources
  - mcp-core tools surface

## 5. 测试计划

- 单元测试：
  - 新增 architecture guard tests，阻止 `auth-client`、`getServiceRoleClient`、`data-sources/init`、`/api/supabase/proxy` 回流。
  - 新增 `mcp-core` registry 合规测试。
- 集成/路由测试：
  - `/api/conversations` 成功/失败/权限边界。
  - `/api/chat` 认证、积分、stream、上下文装配回归。
  - 现有 records、community、mcp-key、auth、history 相关测试更新为 HTTP 路径。
- 手动验证步骤：
  - 登录/登出/更新资料
  - chat 新建会话、选会话、发送、重试、刷新恢复
  - 记录、知识库、社区、历史页的读写与删除
  - MCP canonical tools 调用与 markdown 输出

## 6. 风险与回滚

- 失败信号：
  - 浏览器侧大量 401/403，或因会话同步问题出现未登录误判。
  - chat 页面和 conversations API 出现状态不同步或流式回归。
  - mcp-core tool 名称、schema 或 markdown 格式产生不一致。
- 风险等级：
  - 高
- 回滚步骤：
  - 回退本次重构提交，恢复旧边界。
  - 不单独保留 query proxy / 旧 registry 中间态。

## 7. 里程碑与任务拆分

- M1：Spec 与 architecture guard tests 落地
- M2：auth / conversations / browser data access 迁移并删除旧 proxy
- M3：chat route/page 拆分与 data-sources manifest 化
- M4：mcp-core registry 化与全量验证

## 8. 关联信息

- 相关 issue：
  - 架构 review 中的 Supabase、chat、data-source、MCP 分层问题
- 相关 PR：
  - 待提交
- 关联文档：
  - `docs/specs/2026-02-12-frontend-supabase-via-backend-api.md`
  - `docs/specs/2026-02-11-remove-service-role-key-phase2.md`
