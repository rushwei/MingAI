# 架构收口与高优先级回归修复

## 1. 背景与问题

- 当前现状：
  - 浏览器认证入口已经收口到 `src/lib/auth.ts`，但业务页面仍大量直接调用 `supabase.from/rpc`。
  - 社区匿名层依赖各路由手工删除 `user_id`，并且存在通过接口回传作者 ID 的问题。
  - `/api/user/profile` 的真实响应形态与浏览器侧 `requestJson` 假设不一致，导致 profile/settings 读取失效。
  - `conversations` 仍以 `messages jsonb` 持久化消息，前端分页实际是全量读取后切片。
  - AI 分析结果在 `conversations` 与 feature tables 间手工双写，缺少统一事务边界。
  - `mcp-core` 的工具 schema、分发和 formatter 仍未真正做到单一真源。
- 触发原因：
  - 架构收口处于半完成状态，旧调用和新抽象并存。
  - 特权客户端被大量直接使用，权限控制散落在 handler 内。
  - 多个模块在“先修功能再收敛结构”的过程中引入重复和漂移。
- 主要痛点：
  - 浏览器运行时容易出现 `supabase.from is not a function` 之类的断裂。
  - 社区匿名性依赖路由自觉，存在身份泄露风险。
  - 用户资料、聊天会话和 AI 历史的持久化边界不稳定，回归风险高。

## 2. 目标与非目标

### 2.1 目标

- 恢复浏览器侧认证/查询边界的稳定性，避免运行时断裂。
- 统一浏览器消费的 JSON API 契约，修复 profile/settings 读取。
- 修复社区匿名身份泄露问题，统一由服务端计算 ownership。
- 将会话消息迁移为真实分页模型，并收口 AI 分析双写。
- 让 `mcp-core` 的工具目录成为 schema、handler、formatter 的唯一真源。

### 2.2 非目标

- 不重做现有 AI 文案、命理算法结果或页面视觉设计。
- 不在本轮重构中一次性消灭全部浏览器 Supabase 使用点，但要建立稳定过渡边界并迁走高风险路径。
- 不修改 MCP 对外 canonical tool names。

## 3. 方案设计

### 3.1 变更范围

- 影响模块：
  - `src/lib/auth.ts`、新增浏览器查询客户端模块、社区 client/API、聊天会话访问层、AI 分析持久化层。
  - `src/app/api/community/*`、`src/app/api/user/profile/route.ts`、`src/app/api/conversations/*` 及相关 feature APIs。
  - `packages/mcp-core/src/*`、`packages/mcp-server/src/index.ts`。
- 影响接口：
  - `/api/user/profile`
  - `/api/community/posts/[id]`
  - `/api/community/comments/[id]`
  - `/api/conversations/[id]`
  - 新增消息分页与 ownership viewer 字段
- 影响数据结构：
  - 新增 `conversation_messages` 表
  - 新增或调整用于 AI 分析写入的事务函数 / migration

### 3.2 实现方案

- 核心思路：
  - 先止血修回归和安全边界，再逐步把高风险模块切到稳定架构。
- 关键流程：
  - 浏览器查询临时从 `auth.ts` 分离到独立 `browser-supabase`，并迁走仍直接查库的高风险调用。
  - 浏览器 JSON API 统一使用 `{ data } / { error }` envelope，profile 相关 helper 改为按真实协议读取。
  - 社区详情和评论 ownership 在服务端生成 `viewer` 信息，不再暴露作者 ID。
  - AI 分析持久化经共享服务层统一落库；会话消息改为单独表并提供服务端分页。
  - `mcp-core` 建立单一 tool catalog，统一驱动 tools、dispatch、formatter、structured output。
- 兼容策略（向前/向后兼容）：
  - 浏览器侧保留受控过渡查询客户端，避免一次性切断旧页面。
  - `conversations.messages` 在迁移期保留只读 fallback，待新消息表接管后移除。

### 3.3 数据库与迁移（如适用）

- 是否需要 migration：
  - 是
- 涉及对象（表/字段/索引/约束）：
  - 新增 `conversation_messages`
  - 新增 AI 分析持久化相关事务函数 / RPC
  - 视迁移进度调整 `conversations.messages`
- 回填策略：
  - 从旧 `conversations.messages` 回填到 `conversation_messages`
  - 对 feature tables 的 `conversation_id` 关联保持兼容
- RLS/权限影响：
  - `conversation_messages` 需沿用用户自有会话的访问边界
  - 普通用户路由默认用用户态客户端；特权客户端仅保留在受控服务层

## 4. 验收标准

- 功能验收：
  - 浏览器侧不再出现 `supabase.from is not a function`
  - 用户资料、设置和匿名名可稳定读取/更新
  - 社区公共接口不再泄露原始作者 ID
  - 聊天消息能真实分页，长会话不会全量拉取
  - AI 分析历史落库不再出现 conversation 与 source row 失配
  - `mcp-core` 新增/修改工具时只需改单一目录
- 接口验收：
  - 浏览器消费的 JSON API 统一为 envelope
  - 社区接口返回 viewer ownership 字段而非作者 ID
  - 会话详情接口支持真实消息分页参数
- 性能/稳定性验收：
  - 关键页面和聊天页不再依赖全量会话消息读取
  - 普通 API 路由不再广泛直接使用系统管理员客户端
- 回归范围：
  - auth/profile
  - community
  - chat/conversations
  - AI analysis persistence
  - `mcp-core` tool surface

## 5. 测试计划

- 单元测试：
  - profile bundle 解析
  - community ownership client helper
  - tool catalog 与 formatter/dispatch 一致性
- 集成/路由测试：
  - 社区帖子/评论匿名性
  - `/api/user/profile`
  - conversations 消息分页
  - AI 分析持久化事务
- 手动验证步骤：
  - 登录后进入用户页、资料页、社区详情页检查资料与匿名名恢复
  - 发送长对话并验证消息分页
  - 打开奇门/塔罗/六爻历史记录检查 conversation 关联恢复

## 6. 风险与回滚

- 失败信号：
  - 浏览器页面继续出现 Supabase 查询入口断裂
  - 社区详情页 ownership 判断错误
  - 会话历史加载不完整或消息顺序异常
  - MCP structured content 丢失
- 风险等级：
  - 高
- 回滚步骤：
  - 按阶段提交拆分回滚
  - 优先回滚消息模型迁移与 AI 持久化收口层

## 7. 里程碑与任务拆分

- M1：修复 profile/community/browser Supabase 高优先级回归
- M2：收口聊天/会话/AI 分析持久化
- M3：完成 `mcp-core` 单一目录重构和架构保护测试

## 8. 关联信息

- 相关 issue：
  - code review 提到的 auth/community/profile/browser client regressions
  - 全项目架构审查中的权限边界、双写和会话模型问题
- 相关 PR：
  - 待提交
- 关联文档：
  - `docs/specs/2026-03-16-qimen-daliuren-regression-fixes.md`
