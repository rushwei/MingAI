# 历史收口与删除语义统一

## 背景

- 现状：
  - 奇门、六壬历史页仍走各自的专用接口，未复用共享 `history-summaries` 契约。
  - 历史列表与聊天会话列表都被 50 条硬上限截断，旧数据不可达。
  - 聊天侧直接删除 `conversations` 会被各业务表的 `conversation_id` 外键拦截。
  - `supabase/tabel_export_from_supabase.sql` 未包含 `qimen_charts`、`daliuren_divinations`，与真实 schema 漂移。
- 触发点：
  - 深度架构审查发现历史恢复、删除副作用与 schema 单一真相已再次分叉。

## 目标与非目标

- 目标：
  - 奇门、六壬历史页统一走共享历史 API / client。
  - 历史列表与聊天会话列表支持自动翻页聚合，不再被 50 条静态上限截断。
  - 聊天侧删除会话前先解除各历史表的 `conversation_id` 关联，避免 FK 删除失败。
  - 历史侧删除记录继续删除其关联会话，保持“删历史 = 删整条分析记录”的既有语义。
  - 更新 schema 快照，使其与实际 Supabase schema 对齐。
- 非目标：
  - 不改动奇门/六壬排盘与 AI 解读业务逻辑。
  - 不引入新的数据库表、核心目录或新的前端交互模式。

## 方案

- 影响模块：
  - `src/lib/history/*`
  - `src/app/qimen/history/page.tsx`
  - `src/app/daliuren/history/page.tsx`
  - `src/lib/chat/conversation.ts`
  - `src/app/api/conversations/route.ts`
  - `src/app/api/conversations/[id]/route.ts`
  - `src/app/api/qimen/route.ts`
  - `src/app/api/daliuren/route.ts`
  - `supabase/tabel_export_from_supabase.sql`
- 实现要点：
  - 共享历史 API 增加分页元数据；完整历史页通过 client 自动翻页拉全量，抽屉继续只取前 10 条。
  - 聊天会话列表 API 增加分页元数据；客户端聚合分页结果，维持现有 UI。
  - 新增服务端会话解绑 helper，在删除 conversation 前统一将各历史表中的 `conversation_id` 置空。
  - 奇门、六壬历史页改用 `loadHistorySummaries/loadHistoryRestore/deleteHistorySummary`。
  - 奇门、六壬路由移除不再使用的专用历史 GET/DELETE 分支。
  - schema 快照补齐 `qimen_charts` 与 `daliuren_divinations` 定义。
- 兼容性说明：
  - 聊天侧删除 AI 分析会话后，原始历史记录仍保留，但不再关联该会话。
  - 从历史页删除记录时，仍会删除其关联会话，行为与现有共享历史页保持一致。

## 验收

- 功能验收：
  - 奇门、六壬历史页可通过共享历史 API 正常浏览、恢复、删除。
  - 聊天会话删除不再因 FK 失败回滚。
  - 历史页和聊天侧边栏可访问超过 50 条的旧数据。
  - schema 快照包含 `qimen_charts`、`daliuren_divinations`。
- 测试范围：
  - 历史分页 client / route
  - 会话分页 client
  - 会话删除解绑 helper
  - 奇门/六壬历史页共享历史收口
  - schema 快照对齐

## 风险与回滚

- 风险：
  - 自动翻页聚合会增加历史页和聊天页初次加载请求数。
  - 会话解绑如果漏表，会继续出现部分来源删除失败。
- 回滚步骤：
  - 回退本次提交，恢复原分页与删除逻辑。
  - 若需要，仅保留 schema 快照更新，不回退业务代码。
