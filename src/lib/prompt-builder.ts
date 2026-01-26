import type { Mention, MentionType } from '@/types/mentions';
import { AI_PERSONALITIES } from '@/lib/ai';
import type { KnowledgeHit } from '@/lib/knowledge-base/types';
import type { InjectedSource } from '@/lib/source-tracker';
import { createSourceTracker } from '@/lib/source-tracker';
import { countTokens, truncateToTokens } from '@/lib/token-utils';
import { getModelConfig } from '@/lib/ai-config';

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
    reasoningEnabled?: boolean;
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
    promptCapRatio?: number;
    maxPromptTokens?: number;
    minPromptTokens?: number;
}

// 各模型上下文预算配置：预留输出与历史消息，剩余按比例作为提示词预算
const MODEL_CONTEXT_CONFIGS: Record<string, ModelContextConfig> = {
    'deepseek-v3': { maxContext: 32000, promptRatio: 0.25, reserveOutput: 2000, reserveHistory: 4000 },
    'deepseek-pro': { maxContext: 64000, promptRatio: 0.25, reserveOutput: 4000, reserveHistory: 4000 },
    'deepseek-pro-reasoner': { maxContext: 64000, promptRatio: 0.35, reserveOutput: 4000, reserveHistory: 4000, promptCapRatio: 0.6, maxPromptTokens: 6000 },
    'glm-4.6': { maxContext: 128000, promptRatio: 0.25, reserveOutput: 2000, reserveHistory: 4000 },
    'glm-4.6-reasoner': { maxContext: 128000, promptRatio: 0.35, reserveOutput: 2000, reserveHistory: 4000, promptCapRatio: 0.6, maxPromptTokens: 6000 },
    'glm-4.7': { maxContext: 128000, promptRatio: 0.3, reserveOutput: 4000, reserveHistory: 4000 },
    'glm-4.7-reasoner': { maxContext: 128000, promptRatio: 0.35, reserveOutput: 4000, reserveHistory: 4000, promptCapRatio: 0.6, maxPromptTokens: 6000 },
    'gemini-3': { maxContext: 128000, promptRatio: 0.3, reserveOutput: 2000, reserveHistory: 4000 },
    'gemini-pro': { maxContext: 128000, promptRatio: 0.35, reserveOutput: 4000, reserveHistory: 4000, promptCapRatio: 0.6, maxPromptTokens: 6000 }, // Gemini Pro（包含 2.5/3），默认推理
    'qwen-3-max': { maxContext: 64000, promptRatio: 0.25, reserveOutput: 4000, reserveHistory: 4000 },
    deepai: { maxContext: 128000, promptRatio: 0.3, reserveOutput: 4000, reserveHistory: 4000, promptCapRatio: 0.8, maxPromptTokens: 8000 }, // DeepAI 默认推理，提升至 8000
    'qwen-vl-plus': { maxContext: 32000, promptRatio: 0.25, reserveOutput: 4000, reserveHistory: 4000 },
    'qwen-vl-plus-reasoner': { maxContext: 32000, promptRatio: 0.2, reserveOutput: 5000, reserveHistory: 4000 },
    'gemini-vl': { maxContext: 32000, promptRatio: 0.2, reserveOutput: 4000, reserveHistory: 8000 },
    default: { maxContext: 32000, promptRatio: 0.25, reserveOutput: 2000, reserveHistory: 4000 }
};

// 计算系统提示词的总预算（token 级），防止挤压历史对话与输出空间
function resolveModelContextConfig(modelId: string, reasoningEnabled?: boolean): ModelContextConfig {
    if (reasoningEnabled) {
        const reasoningId = `${modelId}-reasoner`;
        if (MODEL_CONTEXT_CONFIGS[reasoningId]) return MODEL_CONTEXT_CONFIGS[reasoningId];
    }
    if (MODEL_CONTEXT_CONFIGS[modelId]) return MODEL_CONTEXT_CONFIGS[modelId];
    if (modelId.startsWith('gemini-pro-')) return MODEL_CONTEXT_CONFIGS['gemini-pro'];
    if (modelId.startsWith('gemini-vl-')) return MODEL_CONTEXT_CONFIGS['gemini-vl'];
    if (modelId.startsWith('deepai-')) return MODEL_CONTEXT_CONFIGS.deepai;
    return MODEL_CONTEXT_CONFIGS.default;
}

export function getModelContextInfo(modelId: string, reasoningEnabled?: boolean): ModelContextConfig {
    return resolveModelContextConfig(modelId, reasoningEnabled);
}

export function getPromptBudget(modelId: string, reasoningEnabled?: boolean): number {
    return calculatePromptBudget(modelId, reasoningEnabled);
}

function calculatePromptBudget(modelId: string, reasoningEnabled?: boolean): number {
    const config = resolveModelContextConfig(modelId, reasoningEnabled);
    // 可用于系统提示词的剩余上下文
    const available = config.maxContext - config.reserveOutput - config.reserveHistory;
    // 按模型比例分配的预算
    const ratioBudget = Math.floor(available * config.promptRatio);
    const model = getModelConfig(modelId);
    // 模型默认输出上限，用于估算提示词占比
    const defaultMax = model?.defaultMaxTokens ?? 4000;
    // 提示词占默认输出上限的比例与上限
    const capRatio = config.promptCapRatio ?? 0.4;
    const capLimit = config.maxPromptTokens ?? 4000;
    // 提示词预算下限，避免过低
    const minLimit = config.minPromptTokens ?? 1000;
    // 预算上限约束：比例预算不超过 capLimit
    const ratioCapped = Math.min(ratioBudget, capLimit);
    // 预算上限约束：输出上限约束不超过 capLimit
    const outputCapped = Math.min(Math.floor(defaultMax * capRatio), capLimit);
    // 最终取两种约束的更小值
    const budget = Math.min(ratioCapped, outputCapped);
    // 在上下限内截断，避免过低/过高
    return Math.min(Math.max(budget, minLimit), capLimit);
}

// 默认人格的系统提示词（使用 AI_PERSONALITIES 中的定义，避免重复维护）
function getMasterSystemPrompt(): string {
    return AI_PERSONALITIES.master.systemPrompt;
}

// 用户表达风格偏好（来自 user_settings）
function formatExpressionStyle(style?: 'direct' | 'gentle'): string {
    if (!style) return '';
    if (style === 'gentle') return '表达风格：委婉、温和，但仍要给出明确结论。';
    return '表达风格：直说、一针见血，但保持尊重。';
}

// 用户画像注入：限制长度，避免过长 JSON 占用预算
function formatUserProfile(profile?: unknown): string {
    if (!profile) return '';
    if (typeof profile === 'string') return profile.slice(0, 600);
    try {
        return JSON.stringify(profile).slice(0, 600);
    } catch {
        return '';
    }
}

// 简化版提示词构建：不追踪 sources，适用于预览或测试
export async function buildPersonalizedPrompt(context: PromptContext): Promise<PromptBuildResult> {
    const budget = calculatePromptBudget(context.modelId, context.reasoningEnabled);
    const layers: PromptLayer[] = [
        { id: 'master_rules', priority: 0, maxTokens: 800, content: getMasterSystemPrompt(), canTruncate: false, canDrop: false },
        { id: 'mentioned_data', priority: 1, maxTokens: budget, content: '', canTruncate: true, canDrop: false },
        { id: 'knowledge_hits', priority: 1, maxTokens: Math.min(1500, Math.floor(budget * 0.3)), content: '', canTruncate: true, canDrop: false },
        { id: 'expression_style', priority: 2, maxTokens: 100, content: formatExpressionStyle(context.userSettings.expressionStyle), canTruncate: false, canDrop: true },
        { id: 'user_profile', priority: 2, maxTokens: 300, content: formatUserProfile(context.userSettings.userProfile), canTruncate: true, canDrop: true },
        { id: 'custom_instructions', priority: 2, maxTokens: 500, content: context.userSettings.customInstructions || '', canTruncate: true, canDrop: true }
    ];

    return assemblePrompt(layers, budget);
}

// 按优先级拼接提示词层：P0 必注入，P1/ P2 在预算内截断或丢弃
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

// 在预算内尽量多塞入 data source / mention / 知识库片段，并记录来源
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

// 完整构建：返回 systemPrompt + sources + 诊断信息，供 chat 路由使用
export async function buildPromptWithSources(context: PromptContext): Promise<{
    systemPrompt: string;
    sources: InjectedSource[];
    diagnostics: PromptBuildResult['layers'];
    totalTokens: number;
    budgetTotal: number;
}> {
    const budget = calculatePromptBudget(context.modelId, context.reasoningEnabled);
    const tracker = createSourceTracker();
    let remaining = budget;

    const layersResult: Array<{ id: string; included: boolean; tokens: number; truncated: boolean }> = [];
    const parts: string[] = [];

    const p0Layers: PromptLayer[] = [
        { id: 'master_rules', priority: 0, maxTokens: 800, content: getMasterSystemPrompt(), canTruncate: false, canDrop: false }
    ];

    for (const layer of p0Layers) {
        const tokens = countTokens(layer.content);
        parts.push(layer.content);
        remaining -= tokens;
        layersResult.push({ id: layer.id, included: true, tokens, truncated: false });
    }

    const mentionLayerBudget = budget;
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

    const knowledgeLayerBudget = budget;
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
