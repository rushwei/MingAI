# Chat 知识库屏蔽与用户初始化修复

## 背景

- 现状：
  - 免费会员在聊天输入区仍可能看到“已参考”知识库标签，AI 回复元数据也可能继续标记 `kbSearchEnabled`，导致出现“未命中知识库”等误导性提示。
  - 即使管理员关闭了 `knowledge-base` 功能，个性化设置页和聊天上下文链路仍可能继续显示知识库 UI 或暴露知识库启用状态。
  - 用户页初始化时 `ensureUserRecord()` 仅依赖 cookie，会在浏览器会话尚未同步完成时向 `/api/user/profile` 发出未鉴权请求，并在控制台打印 `请先登录`。
- 触发点：
  - 合并后聊天 bootstrap、preview、metadata 与前端展示链路的会员 gating 没有完全对齐。
  - 用户页在已有 session 但 cookie 未稳定的时间窗内触发资料 ensure。

## 目标与非目标

- 目标：
  - 恢复免费会员不展示知识库已参考块、不暴露知识库可用元数据的既有契约。
  - 管理员关闭 `knowledge-base` 功能时，聊天与个性化设置相关知识库 UI、bootstrap、preview、metadata 一并隐藏。
  - 在用户页/资料页初始化时使用现成 access token 完成 `ensureUserRecord()`，消除初始化阶段的伪未登录错误。
- 非目标：
  - 不改会员体系、不新增知识库权限规则。
  - 不重构 chat route 结构，不改动知识库检索排序逻辑。

## 方案

- 影响模块：
  - `src/lib/auth.ts`
  - `src/app/user/page.tsx`
  - `src/app/user/profile/page.tsx`
  - `src/lib/server/chat/bootstrap.ts`
  - `src/components/chat/ChatComposer.tsx`
  - `src/app/api/chat/preview/route.ts`
  - `src/app/api/chat/route.ts`
  - `src/lib/server/chat/prompt-context.ts`
- 实现要点：
  - `ensureUserRecord()` 支持可选 bearer token，并在用户页/资料页用当前 session token 调用。
  - chat bootstrap 对 `free` 会员或 `knowledge-base` 功能关闭时直接返回空的 `promptKnowledgeBaseIds/promptKnowledgeBases`。
  - chat composer 仅在 `canUseKnowledgeBase` 为真时展示知识库“已参考”标签。
  - 个性化设置页在 `knowledge-base` 功能关闭时隐藏知识库入口卡片和“生效的知识库”预览块。
  - chat route、preview route、prompt-context 统一以“功能开关开启 + 会员非 free”作为知识库 metadata/preview 暴露条件。
- 兼容性说明：
  - Plus/Pro 的知识库行为保持不变。
  - 免费会员仅收紧误暴露信息，不影响已有设置持久化。

## 验收

- 功能验收：
  - 免费会员聊天页不显示知识库已参考标签，也不再出现免费态的知识库命中/未命中提示。
  - 管理员关闭 `knowledge-base` 后，个性化页与聊天链路均不再显示知识库相关 UI/状态。
  - 用户页初始化不再因为 `ensureUserRecord()` 缺少鉴权头而刷出 `请先登录` 控制台错误。
- 测试范围：
  - `src/tests/auth-profile-contract.test.ts`
  - `src/tests/chat-bootstrap-route.test.ts`
  - `src/tests/chat-knowledge-base-gating-architecture.test.ts`
  - `src/tests/chat-prompt-context-search-options.test.ts`

## 风险与回滚

- 风险：
  - 若后续页面仍有独立知识库展示逻辑未走统一 gating，可能继续出现免费态暴露。
  - `ensureUserRecord()` 调用方若未传 token，仍依赖既有 cookie 行为。
- 回滚步骤：
  - 回退本次涉及的 `auth`、chat bootstrap、chat preview、chat metadata、composer 相关改动。
  - 重新运行上述回归测试确认恢复到回滚前状态。
