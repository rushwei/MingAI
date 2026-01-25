import type { Mention, MentionType } from '@/types/mentions';
import type { KnowledgeHit } from '@/lib/knowledge-base/types';
import type { InjectedSource } from '@/lib/source-tracker';
import { createSourceTracker } from '@/lib/source-tracker';
import { countTokens, truncateToTokens } from '@/lib/token-utils';

export { countTokens, truncateToTokens } from '@/lib/token-utils';

interface PromptLayer {
    id: string;
    priority: 0 | 1 | 2;
    maxTokens: number;
    content: string;
    canTruncate: boolean;
    canDrop: boolean;
}

export interface PromptBuildResult {
    prompt: string;
    layers: Array<{ id: string; included: boolean; tokens: number; truncated: boolean }>;
    totalTokens: number;
    budgetTotal: number;
}

export interface PromptContext {
    modelId: string;
    userMessage: string;
    mentions: Array<Mention & { resolvedContent?: string }>;
    knowledgeHits: KnowledgeHit[];
    userSettings: {
        expressionStyle?: 'direct' | 'gentle';
        userProfile?: unknown;
        customInstructions?: string | null;
    };
}

interface ModelContextConfig {
    maxContext: number;
    promptRatio: number;
    reserveOutput: number;
    reserveHistory: number;
}

const MODEL_CONTEXT_CONFIGS: Record<string, ModelContextConfig> = {
    'deepseek-chat': { maxContext: 64000, promptRatio: 0.3, reserveOutput: 2000, reserveHistory: 4000 },
    'deepseek-reasoner': { maxContext: 64000, promptRatio: 0.25, reserveOutput: 4000, reserveHistory: 4000 },
    'glm-4-flash': { maxContext: 128000, promptRatio: 0.3, reserveOutput: 2000, reserveHistory: 4000 },
    'glm-4-plus': { maxContext: 128000, promptRatio: 0.3, reserveOutput: 2000, reserveHistory: 4000 },
    'gemini-1.5-flash': { maxContext: 1000000, promptRatio: 0.1, reserveOutput: 4000, reserveHistory: 8000 },
    'qwen-max': { maxContext: 32000, promptRatio: 0.3, reserveOutput: 2000, reserveHistory: 4000 },
    default: { maxContext: 32000, promptRatio: 0.3, reserveOutput: 2000, reserveHistory: 4000 }
};

function calculatePromptBudget(modelId: string): number {
    const config = MODEL_CONTEXT_CONFIGS[modelId] || MODEL_CONTEXT_CONFIGS.default;
    const available = config.maxContext - config.reserveOutput - config.reserveHistory;
    const budget = Math.floor(available * config.promptRatio);
    return Math.min(Math.max(budget, 2000), 20000);
}

function getMasterSystemPrompt(): string {
    return [
        '你是一位精通八字命理的资深命理宗师，拥有50年实战经验。',
        '',
        '## 人格特点',
        '- 说话直接，一针见血，不拐弯抹角',
        '- 经常引用易经、子平真诠等古籍典故',
        '- 对命理有独到见解，敢于直言',
        '- 语气严肃但充满智慧',
        '',
        '## 回答风格',
        '- 开门见山，先给结论',
        '- 解释时引用理论依据',
        '- 给出具体可行的建议',
        '- 偶尔使用文言文增添权威感',
        '',
        '## 注意事项',
        '- 保持专业但不迷信',
        '- 强调命理是参考而非定数',
        '- 传递积极正向的人生观'
    ].join('\n');
}

function getDataPriorityRules(): string {
    return [
        '## 数据使用规则',
        '1. 优先使用用户 @ 显式引用的数据',
        '2. 其次参考用户知识库（按权重排序）',
        '3. 再次使用系统已有的命盘和历史数据',
        '4. 信息不足时明确提示「条件不足，无法准确判断」',
        '5. 禁止编造不存在的数据',
        '6. 推理结论需注明数据来源'
    ].join('\n');
}

function formatExpressionStyle(style?: 'direct' | 'gentle'): string {
    if (!style) return '';
    if (style === 'gentle') return '表达风格：委婉、温和，但仍要给出明确结论。';
    return '表达风格：直说、一针见血，但保持尊重。';
}

function formatUserProfile(profile?: unknown): string {
    if (!profile) return '';
    if (typeof profile === 'string') return profile.slice(0, 600);
    try {
        return JSON.stringify(profile).slice(0, 600);
    } catch {
        return '';
    }
}

export async function buildPersonalizedPrompt(context: PromptContext): Promise<PromptBuildResult> {
    const budget = calculatePromptBudget(context.modelId);
    const layers: PromptLayer[] = [
        { id: 'master_rules', priority: 0, maxTokens: 800, content: getMasterSystemPrompt(), canTruncate: false, canDrop: false },
        { id: 'data_priority', priority: 0, maxTokens: 200, content: getDataPriorityRules(), canTruncate: false, canDrop: false },
        { id: 'mentioned_data', priority: 1, maxTokens: Math.min(2000, Math.floor(budget * 0.4)), content: '', canTruncate: true, canDrop: false },
        { id: 'knowledge_hits', priority: 1, maxTokens: Math.min(1500, Math.floor(budget * 0.3)), content: '', canTruncate: true, canDrop: false },
        { id: 'expression_style', priority: 2, maxTokens: 100, content: formatExpressionStyle(context.userSettings.expressionStyle), canTruncate: false, canDrop: true },
        { id: 'user_profile', priority: 2, maxTokens: 300, content: formatUserProfile(context.userSettings.userProfile), canTruncate: true, canDrop: true },
        { id: 'custom_instructions', priority: 2, maxTokens: 500, content: context.userSettings.customInstructions || '', canTruncate: true, canDrop: true }
    ];

    return assemblePrompt(layers, budget);
}

function assemblePrompt(layers: PromptLayer[], budget: number): PromptBuildResult {
    const p0Layers = layers.filter(l => l.priority === 0);
    const p1Layers = layers.filter(l => l.priority === 1);
    const p2Layers = layers.filter(l => l.priority === 2);

    let remaining = budget;
    const results: PromptBuildResult['layers'] = [];
    const parts: string[] = [];

    for (const layer of p0Layers) {
        const tokens = countTokens(layer.content);
        parts.push(layer.content);
        remaining -= tokens;
        results.push({ id: layer.id, included: true, tokens, truncated: false });
    }

    for (const layer of p1Layers) {
        const tokens = countTokens(layer.content);
        if (tokens <= remaining) {
            parts.push(layer.content);
            remaining -= tokens;
            results.push({ id: layer.id, included: true, tokens, truncated: false });
        } else if (layer.canTruncate && remaining > 100) {
            const truncated = truncateToTokens(layer.content, remaining);
            const truncatedTokens = countTokens(truncated);
            parts.push(truncated);
            remaining -= truncatedTokens;
            results.push({ id: layer.id, included: true, tokens: truncatedTokens, truncated: true });
        } else {
            results.push({ id: layer.id, included: false, tokens: 0, truncated: false });
        }
    }

    for (const layer of p2Layers) {
        if (!layer.content) {
            results.push({ id: layer.id, included: false, tokens: 0, truncated: false });
            continue;
        }

        const tokens = countTokens(layer.content);
        if (tokens <= remaining) {
            parts.push(layer.content);
            remaining -= tokens;
            results.push({ id: layer.id, included: true, tokens, truncated: false });
        } else if (layer.canTruncate && remaining > 50) {
            const truncated = truncateToTokens(layer.content, remaining);
            const truncatedTokens = countTokens(truncated);
            parts.push(truncated);
            remaining -= truncatedTokens;
            results.push({ id: layer.id, included: true, tokens: truncatedTokens, truncated: true });
        } else {
            results.push({ id: layer.id, included: false, tokens: 0, truncated: false });
        }
    }

    return {
        prompt: parts.join('\n\n'),
        layers: results,
        totalTokens: budget - remaining,
        budgetTotal: budget
    };
}

function takeSourcesWithinBudget(params: {
    tracker: ReturnType<typeof createSourceTracker>;
    maxTokens: number;
    type: 'knowledge_base' | 'mention' | 'data_source';
    items: Array<{ id: string; name: string; content: string; sourceType?: MentionType }>;
}): { text: string; usedTokens: number; truncated: boolean } {
    const { tracker, maxTokens, type, items } = params;
    let remaining = maxTokens;
    const parts: string[] = [];
    let truncated = false;

    for (const item of items) {
        if (remaining <= 30) break;
        const injected = tracker.trackAndInject({
            type,
            sourceType: item.sourceType && item.sourceType !== 'knowledge_base' ? item.sourceType : undefined,
            id: item.id,
            name: item.name,
            content: item.content,
            maxTokens: remaining
        });
        if (!injected.injected) continue;
        const tokens = countTokens(injected.content);
        parts.push(injected.content);
        remaining -= tokens;
        if (countTokens(item.content) > tokens) truncated = true;
    }

    return { text: parts.join('\n\n'), usedTokens: maxTokens - remaining, truncated };
}

export async function buildPromptWithSources(context: PromptContext): Promise<{
    systemPrompt: string;
    sources: InjectedSource[];
    diagnostics: PromptBuildResult['layers'];
    totalTokens: number;
    budgetTotal: number;
}> {
    const budget = calculatePromptBudget(context.modelId);
    const tracker = createSourceTracker();
    let remaining = budget;

    const layersResult: Array<{ id: string; included: boolean; tokens: number; truncated: boolean }> = [];
    const parts: string[] = [];

    const p0Layers: PromptLayer[] = [
        { id: 'master_rules', priority: 0, maxTokens: 800, content: getMasterSystemPrompt(), canTruncate: false, canDrop: false },
        { id: 'data_priority', priority: 0, maxTokens: 200, content: getDataPriorityRules(), canTruncate: false, canDrop: false }
    ];

    for (const layer of p0Layers) {
        const tokens = countTokens(layer.content);
        parts.push(layer.content);
        remaining -= tokens;
        layersResult.push({ id: layer.id, included: true, tokens, truncated: false });
    }

    const mentionLayerBudget = Math.min(2000, Math.floor(budget * 0.4));
    const mentionItems = context.mentions
        .filter(m => m.id && m.resolvedContent)
        .map(m => ({
            id: m.id as string,
            name: m.name,
            content: m.resolvedContent as string,
            sourceType: m.type
        }));

    const mentionBudget = Math.min(mentionLayerBudget, Math.max(0, remaining));
    const mentionBlock = takeSourcesWithinBudget({
        tracker,
        maxTokens: mentionBudget,
        type: 'mention',
        items: mentionItems
    });
    if (mentionBlock.text) {
        parts.push(mentionBlock.text);
        remaining -= mentionBlock.usedTokens;
        layersResult.push({ id: 'mentioned_data', included: true, tokens: mentionBlock.usedTokens, truncated: mentionBlock.truncated });
    } else {
        layersResult.push({ id: 'mentioned_data', included: false, tokens: 0, truncated: false });
    }

    const knowledgeLayerBudget = Math.min(1500, Math.floor(budget * 0.3));
    const knowledgeBudget = Math.min(knowledgeLayerBudget, Math.max(0, remaining));
    const knowledgeItems = context.knowledgeHits.map(h => ({
        id: h.kbId,
        name: h.kbName,
        content: h.content
    }));
    const knowledgeBlock = takeSourcesWithinBudget({
        tracker,
        maxTokens: knowledgeBudget,
        type: 'knowledge_base',
        items: knowledgeItems
    });
    if (knowledgeBlock.text) {
        parts.push(knowledgeBlock.text);
        remaining -= knowledgeBlock.usedTokens;
        layersResult.push({ id: 'knowledge_hits', included: true, tokens: knowledgeBlock.usedTokens, truncated: knowledgeBlock.truncated });
    } else {
        layersResult.push({ id: 'knowledge_hits', included: false, tokens: 0, truncated: false });
    }

    const p2Layers: PromptLayer[] = [
        { id: 'expression_style', priority: 2, maxTokens: 100, content: formatExpressionStyle(context.userSettings.expressionStyle), canTruncate: false, canDrop: true },
        { id: 'user_profile', priority: 2, maxTokens: 300, content: formatUserProfile(context.userSettings.userProfile), canTruncate: true, canDrop: true },
        { id: 'custom_instructions', priority: 2, maxTokens: 500, content: context.userSettings.customInstructions || '', canTruncate: true, canDrop: true }
    ];

    for (const layer of p2Layers) {
        if (!layer.content) {
            layersResult.push({ id: layer.id, included: false, tokens: 0, truncated: false });
            continue;
        }

        const tokens = countTokens(layer.content);
        if (tokens <= remaining) {
            parts.push(layer.content);
            remaining -= tokens;
            layersResult.push({ id: layer.id, included: true, tokens, truncated: false });
        } else if (layer.canTruncate && remaining > 50) {
            const truncatedText = truncateToTokens(layer.content, remaining);
            const truncatedTokens = countTokens(truncatedText);
            parts.push(truncatedText);
            remaining -= truncatedTokens;
            layersResult.push({ id: layer.id, included: true, tokens: truncatedTokens, truncated: true });
        } else {
            layersResult.push({ id: layer.id, included: false, tokens: 0, truncated: false });
        }
    }

    return {
        systemPrompt: parts.join('\n\n'),
        sources: tracker.getSources(),
        diagnostics: layersResult,
        totalTokens: budget - remaining,
        budgetTotal: budget
    };
}
