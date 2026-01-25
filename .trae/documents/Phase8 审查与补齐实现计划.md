## 审查结论（按“计划→现状”）
- 知识库核心（表/函数/Edge Function/入库 conversation+record/检索/数据源 registry/@ 提及/PromptBuilder/来源 sources）整体已落地。
- 当前明确未闭环/疑似遗漏主要集中在「文件入库」「归档状态可视化」「AI 设置页的实时预览」「发送前注入内容摘要」「测试交付物」。

## 需要补齐的点（P0→P2）
1) **知识库文件入库缺失（P0）**
- 证据：[ingestFile](file:///Users/hhs/Develop/Project/MingAI/src/lib/knowledge-base/ingest.ts#L140-L142) 直接抛错 `File ingest not implemented`。
- 决策：
  - A. 按计划继续保持“暂不支持”，但要保证 UI/API 不会走到该入口，并给出更明确的错误与产品提示；或
  - B. 真正实现文件上传→解析→分块→embedding→upsert（需要明确支持的格式与解析依赖）。

2) **归档状态未在列表 UI 展示（P0）**
- 证据：对话数据已提供 `isArchived/archivedKbIds`（[conversation.ts](file:///Users/hhs/Develop/Project/MingAI/src/lib/conversation.ts#L54-L114)），但侧边栏未渲染（[ConversationSidebar.tsx](file:///Users/hhs/Develop/Project/MingAI/src/components/chat/ConversationSidebar.tsx#L147-L209)）。
- 记录列表页同样未出现归档相关展示（[records/page.tsx](file:///Users/hhs/Develop/Project/MingAI/src/app/records/page.tsx) 内无 archive/归档 字样）。

3) **AI 设置页缺少“实时预览 Prompt 层级/token”与路径不一致（P1）**
- 证据：当前页仅编辑并 upsert 三字段（[AISettingsPage](file:///Users/hhs/Develop/Project/MingAI/src/app/user/ai-settings/page.tsx#L1-L185)），没有调用 PromptBuilder 做预览；且计划路径为 `/user/settings/ai`，现为 `/user/ai-settings`。

4) **发送前“注入内容摘要（可展开）”缺失（P1）**
- 证据：目前仅在 badge 上 `title={mention.preview}`（[MentionBadge.tsx](file:///Users/hhs/Develop/Project/MingAI/src/components/chat/MentionBadge.tsx#L17-L34)），无汇总面板。

5) **计划列出的测试文件缺失（验收项）**
- 证据：`src/tests` 未包含 `knowledge-base/archived-sources/knowledge-search/data-sources/source-tracker` 等计划测试文件（见目录：[src/tests](file:///Users/hhs/Develop/Project/MingAI/src/tests)）。

## 代码层面的执行计划（用户确认后我会开始实施）
### Step 1：先核对“未提交改动”并对照计划做缺口清单
- 运行 `git status` / `git diff` / `git diff --name-only`（只读检查）并把改动文件按 Phase8 模块归类，确保没有遗漏的 WIP。

### Step 2：补齐归档状态 UI（对话侧边栏 + 记录列表）
- 在对话侧边栏对 `conv.isArchived` 显示显式标识（例如 `Archived` pill/图标），并在 hover 里展示归档到哪些 KB（`archivedKbIds`）。
- 在记录列表卡片上展示“已加入/已归档知识库”的状态（数据侧需要确认 records API 返回是否携带归档字段；若缺，补齐 API 或前端查询）。

### Step 3：AI 设置页加入实时预览（Prompt layers + token 预算）
- 新增一个服务端预览 API（例如 `/api/user/ai-settings/preview`）：输入当前设置与一个示例 user message，调用现有 PromptBuilder 输出 layers/token 用量与截断信息。
- 在 [AISettingsPage](file:///Users/hhs/Develop/Project/MingAI/src/app/user/ai-settings/page.tsx) 增加“预览”区域：显示 layers 列表与 token 统计；JSON 无效时禁用预览。
- 处理路径不一致：增加从 `/user/settings/ai` 到现页面的路由兼容或调整链接。

### Step 4：发送前注入内容摘要面板
- 在 ChatComposer 中为 mentions 增加一个可展开的“将注入 AI 的内容”面板：按 mention 分组展示 `name + preview`（或截断后的 formatForAI 摘要），并提供单条展开。

### Step 5：补齐关键测试（至少覆盖 P0/P1 核心）
- 增加 `data-sources` registry 与 provider get/format/summarize 的单测。
- 增加 `knowledge-base search` 与 `archive status` 相关逻辑的单测（针对 view 返回字段映射与 prompt 注入策略）。
- 增加 `source-tracker / sources metadata` 的单测（确保 sources 只包含实际注入内容）。

### Step 6：回归验证
- `pnpm test`、`pnpm lint`、关键页面/聊天流手动回归（@d/@k、sources 展示、归档标识、AI 设置预览）。

## 输出物
- 缺口清单（逐条对照 Phase8 文档）
- 对应实现的代码改动
- 通过的测试与回归点说明