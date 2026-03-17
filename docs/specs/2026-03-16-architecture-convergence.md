# 架构收口整改（Full Spec）

## 1. 背景与问题

- 当前现状：
  - 浏览器侧仍通过 `@/lib/supabase` 持有一套自定义 Supabase Query Proxy，并通过 `/api/supabase/proxy` 执行数据读写。
  - 认证、数据库访问、缓存失效和 feature API 边界没有完全收口，导致浏览器层与服务端层都在维护数据库访问协议。
  - 聊天域的页面层、API 路由和会话访问层职责过重，存在重复的认证、会话、积分和上下文装配逻辑。
  - `data-sources` 继续依赖 side-effect 初始化和手写联合类型，扩展与维护成本偏高。
  - `mcp-core` 的工具定义、调用分发和 Markdown 格式化分散在多个文件维护，最近已出现工具名回归。
  - `source_type`、`source_data`、history metadata、data-source 类型、年度统计口径分别在数据库、TS 类型、UI registry 和 API 路由中重复维护，已经出现 `qimen/daliuren` 等来源写入与读取不一致。
  - `conversation_messages` 已引入，但 `conversations.messages` 仍在被运行时读写，形成双写双读和静默回退。
  - `user_settings` / `profile` / feature toggles / payment pause 在浏览器端存在多套直查库、缓存和失效路径，`ClientProviders` 还通过 monkey-patch `window.fetch` 做全局失效广播。
  - `/api/chat/preview` 与正式聊天链路重复实现提示词上下文装配逻辑，存在行为漂移风险。
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
 - 建立 conversation/history/source-data 的单一注册表，统一数据库、TS 类型、UI 展示和统计映射。
 - 将 `conversation_messages` 作为运行时唯一消息真相，停止 Web 层对 `conversations.messages` 的依赖。
 - 建立统一的 `user settings` API/loader，移除浏览器对 `user_settings` 的直接查库。
 - 移除 `ClientProviders` 对 `window.fetch` 的 monkey-patch，改为显式的客户端资源失效协议。
 - 让 `/api/chat/preview` 复用正式聊天的 prompt-context 组装逻辑。
 - 降低根脚本对 `packages/mcp-core build` 的硬耦合，避免 Web 被 MCP 非相关错误阻塞。

### 2.2 非目标

- 不新增核心业务主表或重做既有 RLS 策略；仅允许做约束对齐和已有函数/视图的收口。
- 不重做现有命理算法或重设计页面视觉。
- 不在本次引入新的第三方状态管理或 AI SDK 框架。
- 不把所有客户端缓存体系一次性替换成新的重型查询框架。

## 3. 方案设计

### 3.1 变更范围

- 影响模块：
  - `src/lib/auth.ts`
  - `src/lib/supabase.ts`（降级为兼容导出，不再承载 query proxy）
  - `src/app/api/conversations/*`
  - `src/app/api/chat/route.ts`
  - `src/app/api/chat/preview/route.ts`
  - `src/app/api/history-summaries/route.ts`
  - `src/app/api/user/*`
  - `src/lib/chat/conversation.ts` 与相关 chat 子模块
  - `src/lib/history/*`
  - `src/lib/user/*`
  - `src/lib/data-sources/*`
  - `packages/mcp-core/src/*`
  - `packages/mcp-server/src/*`
  - `packages/mcp-local/src/*`
  - 所有浏览器侧直接导入 `@/lib/supabase` 的调用点
- 影响接口：
  - 新增 `/api/user/settings`
  - 扩展 `/api/history-summaries`
  - `@mingai/mcp-core` package root 导出保持兼容，但内部驱动方式改变
- 影响数据结构：
  - `archived_sources.source_type` 约束扩展为覆盖当前支持的数据源类型
  - `conversations.source_type` 新增显式约束
  - `replace_conversation_messages` 迁移到仅维护 `conversation_messages`

### 3.2 实现方案

- 核心思路：
  - 彻底删除旧 Query Proxy，先完成调用点迁移再移除 `/api/supabase/proxy`；`src/lib/supabase.ts` 仅保留兼容导出，不再承载数据库协议。
  - 用“单一真源”替代重复 switch / side-effect register / 隐式代理协议。
  - 将 source/history/settings 三类重复 registry 收口成显式共享模块，由 route、client mapper 和 UI 共用。
- 关键流程：
  - 浏览器认证统一由 `auth.ts` 调 `/api/auth`，所有 `supabase.auth.*` 调用迁移到单一入口。
  - 浏览器数据操作改走现有 feature API；缺失的 settings/history API 本轮补齐。
  - chat 域优先抽出 conversations 持久化与会话读取，页面层不再直接查库；route 完整拆分留在下一轮继续收口。
  - `conversation_messages` 成为唯一读写路径；`conversations.messages` 仅作为历史迁移残留字段，不再被应用运行时依赖。
  - `data-sources` 与 `conversations.source_type/history` 通过共享 registry 对齐。
  - `mcp-core` 新增 transport adapter，`mcp-server` / `mcp-local` 共享同一套 tools 列表和 tool call 响应拼装。
- 兼容策略（向前/向后兼容）：
  - 浏览器对外业务行为保持一致，内部不保留旧 query proxy。
  - `src/lib/supabase.ts` 保留为兼容导出，供旧测试和少量遗留 require 使用，但不允许继续承载 `.from/.rpc`。
  - conversations 与 chat 的已有 URL、页面交互、流式结构保持兼容。
  - `@mingai/mcp-core` 对外仍导出 `tools` / `handleToolCall` / `formatAsMarkdown`。
  - 历史页和抽屉的恢复行为保持一致，但统一复用共享 registry / payload builder。

### 3.2.1 本轮已落地范围（2026-03-16）

- `src/app/api/chat/route.ts` 已收口为薄路由，复用 `src/lib/server/chat/request.ts` 与 `src/lib/server/chat/stream-response.ts`，不再在 route 内重复维护鉴权、会员、积分、提示词装配和首字扣费逻辑。
- `src/app/chat/page.tsx` 已切到 `src/lib/chat/use-chat-bootstrap.ts`，页面不再单独拉取会员信息、profile bundle 和 prompt knowledge bases。
- `src/lib/user/settings.ts` 已成为浏览器侧唯一 settings contract，统一承载 snapshot normalize、PATCH payload 构造和显式失效事件；`/api/user/settings` 与 `/api/user/profile` 已复用同一套 settings loader。
- `src/app/user/ai-settings/page.tsx`、`src/app/user/knowledge-base/page.tsx`、`src/components/layout/SidebarConfigContext.tsx` 已迁到 `/api/user/settings`，浏览器层不再直接查询或 upsert `user_settings`。
- `src/lib/history/registry.ts` 已成为通用 history registry，`src/app/api/history-summaries/route.ts` 与 `src/components/layout/HistoryDrawer.tsx` 已改为共享摘要/恢复 payload builder，不再在抽屉里重复维护各来源的 restore 逻辑。
- `src/lib/history/client.ts` 已补齐浏览器侧统一 restore/delete/conversationId 解析 helper，`tarot/liuyao/hepan/face/palm` 的 history/result 页面已改为复用共享 history + conversation-analysis 边界，不再在浏览器里直接查询 `*_readings/*_charts/conversations`。
- `src/app/api/chat/preview/route.ts` 已下沉为薄路由，提示词预览装配迁入 `src/lib/chat/preview-context.ts`；默认路径直接复用 `src/lib/server/chat/prompt-context.ts`，设置页临时覆盖场景也统一经过同一预览 helper。
- `src/components/providers/ClientProviders.tsx` 已移除对 `window.fetch` 的 monkey-patch；`src/lib/hooks/useFeatureToggles.ts` 与 `src/lib/hooks/usePaymentPause.ts` 改为基于前台可见性/焦点的轻量刷新策略，失败时不再通过空对象隐式 fail-open。
- `src/lib/knowledge-base/search.ts` 已补齐 `KB_WEIGHT_CACHE_MAX`、`pruneKbWeightCache` 和失败日志，避免缓存无限增长并提升失败可观测性。
- `src/lib/supabase-server.ts` 与 `packages/mcp-server/src/supabase.ts` 已按 `NODE_ENV === 'production'` 明确区分“生产强制 system admin session”与“开发环境允许回退”。
- `src/lib/user/membership.ts` 已收回为浏览器只读 membership contract，移除未使用且越权的直写 `users/orders` helper；会员购买、充值、订单读取统一走现有 `/api/membership/*` 与 `/api/orders` 边界。
- `packages/mcp-core/src/tool-registry.ts`、`packages/mcp-core/src/tool-output.ts`、`packages/mcp-server/src/index.ts`、`packages/mcp-local/src/index.ts` 已收口到单一 tool registry + render policy，canonical tool names 与 `structuredContent + content` 契约统一。
- `package.json` 根脚本已去掉对 `pnpm -C packages/mcp-core build` 的强依赖，MCP 包构建改为显式脚本；`packages/mcp-core/tests/*` 改为直接绑定 `src` 的 TypeScript 源码，`packages/mcp-core/src` 中误提交的编译 JavaScript 产物已清理。

### 3.3 数据库与迁移（如适用）

- 是否需要 migration：
  - 是
- 涉及对象（表/字段/索引/约束）：
  - `archived_sources.source_type`
  - `conversations.source_type`
  - `replace_conversation_messages(uuid, jsonb)`
- 回填策略：
  - 对 `conversations.source_type` 中不在支持集合内的历史值先归一到 `chat`，再加约束。
  - 继续保留历史 `conversations.messages` 数据，但通过现有 backfill/migration 保证 `conversation_messages` 完整。
- RLS/权限影响：
  - 无新增权限模型，仅调整函数实现与应用调用路径

## 4. 验收标准

- 功能验收：
  - 浏览器应用代码不再新增 `@/lib/supabase` 或 `supabase.from/rpc` 调用。
  - `source_type/history/source_data` 的支持集合由共享 registry 派生，`qimen/daliuren` 不再在任一读路径被降级为 `chat`。
  - chat 页面通过 `/api/conversations` + `conversation_messages` 完成会话持久化与读取，不再依赖 `conversations.messages` 回退。
  - `HistoryDrawer` 和 `/api/history-summaries` 共用同一套 history registry。
  - 浏览器侧 `user_settings` 通过 `/api/user/settings` 访问，不再直接查表。
  - `ClientProviders` 不再 monkey-patch `window.fetch`。
  - `data-sources` 新增类型只需修改一个 registry 文件即可生效。
  - `mcp-core` 新增或重命名工具时不再需要同步修改多份 switch。
- 接口验收：
  - `/api/conversations`、`/api/conversations/[id]` 覆盖会话列表、详情、创建、更新、删除。
  - `/api/user/settings` 覆盖浏览器侧所需的 user_settings 读取与更新。
  - `/api/history-summaries` 支持当前通用历史抽屉覆盖的类型和会话恢复信息。
  - `@mingai/mcp-core` 的既有公开导出和当前 canonical tool names 保持可用。
- 性能/稳定性验收：
  - `pnpm lint`、定向 `node --test`、`pnpm build`、`pnpm -C packages/mcp-core build` 全部通过。
  - 不新增因认证同步失败导致的首屏登录态闪烁或 chat 流式回归。
- 回归范围：
  - auth
  - chat / conversations
  - records / community / divination history
  - data-sources
  - mcp-core tools surface

## 5. 测试计划

- 单元测试：
  - 新增 source/history/settings/conversation-messages 的跨模块契约测试。
  - 新增 `mcp-core` transport adapter / version metadata 测试。
- 集成/路由测试：
  - `/api/conversations` 成功/失败/权限边界。
  - `/api/user/settings` 成功/失败/权限边界。
  - `/api/history-summaries` 摘要与恢复 payload。
  - `/api/chat` 认证、积分、stream、上下文装配回归。
  - `/api/chat/preview` 与正式 prompt-context 的共享装配回归。
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
  当前状态：已完成 conversations API 收口、browser auth 单入口、user settings/profile bundle 收口与 HistoryDrawer/history route 的共享 registry；少量浏览器直查库残留仍在责任范围外继续清理。
- M3：chat route/page 拆分与 data-sources manifest 化
  当前状态：chat route/page 收口已完成；chat preview 已切到共享 prompt-context helper；conversation_messages 的最终只读切换仍依赖 conversations API 与 server-only 读路径继续收口。
- M4：mcp-core registry 化与全量验证
  当前状态：已完成 registry + tool-output 收口，并同步到 `mcp-server` / `mcp-local`。

## 8. 关联信息

- 相关 issue：
  - 架构 review 中的 Supabase、chat、data-source、MCP 分层问题
- 相关 PR：
  - 待提交
- 关联文档：
  - `docs/specs/2026-02-12-frontend-supabase-via-backend-api.md`
  - `docs/specs/2026-02-11-remove-service-role-key-phase2.md`
