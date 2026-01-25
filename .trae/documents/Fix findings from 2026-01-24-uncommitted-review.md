## 目标
- 按 [2026-01-24-uncommitted-review.json](file:///Users/hhs/Develop/Project/MingAI/docs/review/log/2026-01-24-uncommitted-review.json) 修复 6 个问题（2 个 P1、3 个 P2、1 个 P3）。

## 修复项（按优先级）
1. **Bearer-only 知识库搜索失效（P1）**
   - 修改 [src/app/api/knowledge-base/search/route.ts](file:///Users/hhs/Develop/Project/MingAI/src/app/api/knowledge-base/search/route.ts)：在调用 `searchKnowledge()` 时把 `Authorization` 里的 token 作为 `accessToken` 透传进去（`searchKnowledge(body.query, { ..., accessToken: token })`），确保无 cookie 的客户端也能正确鉴权与会员分流。

2. **Pro 向量回填在 service-role 下因 `auth.uid()` 失败（P1）**
   - 新增/调整一条 SQL migration：新增 `batch_update_vectors_as_service(p_updates, p_expected_dim, p_force_overwrite, p_user_id)`（`SECURITY DEFINER`），仅授予 `service_role` 执行权限；函数内部用 `p_user_id` 做 ownership 校验（通过 `knowledge_entries -> knowledge_bases` 关联）并更新向量/metadata。
   - 修改 [src/lib/knowledge-base/ingest.ts](file:///Users/hhs/Develop/Project/MingAI/src/lib/knowledge-base/ingest.ts)：`backfillVectorsAsService()` 改为调用新 RPC，并传入 `userId`，避免依赖 `auth.uid()`。

3. **重导入时残留旧分片（P2）**
   - 修改 [src/lib/knowledge-base/ingest.ts](file:///Users/hhs/Develop/Project/MingAI/src/lib/knowledge-base/ingest.ts)：在 `upsertEntries()` / `upsertEntriesAsService()` 执行 upsert 前，先删除同一 `kb_id + source_type + source_id` 下 `chunk_index >= 新chunks数量` 的旧记录，确保不会遗留过期 chunk。

4. **records 分页参数导致可触发 500（P2）**
   - 修改 [src/app/api/records/route.ts](file:///Users/hhs/Develop/Project/MingAI/src/app/api/records/route.ts)：对 `page/pageSize` 做边界与 NaN 校验（例如：`page>=1`，`1<=pageSize<=100`），无效值返回 400 或回退默认值，避免 `.range()` 传入非法范围引发 500。

5. **records 搜索词导致 PostgREST filter 解析错误（P2）**
   - 修改 [src/app/api/records/route.ts](file:///Users/hhs/Develop/Project/MingAI/src/app/api/records/route.ts)：构造 `.or()` 时对 value 做 PostgREST 兼容的引用（将 `"%${search}%"` 作为 ilike 的 value，并转义 `\`/`"`），确保包含逗号等字符时不会破坏 OR 语法。

6. **移除侧边栏调试日志（P3）**
   - 修改 [src/components/chat/ConversationSidebar.tsx](file:///Users/hhs/Develop/Project/MingAI/src/components/chat/ConversationSidebar.tsx)：删除 `console.log('toggle clicked', isOpen)`。

## 验证
- 运行 `pnpm lint`、`pnpm test`。
- 重点手测：
  - 仅带 `Authorization: Bearer ...`（无 cookie）调用 `/api/knowledge-base/search`。
  - Pro 用户 ingest 后向量回填与 index 触发不再静默失败。
  - `/api/records?page=abc&pageSize=-1` 返回 400 或回退默认，不再 500；`search=a,b` 不再导致 500。

## 交付物
- 代码修复 + 新增/更新 migration。
- 修复后再更新一次审查日志（可选：在同一个 review JSON 里追加“已修复”备注）。