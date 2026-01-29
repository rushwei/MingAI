# 统一提示词管理系统 - 实施计划

## 背景与目标

将聊天系统中分散的提示词逻辑统一到 `prompt-builder.ts` 管理，实现：
1. **统一 Token 预算管理** - 所有提示词层在同一预算框架下分配
2. **可视化使用量** - 前端对话框可显示各层 Token 消耗
3. **避免重复逻辑** - 消除 route.ts 中散落的提示词构建代码

## 当前架构分析

### 已统一管理 (prompt-builder.ts)
| 层级 ID | 当前优先级 | 来源 |
|---------|-----------|------|
| master_rules | P0 | AI_PERSONALITIES.master |
| expression_style | P1 | 用户设置 |
| user_profile | P1 | 用户设置 |
| custom_instructions | P1 | 用户设置 |
| mentioned_data | P2 | @提及解析 |
| knowledge_hits | P2 | 知识库搜索 |

### 尚未统一 (分散在 route.ts)
| 内容 | 当前位置 | 目标优先级 | 当前处理方式 |
|------|----------|-----------|-------------|
| 命盘上下文 (八字/紫微) | route.ts | P2 | callAIStream 第3参数 |
| 盲派分析角色 | mangpai.ts | P0 | 同上 |
| 盲派口诀数据 | mangpai.ts | P2 | 同上 |
| 解梦角色定义 | route.ts | P0 | systemPromptOverride |
| 解梦八字文本 | route.ts | P2 | 同上 |
| 解梦运势文本 | route.ts | P2 | 同上 |
| Dify 网络搜索 | route.ts | - | 用户消息前缀（不计入系统提示词预算） |
| Dify 文件上传 | route.ts | - | 用户消息前缀（不计入系统提示词预算） |

## 实施方案

### 第一步：扩展 PromptContext 接口

**文件**: `src/lib/prompt-builder.ts`

```typescript
export interface PromptContext {
    // 现有字段
    modelId: string;
    reasoningEnabled?: boolean;
    userMessage: string;
    mentions: Array<Mention & { resolvedContent?: string }>;
    knowledgeHits: KnowledgeHit[];
    userSettings: { ... };

    // 新增字段
    chartContext?: {
        baziChart?: BaziChartData;
        ziweiChart?: ZiweiChartData;
        analysisMode?: 'traditional' | 'mangpai';
    };
    dreamMode?: {
        enabled: boolean;
        baziText?: string;      // 已截断的八字文本
        fortuneText?: string;   // 已截断的运势文本
    };
    difyContext?: {
        webContent?: string;
        fileContent?: string;
    };
}
```

### 第二步：新增提示词层定义

**优先级重新定义**:

| 优先级 | 含义 | 说明 |
|--------|------|------|
| P0 | 必需 | AI 核心行为规则，不可截断 |
| P1 | 指令类 | 影响 AI 回答方式的用户偏好设置 |
| P2 | 数据类 | 参考数据，预算不足则跳过，本质上可放用户消息 |

**完整层级设计**:

| 层级 ID | 优先级 | 说明 |
|---------|--------|------|
| master_rules | P0 | AI 人格定义 |
| dream_role | P0 | 解梦角色定义 (仅 dreamMode) |
| mangpai_role | P0 | 盲派分析角色定义 (仅 mangpai 模式) |
| expression_style | P1 | 回答风格（直接/温和） |
| user_profile | P1 | 用户画像（个性化回复） |
| custom_instructions | P1 | 用户自定义指令 |
| chart_context | P2 | 命盘上下文 (八字+紫微) |
| mangpai_data | P2 | 盲派口诀和称号 (仅 mangpai 模式) |
| mentioned_data | P2 | @提及的数据 |
| knowledge_hits | P2 | 知识库检索结果 |
| dream_bazi | P2 | 解梦八字文本 |
| dream_fortune | P2 | 解梦运势文本 |

**预算分配策略**:
- **不设单层上限**：所有层级共用总预算
- **按优先级填充**：P0 → P1 → P2 顺序注入
- **预算耗尽即停**：当剩余预算不足时，跳过后续层级
- **总预算**：由模型决定（calculatePromptBudget）

**优先级逻辑**:
- **P0 (必需)**: 定义 AI 是谁、怎么行动
- **P1 (指令)**: 用户告诉 AI 怎么回答（风格、偏好、自定义规则）
- **P2 (数据)**: 纯参考数据，即使被截断用户也可以直接贴在问题里

### 第三步：重构 buildPromptWithSources 函数

**核心修改**:

```typescript
export async function buildPromptWithSources(context: PromptContext): Promise<{
    systemPrompt: string;
    userMessagePrefix: string;  // Dify 内容作为用户消息前缀
    sources: InjectedSource[];
    diagnostics: PromptLayerDiagnostic[];
    totalTokens: number;
    budgetTotal: number;
}> {
    const budget = calculatePromptBudget(context.modelId, context.reasoningEnabled);
    const tracker = createSourceTracker();
    let remaining = budget;
    const parts: string[] = [];
    const diagnostics: PromptLayerDiagnostic[] = [];

    // 辅助函数：尝试注入内容，预算不足则跳过
    const tryInject = (id: string, priority: string, content: string) => {
        const tokens = countTokens(content);
        if (tokens <= remaining) {
            parts.push(content);
            remaining -= tokens;
            diagnostics.push({ id, priority, included: true, tokens, truncated: false });
            return true;
        } else {
            diagnostics.push({ id, priority, included: false, tokens, truncated: false, reason: 'budget_exceeded' });
            return false;
        }
    };

    // ========== P0 层：必须注入 ==========

    // 1. master_rules (AI 人格)
    tryInject('master_rules', 'P0', getMasterSystemPrompt());

    // 2. dream_role (仅解梦模式)
    if (context.dreamMode?.enabled) {
        tryInject('dream_role', 'P0', getDreamRolePrompt());
    }

    // 3. mangpai_role (仅盲派模式)
    if (context.chartContext?.analysisMode === 'mangpai') {
        tryInject('mangpai_role', 'P0', getMangpaiRolePrompt());
    }

    // ========== P1 层：指令类 ==========

    // 4. expression_style (回答风格)
    if (context.userSettings?.expressionStyle) {
        tryInject('expression_style', 'P1', getExpressionStylePrompt(context.userSettings.expressionStyle));
    }

    // 5. user_profile (用户画像)
    if (context.userSettings?.userProfile) {
        tryInject('user_profile', 'P1', formatUserProfile(context.userSettings.userProfile));
    }

    // 6. custom_instructions (用户自定义指令)
    if (context.userSettings?.customInstructions) {
        tryInject('custom_instructions', 'P1', context.userSettings.customInstructions);
    }

    // ========== P2 层：数据类 ==========

    // 7. chart_context (命盘上下文)
    if (context.chartContext) {
        const chartPrompt = formatChartContextPrompt(context.chartContext);
        if (tryInject('chart_context', 'P2', chartPrompt)) {
            tracker.trackSource('data_source', 'bazi_chart', ...);
        }
    }

    // 8. mangpai_data (盲派口诀 - 仅盲派模式)
    if (context.chartContext?.analysisMode === 'mangpai' && context.chartContext.baziChart) {
        const dayPillar = extractDayPillar(context.chartContext.baziChart);
        if (dayPillar) {
            const mangpai = getMangpaiByDayPillar(dayPillar);
            if (mangpai) {
                const mangpaiData = `【盲派口诀】\n日柱：${mangpai.type}\n称号：${mangpai.称号}\n口诀：${mangpai.口诀}`;
                tryInject('mangpai_data', 'P2', mangpaiData);
            }
        }
    }

    // 9. dream_bazi / dream_fortune (解梦模式数据)
    if (context.dreamMode?.enabled) {
        if (context.dreamMode.baziText) {
            tryInject('dream_bazi', 'P2', `【命盘信息】\n${context.dreamMode.baziText}`);
        }
        if (context.dreamMode.fortuneText) {
            tryInject('dream_fortune', 'P2', `【今日运势】\n${context.dreamMode.fortuneText}`);
        }
    }

    // 10. mentioned_data (@提及数据)
    for (const mention of context.mentions || []) {
        if (!mention.resolvedContent) continue;
        if (tryInject(`mention_${mention.id}`, 'P2', mention.resolvedContent)) {
            tracker.trackSource('mention', mention.sourceType, ...);
        }
    }

    // 11. knowledge_hits (知识库检索)
    for (const hit of context.knowledgeHits || []) {
        const kbContent = `【知识库: ${hit.kbName}】\n${hit.content}`;
        if (tryInject(`kb_${hit.kbId}`, 'P2', kbContent)) {
            tracker.trackSource('knowledge_base', hit.kbId, ...);
        }
    }

    // ========== Dify 内容：作为用户消息前缀 ==========
    const userMessagePrefix = formatDifyContextAsUserPrefix(context.difyContext);

    return {
        systemPrompt: parts.join('\n\n'),
        userMessagePrefix,
        sources: tracker.getSources(),
        diagnostics,
        totalTokens: budget - remaining,
        budgetTotal: budget
    };
}
```

**盲派模式辅助函数** (拆分角色与数据):

```typescript
// P0: 盲派分析角色定义（指令）
function getMangpaiRolePrompt(): string {
    return `你现在是一位精通盲派命理的分析师。在分析时请遵循以下方法：
1. 首先解读该日柱的称号含义
2. 逐句解析口诀内容，结合命主实际情况进行分析
3. 根据口诀中的喜忌指引，给出具体的趋吉避凶建议
4. 若用户询问特定运势，结合口诀中的关键字进行针对性解读
请严格基于盲派口诀和命理理论为用户进行分析。`;
}

// P2: 格式化命盘基础数据（传统和盲派共用）
function formatChartContextPrompt(chartContext: ChartContext): string {
    const parts: string[] = ['--- 用户已选择以下命盘作为对话参考 ---'];

    if (chartContext.baziChart) {
        parts.push(`【八字命盘】\n${generateBaziChartText(chartContext.baziChart)}`);
    }
    if (chartContext.ziweiChart) {
        parts.push(`【紫微命盘】\n${generateZiweiChartText(chartContext.ziweiChart)}`);
    }

    parts.push('--- 命盘信息结束 ---');
    return parts.join('\n\n');
}

// P2: 盲派口诀数据（通过 getMangpaiByDayPillar 获取）
// 直接在 buildPromptWithSources 中处理，无需额外函数
```

### 第四步：简化 /api/chat/route.ts

**修改前** (分散逻辑):
```typescript
// 1. 加载命盘上下文
chartContext = await loadChartContext(chartIds, userId);
chartContextPrompt = formatChartContextPrompt(chartContext, analysisMode);

// 2. 解梦模式
if (dreamMode) {
    const { payload } = await buildDreamContextPayload(userId);
    dreamSystemPrompt = buildDreamSystemPrompt(payload);
}

// 3. Dify 增强
if (difyContext) {
    const difyPrefix = formatDifyContextAsUserPrefix(difyContext);
    processedMessages = injectToLastUserMessage(messages, difyPrefix);
}

// 4. 构建标准提示词
const promptBuild = await buildPromptWithSources({...});

// 5. 合并系统提示词
const combinedSystemPrompt = dreamSystemPrompt
    ? `${dreamSystemPrompt}\n\n${promptBuild.systemPrompt}`
    : promptBuild.systemPrompt;

// 6. 调用 AI
callAIStream(messages, personality, chartContextPrompt, modelId, { systemPromptOverride });
```

**修改后** (统一入口):
```typescript
// 1. 准备上下文
const chartContext = chartIds ? await loadChartContext(chartIds, userId) : undefined;
const dreamPayload = dreamMode ? await buildDreamContextPayload(userId) : undefined;

// 2. 统一构建提示词
const promptBuild = await buildPromptWithSources({
    modelId,
    reasoningEnabled,
    userMessage,
    mentions: resolvedMentions,
    knowledgeHits,
    userSettings,
    chartContext: chartContext ? { ...chartContext, analysisMode } : undefined,
    dreamMode: dreamMode ? {
        enabled: true,
        baziText: dreamPayload?.baziText,
        fortuneText: dreamPayload?.fortuneText,
    } : undefined,
    difyContext,
});

// 3. 处理消息（Dify 前缀）
const processedMessages = promptBuild.userMessagePrefix
    ? injectToLastUserMessage(messages, promptBuild.userMessagePrefix)
    : messages;

// 4. 调用 AI（无需额外参数）
callAIStream(processedMessages, personality, '', modelId, {
    systemPromptOverride: promptBuild.systemPrompt
});
```

### 第五步：前端展示诊断信息

**修改 ChatComposer 组件**，显示 Token 使用量:

```typescript
// 新增 props
interface ChatComposerProps {
    // 现有 props...
    promptDiagnostics?: {
        layers: Array<{ id: string; included: boolean; tokens: number; truncated: boolean }>;
        totalTokens: number;
        budgetTotal: number;
    };
}

// 新增 UI 组件：PromptBudgetIndicator
function PromptBudgetIndicator({ diagnostics }) {
    const usagePercent = (diagnostics.totalTokens / diagnostics.budgetTotal) * 100;

    return (
        <div className="prompt-budget">
            <div className="budget-bar" style={{ width: `${usagePercent}%` }} />
            <span>{diagnostics.totalTokens} / {diagnostics.budgetTotal} tokens</span>
            {/* 展开查看各层明细 */}
        </div>
    );
}
```

### 第六步：增加预览 API

**新增 /api/chat/preview 路由**:

```typescript
// POST /api/chat/preview
// 返回提示词预览和 Token 使用量（不实际调用 AI）
export async function POST(request: Request) {
    const { chartIds, dreamMode, difyContext, mentions, model } = await request.json();

    // 构建上下文（与实际调用相同逻辑）
    const promptBuild = await buildPromptWithSources({...});

    return Response.json({
        diagnostics: promptBuild.diagnostics,
        totalTokens: promptBuild.totalTokens,
        budgetTotal: promptBuild.budgetTotal,
        // 可选：返回系统提示词预览（截断）
        preview: promptBuild.systemPrompt.slice(0, 500) + '...'
    });
}
```

## 修改文件清单

| 文件 | 修改类型 | 说明 |
|------|----------|------|
| `src/lib/prompt-builder.ts` | 修改 | 扩展接口，增加新层级 |
| `src/app/api/chat/route.ts` | 修改 | 简化逻辑，统一调用 |
| `src/app/api/chat/preview/route.ts` | 新增 | Token 预览 API |
| `src/components/chat/ChatComposer.tsx` | 修改 | 增加使用量显示 |
| `src/types/index.ts` | 修改 | 增加诊断信息类型 |

## Dify 内容的特殊处理

**设计决策**: Dify 增强内容（网络搜索/文件上传）仍作为**用户消息前缀**处理，原因：

1. **安全性**: 这些是不可信的外部数据，不应进入系统提示词
2. **Token 独立**: 用户消息有独立的上下文窗口，不与系统提示词竞争
3. **清晰的分界**: 系统提示词 = 可信数据，用户消息 = 可能不可信

但在诊断信息中会**单独统计**，让用户知道这部分占用了多少空间。

## 验证方案

1. **单元测试**: 扩展 `conversation-analysis.test.ts` 覆盖新层级
2. **集成测试**: 验证各种组合场景的 Token 预算分配
3. **前端测试**: 验证使用量显示的准确性
4. **回归测试**: 确保现有功能不受影响

## 预期效果

1. **统一查看**: 用户可在输入框上方看到 Token 使用量进度条
2. **透明预算**: 点击可查看各层（命盘/知识库/解梦等）的具体消耗
3. **按优先级跳过**: 当总预算不足时，按 P0 → P1 → P2 顺序注入，预算不足的层级整体跳过（不截断）
4. **代码简化**: route.ts 中的提示词逻辑大幅简化，更易维护

---

## 待改进项 (Follow-up)

### 1. 知识库 600 token 固定截断问题

**问题描述**: 计划中提出"P2 不截断、预算不足整体跳过"，但 `source-tracker.ts` 的 `summarizeKnowledgeBaseContent` 方法（第 142 行）固定使用 `Math.min(maxTokens, 600)` 作为上限，与"无单层上限"的策略有偏差。

**相关代码** (`src/lib/source-tracker.ts:142`):
```typescript
const limit = typeof maxTokens === 'number' && maxTokens > 0 ? Math.min(maxTokens, 600) : 600;
```

**改进方案**:
- 移除固定 600 token 上限
- 改为使用调用者传入的 `maxTokens` 参数（如果有的话）
- 或者完全移除知识库层的单独截断，让 `prompt-builder` 统一通过预算控制

**修改**:
```typescript
// 改为：
const limit = typeof maxTokens === 'number' && maxTokens > 0 ? maxTokens : Infinity;
```

---

### 2. 预览 API 入口重复问题

**问题描述**: 存在两个功能类似的预览 API，前端当前只使用其中一个：
- `/api/chat/preview/route.ts` - 功能更完整（包含知识库搜索、Dify 上下文）
- `/api/user/ai-settings/preview/route.ts` - ChatComposer 当前使用

**方案选择**:

| 方案 | 说明 | 优点 | 缺点 |
|------|------|------|------|
| **A. 统一到 `/api/chat/preview`** | 删除 ai-settings/preview | 功能更完整，代码更简洁 | 需要修改 ChatComposer |
| B. 统一到 `/api/user/ai-settings/preview` | 删除 chat/preview | 前端无需修改 | 需要补充知识库搜索等功能 |
| C. 保留两者 | chat/preview 用于完整预览，ai-settings/preview 用于轻量级预览 | 各有用途 | 维护成本高 |

**已选方案 A**：统一到 `/api/chat/preview`
- 功能更完整，支持用户消息输入后的知识库搜索预览
- 修改 ChatComposer 调用 `/api/chat/preview` 替代 `/api/user/ai-settings/preview`
- 删除 `/api/user/ai-settings/preview/route.ts`

---

### 3. 知识库去重时诊断原因显示问题

**问题描述**: 当知识库内容因重复签名被跳过时，`source-tracker.ts` 返回 `injected: false` 但不携带原因信息。在 `prompt-builder.ts` 中，这导致 `reason` 被设为 `'empty'` 而非更准确的 `'duplicate'`。

**相关代码**:

`src/lib/source-tracker.ts:51-52`:
```typescript
if (this.knowledgeBaseSignatures.has(signatureKey)) {
    return { content: '', injected: false, tokens: 0, truncated: false };
}
```

`src/lib/prompt-builder.ts:442-450`:
```typescript
if (!prepared.injected) {
    diagnostics.push({
        id: `kb_${hit.kbId}`,
        priority: 'P2',
        included: false,
        tokens: 0,
        truncated: false,
        reason: 'empty'  // 应该是 'duplicate'
    });
    continue;
}
```

**改进方案**:

1. 修改 `trackAndInject` 返回值，增加 `reason` 字段：
```typescript
// source-tracker.ts
trackAndInject(params): {
    content: string;
    injected: boolean;
    tokens: number;
    truncated: boolean;
    reason?: 'empty' | 'duplicate';  // 新增
}

// 重复跳过时：
if (this.knowledgeBaseSignatures.has(signatureKey)) {
    return { content: '', injected: false, tokens: 0, truncated: false, reason: 'duplicate' };
}
```

2. 在 `prompt-builder.ts` 中使用返回的 reason：
```typescript
if (!prepared.injected) {
    diagnostics.push({
        id: `kb_${hit.kbId}`,
        priority: 'P2',
        included: false,
        tokens: 0,
        truncated: false,
        reason: prepared.reason || 'empty'  // 使用实际原因
    });
    continue;
}
```

---

## 改进项修改清单

| 文件 | 改进项 | 修改内容 |
|------|--------|----------|
| `src/lib/source-tracker.ts` | #1, #3 | 移除 600 token 上限；返回 duplicate reason |
| `src/lib/prompt-builder.ts` | #3 | 使用 prepared.reason |
| `src/app/api/user/ai-settings/preview/route.ts` | #2 | 删除（统一到 chat/preview） |
| `src/app/api/chat/preview/route.ts` | #2 | 确保功能完整 |
| `src/components/chat/ChatComposer.tsx` | #2 | 改用 /api/chat/preview |
| `src/types/index.ts` | #3 | reason 类型已预留 'duplicate'，无需修改 |
