# MingAI Phase 8 完成报告

**项目名称**: MingAI - AI智能命理平台  
**项目版本**: v2.1  
**完成日期**: 2026-01-29  
**状态**: ✅ 已完成

---

## 1. 📋 执行摘要 (Executive Summary)

Phase 8 聚焦 **移动端落地、订阅体系、AI 体验升级** 三条主线，完成了从「Web 产品」向「多端 + 可运营 + 可解释 AI」平台的关键跃迁。核心成果包括：

1. **移动端客户端上线**：基于 Capacitor 完成 iOS/Android 客户端打包与上线准备，移动端导航与页面体验优化。
2. **订阅/支付/激活体系完善**：激活码（Key）体系落地，支持管理员批量创建/管理；购买链接可配置；支付服务可全局暂停。
3. **AI 个性化与提示词统一管理**：用户画像、表达风格、自定义指令进入提示词层级系统；上下文与提示词预算可视化。
4. **知识库系统全面可用**：对话/记录/命理数据/文件归档入库，FTS + Trigram + pgvector + Qwen3-Reranker 分层检索；按会员等级差异化开放。
5. **@ 提及与统一数据入口**：两级 @ 提及（数据/知识库）+ 统一数据源 API，降低 AI 引用成本。
6. **AI 服务管理后台**：模型/来源/统计可配置，支持动态启停、来源切换与调用统计。
7. **周公解梦模式**：解梦人格 + 默认命盘/今日运势上下文注入，形成独立的解梦分析链路。

---

## 2. 🧩 核心功能与技术实现 (Feature Implementation)

### 2.1 移动端客户端上线与移动体验优化 📱

**功能描述**: 通过 Capacitor 将 Next.js 应用封装为 iOS/Android 客户端，提供原生壳与移动端导航体验。

**核心功能**:

| 功能项 | 描述 |
| --- | --- |
| **iOS/Android 工程** | 提供 `ios/`、`android/` 原生项目结构 |
| **Capacitor 配置** | appId/appName/webDir/允许域名等配置统一管理 |
| **Web 资源打包** | `capacitor-www/` 作为移动端 Web 资源目录 |
| **移动端导航** | `MobileNav`/`BottomBar` 提升移动端使用体验 |

**关键配置**:
```typescript
const config: CapacitorConfig = {
  appId: 'com.hhs.mingai',
  appName: 'MingAI',
  webDir: 'capacitor-www',
  server: { url: 'https://www.mingai.fun' }
};
```

**相关文件**:
| 文件 | 说明 |
| --- | --- |
| [capacitor.config.ts](/capacitor.config.ts) | Capacitor 客户端配置 |
| [android/](/android) | Android 原生工程 |
| [ios/](/ios) | iOS 原生工程 |
| [capacitor-www/](/capacitor-www) | 移动端 Web 资源 |
| [MobileNav.tsx](/src/components/layout/MobileNav.tsx) | 移动端导航 |
| [BottomBar.tsx](/src/components/layout/BottomBar.tsx) | 底部导航栏 |

---

### 2.2 订阅/支付/激活体系 🔑

**功能描述**: 订阅方式统一为 Key 激活，管理员可配置购买链接并控制支付开关，形成完整运营闭环。

**核心功能**:

| 功能项 | 描述 |
| --- | --- |
| **激活码 Key** | `sk-xxxx` 格式，支持会员/积分两类 |
| **批量创建** | 管理员支持批量生成 Key 并导出 |
| **支付开关** | 全局支付暂停/恢复，避免异常订单 |
| **购买链接** | Plus/Pro/积分购买链接可自定义 |

**Key 数据结构**:
```typescript
// Key 类型
key_type: 'membership' | 'credits'
// membership: plus/pro
// credits: credits_amount
```

**相关文件**:
| 文件 | 说明 |
| --- | --- |
| [activation-keys.ts](/src/lib/activation-keys.ts) | 激活 Key 管理逻辑 |
| [api/activation-keys](/src/app/api/activation-keys/route.ts) | 激活/创建/删除 API |
| [app-settings.ts](/src/lib/app-settings.ts) | 支付开关与购买链接 |
| [api/payment-status](/src/app/api/payment-status/route.ts) | 支付状态 API |
| [Admin Payment Page](/src/app/admin/payment/page.tsx) | 支付管理后台 |
| [KeyManagementPanel.tsx](/src/components/admin/KeyManagementPanel.tsx) | 激活码管理 |
| [PurchaseLinkPanel.tsx](/src/components/admin/PurchaseLinkPanel.tsx) | 购买链接配置 |
| [PaymentPausePanel.tsx](/src/components/admin/PaymentPausePanel.tsx) | 支付开关面板 |

---

### 2.3 侧边栏自定义与偏好设置 🧭

**功能描述**: 用户可自定义侧边栏导航显示/隐藏与排序，配置持久化并缓存。

**核心功能**:

| 功能项 | 描述 |
| --- | --- |
| **拖拽排序** | 使用 `@dnd-kit` 实现导航项拖拽排序 |
| **显示/隐藏** | 自定义隐藏部分功能入口 |
| **本地缓存** | localStorage 缓存，加速加载 |
| **云端持久化** | `user_settings.sidebar_config` 持久存储 |

**相关文件**:
| 文件 | 说明 |
| --- | --- |
| [SidebarCustomizer.tsx](/src/components/settings/SidebarCustomizer.tsx) | 侧边栏自定义 UI |
| [SidebarConfigContext.tsx](/src/components/layout/SidebarConfigContext.tsx) | 配置上下文与缓存 |
| [user/settings/page.tsx](/src/app/user/settings/page.tsx) | 偏好设置页面 |

---

### 2.4 AI 个性化与提示词分层管理 🧠

**功能描述**: AI 提示词统一收敛到 `prompt-builder`，引入层级优先级与用户偏好体系。

**核心能力**:

| 能力 | 描述 |
| --- | --- |
| **表达风格** | `direct` / `gentle` 风格切换 |
| **用户画像** | identity / occupation / focus / answerPreference / avoid |
| **自定义指令** | 用户可自定义 AI 指令 |
| **提示词分层** | P0（规则/人格）→ P1（偏好）→ P2（数据） |

**提示词层级示例**:
```text
P0: base_rules + personality_role
P1: expression_style / user_profile / custom_instructions
P2: chart_context / @mentions / knowledge_hits / dream_context
```

**相关文件**:
| 文件 | 说明 |
| --- | --- |
| [prompt-builder.ts](/src/lib/prompt-builder.ts) | 提示词统一管理 |
| [ai-settings/page.tsx](/src/app/user/ai-settings/page.tsx) | AI 个性化配置 |
| [api/chat/preview](/src/app/api/chat/preview/route.ts) | 提示词预览与预算统计 |
| [imperative-dazzling-grove.md](/docs/deliverables/details/imperative-dazzling-grove.md) | 提示词统一方案 |
| [personality-refactor.md](/docs/deliverables/details/personality-refactor.md) | 人格系统重构 |

---

### 2.5 知识库系统 📚

**功能描述**: 构建可管理、可检索、可归档的个人知识库体系，支撑 AI 的长期记忆能力。

**核心功能**:

| 功能项 | 描述 |
| --- | --- |
| **知识库管理** | 创建/编辑/删除知识库；设置权重 |
| **多来源归档** | 对话、记录、命理数据、文件可归档 |
| **分层检索** | FTS → Trigram → Vector（Pro） → Reranker |
| **自动注入** | 支持开启“知识库搜索”，自动注入上下文 |
| **文件上传** | 支持 txt/md/json/csv 文件上传入库 |

**数据库结构**:
```sql
knowledge_bases(id, user_id, name, weight)
archived_sources(source_type, source_id, kb_id)
knowledge_entries(content, content_vector, metadata)
```

**相关文件**:
| 文件 | 说明 |
| --- | --- |
| [knowledge-base/index.ts](/src/lib/knowledge-base/index.ts) | 知识库入口模块 |
| [knowledge-base/ingest.ts](/src/lib/knowledge-base/ingest.ts) | 归档与分块入库 |
| [knowledge-base/search.ts](/src/lib/knowledge-base/search.ts) | 分层检索策略 |
| [knowledge-base/reranker.ts](/src/lib/knowledge-base/reranker.ts) | Qwen3 Rerank |
| [api/knowledge-base](/src/app/api/knowledge-base/route.ts) | 知识库 CRUD |
| [api/knowledge-base/ingest](/src/app/api/knowledge-base/ingest/route.ts) | 归档入库 |
| [api/knowledge-base/upload](/src/app/api/knowledge-base/upload/route.ts) | 文件上传 |
| [user/knowledge-base/page.tsx](/src/app/user/knowledge-base/page.tsx) | 知识库管理 UI |
| [AddToKnowledgeBaseModal.tsx](/src/components/knowledge-base/AddToKnowledgeBaseModal.tsx) | 快捷归档弹窗 |

---

### 2.6 @ 提及与统一数据源入口 🧩

**功能描述**: 提供 `@数据` / `@知识库` 两级提及结构，统一所有命理数据入口，降低 AI 引用成本。

**核心功能**:

| 功能项 | 描述 |
| --- | --- |
| **两级 @ 菜单** | 一级分类：数据 / 知识库，二级具体类型 |
| **提及解析** | 支持 `@{...}` Token 格式与 UI 选择 |
| **统一数据源 API** | `/api/data-sources` 聚合命理数据 |
| **可扩展 Provider** | `data-sources` 模块化注册 |

**支持的数据源**:
- 八字命盘、紫微命盘、塔罗、六爻、MBTI、合盘
- 面相/手相分析记录
- 命理记录、每日/每月运势

**相关文件**:
| 文件 | 说明 |
| --- | --- |
| [mentions.ts](/src/lib/mentions.ts) | @ 提及解析与解析上下文 |
| [mention-tokens.ts](/src/lib/mention-tokens.ts) | 文字 Token 处理 |
| [data-sources/](/src/lib/data-sources) | 统一数据源模块 |
| [api/data-sources](/src/app/api/data-sources/route.ts) | 聚合数据源 API |
| [MentionPopover.tsx](/src/components/chat/MentionPopover.tsx) | @ 选择 UI |
| [MentionBadge.tsx](/src/components/chat/MentionBadge.tsx) | @ 标签展示 |

---

### 2.7 AI 回复来源展示与上下文可视化 🔎

**功能描述**: AI 回复可显示来源，提示词预算与上下文使用量透明可视。

**核心功能**:

| 功能项 | 描述 |
| --- | --- |
| **来源追踪** | `SourceTracker` 记录注入来源与 tokens |
| **来源显示** | AI 回复下方显示知识库/数据来源 |
| **提示词诊断** | 各层级 token 预算与占比可视化 |
| **当前时间上下文** | AI 系统提示词自动附带当前时间 |

**相关文件**:
| 文件 | 说明 |
| --- | --- |
| [source-tracker.ts](/src/lib/source-tracker.ts) | 来源追踪 |
| [ChatMessageList.tsx](/src/components/chat/ChatMessageList.tsx) | 来源展示 |
| [SourcePanel.tsx](/src/components/chat/SourcePanel.tsx) | 来源面板 |
| [ChatComposer.tsx](/src/components/chat/ChatComposer.tsx) | 上下文预算可视化 |
| [ai.ts](/src/lib/ai.ts) | 当前时间提示词 |

---

### 2.8 管理员 AI 服务管理 🛠️

**功能描述**: 后台支持 AI 模型启停、来源切换、调用统计，满足多供应商运营需求。

**核心功能**:

| 功能项 | 描述 |
| --- | --- |
| **模型管理** | 启用/禁用、会员等级、推理/视觉能力配置 |
| **来源管理** | 多来源切换、优先级与 API Key 状态 |
| **使用统计** | 调用次数、成功率、token 与耗时统计 |

**相关文件**:
| 文件 | 说明 |
| --- | --- |
| [ai-models API](/src/app/api/admin/ai-models/route.ts) | 模型管理 API |
| [ai-models/sources](/src/app/api/admin/ai-models/[id]/sources/route.ts) | 来源管理 API |
| [ai-models/stats](/src/app/api/admin/ai-models/stats/route.ts) | 统计 API |
| [AIModelPanel.tsx](/src/components/admin/AIModelPanel.tsx) | 模型管理 UI |
| [AISourcePanel.tsx](/src/components/admin/AISourcePanel.tsx) | 来源管理 UI |
| [AIStatsPanel.tsx](/src/components/admin/AIStatsPanel.tsx) | 使用统计 UI |
| [ai-stats.ts](/src/lib/ai-stats.ts) | 调用统计写入 |

---

### 2.9 周公解梦模式 🌙

**功能描述**: 在聊天中开启解梦模式，自动注入默认命盘与今日运势上下文。

**核心功能**:

| 功能项 | 描述 |
| --- | --- |
| **解梦人格** | 独立的梦境分析人格（温和洞察） |
| **上下文注入** | 默认八字 + 今日运势注入 |
| **梦境记录** | 消息元数据记录梦境摘要 |

**相关文件**:
| 文件 | 说明 |
| --- | --- |
| [dream-context API](/src/app/api/dream-context/route.ts) | 解梦上下文 API |
| [chat-context.ts](/src/lib/chat-context.ts) | 解梦上下文构建 |
| [chat/page.tsx](/src/app/chat/page.tsx) | 解梦模式入口 |
| [ai.ts](/src/lib/ai.ts) | 解梦人格定义 |

---

### 2.10 缓存与认证统一 ⚡

**功能描述**: 提供统一缓存工具与统一身份解析逻辑，提升访问速度与稳定性。

**核心功能**:

| 功能项 | 描述 |
| --- | --- |
| **内存缓存** | `createMemoryCache` 用于数据源/支付状态缓存 |
| **本地缓存** | 侧边栏配置本地缓存，加速加载 |
| **统一认证** | Bearer + Cookie 统一解析 `getAuthContext` |

**相关文件**:
| 文件 | 说明 |
| --- | --- |
| [cache.ts](/src/lib/cache.ts) | 缓存工具库 |
| [api-utils.ts](/src/lib/api-utils.ts) | 统一认证与响应 |
| [ClientProviders.tsx](/src/components/providers/ClientProviders.tsx) | 会话统一管理 |

---

## 3. 🏗️ 系统架构与基础设施

### 3.1 数据库架构 (Database Schema)

Phase 8 新增/增强的核心表：

| 表名 | 用途说明 |
| --- | --- |
| `activation_keys` | 激活码体系（会员/积分） |
| `purchase_links` | 购买链接配置 |
| `app_settings` | 全局配置（支付开关） |
| `knowledge_bases` | 知识库容器 |
| `archived_sources` | 归档映射（对话/记录/数据源） |
| `knowledge_entries` | 知识条目（含向量） |
| `ai_models` | AI 模型注册表 |
| `ai_model_sources` | 模型来源管理 |
| `ai_model_stats` | AI 调用统计 |

**用户设置扩展**:
- `sidebar_config`：侧边栏自定义
- `custom_instructions` / `expression_style` / `user_profile`
- `prompt_kb_ids`：启用自动检索的知识库列表

**新增视图**:
- `conversations_with_archive_status`
- `ming_records_with_archive_status`

### 3.2 新增迁移文件

| 迁移文件 | 说明 |
| --- | --- |
| [20260123_add_activation_keys_and_purchase_links.sql](/supabase/migrations/20260123_add_activation_keys_and_purchase_links.sql) | 激活码与购买链接 |
| [20260123_add_sidebar_config_to_user_settings.sql](/supabase/migrations/20260123_add_sidebar_config_to_user_settings.sql) | 侧边栏配置 |
| [20260124_create_knowledge_base_tables.sql](/supabase/migrations/20260124_create_knowledge_base_tables.sql) | 知识库三表 |
| [20260124_search_functions.sql](/supabase/migrations/20260124_search_functions.sql) | FTS/Trigram/Vector 搜索函数 |
| [20260124_vector_index_helpers.sql](/supabase/migrations/20260124_vector_index_helpers.sql) | 向量索引辅助 |
| [20260124_extend_user_settings.sql](/supabase/migrations/20260124_extend_user_settings.sql) | AI 个性化字段 |
| [20260124_add_prompt_kb_ids_to_user_settings.sql](/supabase/migrations/20260124_add_prompt_kb_ids_to_user_settings.sql) | 知识库搜索开关 |
| [20260124_extend_source_tables.sql](/supabase/migrations/20260124_extend_source_tables.sql) | 归档视图 |
| [20260124_allow_chat_message_archive.sql](/supabase/migrations/20260124_allow_chat_message_archive.sql) | 允许单条消息归档 |
| [20260128_create_ai_model_tables.sql](/supabase/migrations/20260128_create_ai_model_tables.sql) | AI 模型管理表 |
| [20260128_seed_ai_models.sql](/supabase/migrations/20260128_seed_ai_models.sql) | 模型种子数据 |

### 3.3 AI & 知识库检索管线

- **提示词分层**：P0/P1/P2 层级统一管理，优先级注入与预算控制。
- **知识库检索**：FTS → Trigram → Vector（Pro） → Rerank（Qwen3）。
- **来源追踪**：AI 消息元数据记录注入来源与 token 使用量。

### 3.4 移动端交付架构

- Capacitor 封装 Web 资产，`android/` 与 `ios/` 工程可直接构建。
- `capacitor-www/` 作为 Web 资源目录，支持线上地址渲染。

---

## 4. 📈 测试与验证 (Verification)

| 测试模块 | 测试场景 | 结果 |
| --- | --- | --- |
| **移动端构建** | `npx cap sync` 资源同步 | ✅ 正常 |
| **激活码创建** | 管理员批量创建 Key | ✅ 正常 |
| **激活码使用** | 用户激活会员/积分 | ✅ 正常 |
| **购买链接** | 后台配置与前台读取 | ✅ 正常 |
| **支付开关** | 全局暂停/恢复支付 | ✅ 正常 |
| **知识库创建** | Plus/Pro 创建限制 | ✅ 正确 |
| **知识库上传** | txt/md/json 文件入库 | ✅ 正常 |
| **知识库检索** | FTS/Trigram/Vector 检索 | ✅ 正常 |
| **@ 提及** | 选择数据/知识库注入 | ✅ 正常 |
| **来源展示** | AI 回复来源可视化 | ✅ 正常 |
| **上下文预算** | 预览层级与 token 统计 | ✅ 正常 |
| **AI 管理后台** | 模型启停/来源切换/统计 | ✅ 正常 |
| **解梦模式** | 自动注入命盘与运势上下文 | ✅ 正常 |
| **侧边栏自定义** | 拖拽/隐藏/保存配置 | ✅ 正常 |

---

## 5. 📊 变更统计

| 统计项 | 数值 |
| --- | --- |
| 新增功能模块 | 9（移动端、订阅、侧边栏、AI个性化、知识库、@提及、数据源、AI管理、解梦） |
| 新增 API 路由 | 18+ |
| 新增数据库表 | 8 |
| 新增/更新迁移文件 | 10+ |
| 新增 AI 管理组件 | 3（模型、来源、统计） |
| 新增知识库模块文件 | 8+ |

---

## 6. 🚀 总结与展望

Phase 8 标志着 MingAI 进入“多端运营 + AI 可解释”阶段，关键突破包括：

1. **移动端落地**：iOS/Android 客户端与移动端体验完善
2. **订阅体系闭环**：激活码 + 购买链接 + 支付开关形成运营工具链
3. **AI 体验升级**：个性化、知识库、@提及、来源展示、预算可视化
4. **AI 服务可运营**：模型与来源可配置、统计可追踪
5. **解梦能力落地**：独立人格与上下文注入

**下一阶段建议 (Phase 9)**:
1. AI SDK 统一架构（已在 Phase 8 规划中延期）
2. 移动端原生能力深化（推送/离线/支付）
3. 知识库智能化（自动摘要、跨 KB 关联）
4. 更精细的 AI 质量与成本监控
