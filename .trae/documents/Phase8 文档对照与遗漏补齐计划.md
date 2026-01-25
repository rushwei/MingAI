## 审查结论
- Phase8 计划中的 P0/P1 主要交付（知识库、@ 提及、Data Sources、Prompt Builder、来源展示、向量索引辅助与相关 migrations/Edge Function）在代码库里基本都已落地。
- 目前能确定的“计划要求 vs 代码实现”不一致点主要集中在 **AI 设置页**：计划要求路径为 `/user/settings/ai` 且包含“实时预览”，而当前实现页面为 `/user/ai-settings`，并且未实现“Prompt 层级与 token 使用情况”的实时预览。
- 计划里标注的“文件上传入库（ingestFile）暂未实现”在代码中也保持为未实现（符合计划的 TODO）。

## 需要补齐/修正的点
1. **补齐路由路径（兼容计划验收）**
   - 新增 `src/app/user/settings/ai/page.tsx`：作为兼容入口，重定向到 `/user/ai-settings` 或直接复用现有页面组件。
   - 视情况统一站内跳转：让“设置”页按钮与其他入口优先指向 `/user/settings/ai`（保留旧路径兼容）。

2. **补齐 AI 设置页的“实时预览”**
   - 在现有 [ai-settings/page.tsx](file:///Users/hhs/Develop/Project/MingAI/src/app/user/ai-settings/page.tsx) 内新增一个预览面板：
     - 基于 `buildPersonalizedPrompt`（或等价逻辑）实时计算当前设置下的 Prompt 分层结果。
     - 展示每层：included、tokens、是否截断、总 token、预算。
     - 可选展示最终 prompt 预览（折叠/可复制）。

3. **对齐计划中的输入约束（可选但建议）**
   - “关于你”限 300 字、“自定义指令”限 500 字：在 UI 上做字符计数与限制（服务端已有 token/截断兜底）。
   - 为保持兼容：用户画像输入允许“纯文本或 JSON”；保存时如果能解析为 JSON 则存对象，否则存字符串，避免当前“JSON 校验失败不能保存”的硬性限制。

## 核对“未提交代码”的方式（退出计划模式后执行）
- 由于当前处于计划模式，我只能做静态对照；在确认开始执行后：
  - 检查工作区改动（git status/diff）以定位“未提交代码”范围。
  - 逐个对照 Phase8 文档的文件清单与实现路径，确认没有遗漏的路由/组件/迁移。

## 验证方式（执行阶段完成）
- 运行 `pnpm lint`、`pnpm test`，并本地启动后手动验证：
  - `/user/settings/ai` 可访问且行为正确（重定向/复用）。
  - AI 设置页实时预览随输入变更即时刷新。
  - chat 侧 metadata.sources 不受影响，正常展示来源。
