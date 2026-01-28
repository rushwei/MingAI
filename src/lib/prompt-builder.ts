import type { Mention } from '@/types/mentions';
import type { AIPersonality, BaziChart, DifyContext, PromptLayerPriority, PromptLayerDiagnostic } from '@/types';
import { AI_PERSONALITIES } from '@/lib/ai';
import type { KnowledgeHit } from '@/lib/knowledge-base/types';
import type { InjectedSource } from '@/lib/source-tracker';
import { createSourceTracker } from '@/lib/source-tracker';
import { countTokens } from '@/lib/token-utils';
import { getModelConfig } from '@/lib/ai-config';
import { generateBaziChartText } from '@/lib/bazi';
import { generateZiweiChartText, type ZiweiChart } from '@/lib/ziwei';
import { extractDayPillar, getMangpaiByDayPillar } from '@/lib/mangpai';

export { countTokens, truncateToTokens } from '@/lib/token-utils';

export type { PromptLayerPriority, PromptLayerDiagnostic } from '@/types';

export interface PromptBuildResult {
    prompt: string;
    layers: PromptLayerDiagnostic[];
    totalTokens: number;
    budgetTotal: number;
}

type BaziChartInput = Partial<Omit<BaziChart, 'id' | 'createdAt' | 'userId' | 'gender'>> & {
    id?: string;
    name?: string;
    gender?: BaziChart['gender'] | string;
    birthDate?: string;
    birthTime?: string;
    chartData?: Record<string, unknown>;
};

type ZiweiChartInput = Partial<ZiweiChart> & {
    id?: string;
    name?: string;
    gender?: string;
    birthDate?: string;
    birthTime?: string;
    chartData?: Record<string, unknown>;
};

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
    chartContext?: {
        baziChart?: BaziChartInput;
        ziweiChart?: ZiweiChartInput;
        analysisMode?: 'traditional' | 'mangpai';
    };
    dreamMode?: {
        enabled: boolean;
        baziText?: string;
        fortuneText?: string;
    };
    difyContext?: DifyContext;
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
    'deepseek-v3.2': { maxContext: 32000, promptRatio: 0.25, reserveOutput: 2000, reserveHistory: 4000 },
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

// 通用准则（所有场景共用）
function getBaseRulesPrompt(): string {
    return `## 数据使用规则
1. 优先使用用户 @ 显式引用的数据
2. 其次参考用户知识库（按权重排序）
3. 再次使用系统已有的命盘和历史数据
4. 信息不足时明确提示「条件不足，无法准确判断」
5. 禁止编造不存在的数据
6. 推理结论需注明数据来源

## 注意事项
- 保持专业但不迷信
- 强调命理是参考而非定数
- 传递积极正向的人生观`;
}

export interface PersonalityResolution {
    personalities: AIPersonality[];
    isMultiple: boolean;
}

export function resolvePersonalities(context: {
    chartContext?: PromptContext['chartContext'];
    dreamMode?: PromptContext['dreamMode'];
}): PersonalityResolution {
    const personalities: AIPersonality[] = [];

    if (context.dreamMode?.enabled) {
        personalities.push('dream');
    }

    if (context.chartContext?.analysisMode === 'mangpai') {
        personalities.push('mangpai');
    } else if (context.chartContext?.baziChart) {
        personalities.push('bazi');
    }

    if (context.chartContext?.ziweiChart) {
        personalities.push('ziwei');
    }

    if (personalities.length === 0) {
        personalities.push('general');
    }

    return {
        personalities,
        isMultiple: personalities.length > 1
    };
}

export function buildPersonalityPrompt(personalities: AIPersonality[]): string {
    if (personalities.length === 1) {
        return AI_PERSONALITIES[personalities[0]].systemPrompt;
    }

    const roleDescriptions = personalities.map(personality => {
        const config = AI_PERSONALITIES[personality];
        return `【${config.name}】\n${config.systemPrompt}`;
    });

    return `你同时具备以下专业能力：

${roleDescriptions.join('\n\n')}

请根据用户问题和提供的数据，选择合适的角色进行分析。
如涉及多种数据，请分别从各角度分析，最后给出综合结论。`;
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

function resolveBaziChartData(chart?: BaziChartInput): Omit<BaziChart, 'id' | 'createdAt' | 'userId'> | null {
    if (!chart) return null;
    const chartData = chart.chartData as Omit<BaziChart, 'id' | 'createdAt' | 'userId'> | undefined;
    if (chartData?.fourPillars) return chartData;
    if ((chart as Omit<BaziChart, 'id' | 'createdAt' | 'userId'>).fourPillars) {
        return chart as Omit<BaziChart, 'id' | 'createdAt' | 'userId'>;
    }
    return null;
}

function resolveZiweiChartData(chart?: ZiweiChartInput): ZiweiChart | null {
    if (!chart) return null;
    const chartData = chart.chartData as ZiweiChart | undefined;
    if (chartData?.palaces) return chartData;
    if ((chart as ZiweiChart).palaces) return chart as ZiweiChart;
    return null;
}

function formatBaziFallback(chart: BaziChartInput): string {
    const gender = chart.gender === 'male' ? '男' : chart.gender === 'female' ? '女' : (chart.gender || '');
    return [
        '【八字命盘】',
        `姓名：${chart.name || ''}`,
        `性别：${gender}`,
        `出生日期：${chart.birthDate || ''}${chart.birthTime ? ` ${chart.birthTime}` : ''}`,
    ].filter(Boolean).join('\n');
}

function formatZiweiFallback(chart: ZiweiChartInput): string {
    const gender = chart.gender === 'male' ? '男' : chart.gender === 'female' ? '女' : (chart.gender || '');
    return [
        '【紫微命盘】',
        `姓名：${chart.name || ''}`,
        `性别：${gender}`,
        `出生日期：${chart.birthDate || ''}${chart.birthTime ? ` ${chart.birthTime}` : ''}`,
    ].filter(Boolean).join('\n');
}

// 格式化命盘上下文
function formatChartContextPrompt(chartContext: NonNullable<PromptContext['chartContext']>): string {
    const parts: string[] = ['--- 用户已选择以下命盘作为对话参考 ---'];

    if (chartContext.baziChart) {
        const baziData = resolveBaziChartData(chartContext.baziChart);
        if (baziData) {
            parts.push(generateBaziChartText(baziData));
        } else {
            parts.push(formatBaziFallback(chartContext.baziChart));
        }
    }

    if (chartContext.ziweiChart) {
        const ziweiData = resolveZiweiChartData(chartContext.ziweiChart);
        if (ziweiData) {
            parts.push(generateZiweiChartText(ziweiData));
        } else {
            parts.push(formatZiweiFallback(chartContext.ziweiChart));
        }
    }

    parts.push('--- 命盘信息结束 ---');
    return parts.length > 2 ? parts.join('\n\n') : '';
}

function formatDifyContextAsUserPrefix(difyContext?: DifyContext): string {
    if (!difyContext) return '';
    const parts: string[] = [];

    if (difyContext.fileContent) {
        parts.push(`【用户上传的文件内容如下】\n${difyContext.fileContent}\n【文件内容结束】`);
    }

    if (difyContext.webContent) {
        parts.push(`【网络搜索结果如下】\n${difyContext.webContent}\n【搜索结果结束】`);
    }

    if (parts.length > 0) {
        return `${parts.join('\n\n')}\n\n【用户的问题如下】\n`;
    }

    return '';
}

function resolveDayPillar(chart?: BaziChartInput): string | null {
    if (!chart) return null;
    const data = (chart.chartData as Record<string, unknown> | undefined) ?? chart;
    return extractDayPillar(data as { fourPillars?: { day?: { stem?: string; branch?: string } } });
}

// 简化版提示词构建：不追踪 sources，适用于预览或测试
export async function buildPersonalizedPrompt(context: PromptContext): Promise<PromptBuildResult> {
    const result = await buildPromptWithSources(context);
    return {
        prompt: result.systemPrompt,
        layers: result.diagnostics,
        totalTokens: result.totalTokens,
        budgetTotal: result.budgetTotal
    };
}

// 完整构建：返回 systemPrompt + sources + 诊断信息，供 chat 路由使用
export async function buildPromptWithSources(context: PromptContext): Promise<{
    systemPrompt: string;
    userMessagePrefix: string;
    userMessageTokens: number;
    sources: InjectedSource[];
    diagnostics: PromptLayerDiagnostic[];
    totalTokens: number;
    budgetTotal: number;
}> {
    const budget = calculatePromptBudget(context.modelId, context.reasoningEnabled);
    const tracker = createSourceTracker();
    let remaining = budget;

    const diagnostics: PromptLayerDiagnostic[] = [];
    const parts: string[] = [];

    const tryInject = (id: string, priority: PromptLayerPriority, content: string, options?: { tokens?: number; truncated?: boolean; reason?: PromptLayerDiagnostic['reason'] }): boolean => {
        if (!content?.trim()) {
            diagnostics.push({
                id,
                priority,
                included: false,
                tokens: 0,
                truncated: false,
                reason: options?.reason || 'empty'
            });
            return false;
        }

        const tokens = options?.tokens ?? countTokens(content);
        const truncated = options?.truncated ?? false;
        if (tokens <= remaining || priority === 'P0') {
            parts.push(content);
            remaining -= tokens;
            diagnostics.push({ id, priority, included: true, tokens, truncated });
            return true;
        }

        diagnostics.push({ id, priority, included: false, tokens, truncated, reason: 'budget_exceeded' });
        return false;
    };

    // ========== P0 层：必须注入 ==========
    tryInject('base_rules', 'P0', getBaseRulesPrompt());

    const personalityResolution = resolvePersonalities({
        chartContext: context.chartContext,
        dreamMode: context.dreamMode
    });
    tryInject('personality_role', 'P0', buildPersonalityPrompt(personalityResolution.personalities));

    // ========== P1 层：指令类 ==========
    const expressionStyle = formatExpressionStyle(context.userSettings?.expressionStyle);
    if (expressionStyle) {
        tryInject('expression_style', 'P1', expressionStyle);
    }

    const userProfile = formatUserProfile(context.userSettings?.userProfile);
    if (userProfile) {
        tryInject('user_profile', 'P1', userProfile);
    }

    const customInstructions = context.userSettings?.customInstructions || '';
    if (customInstructions) {
        tryInject('custom_instructions', 'P1', customInstructions);
    }

    // ========== P2 层：数据类 ==========
    if (context.chartContext) {
        const chartPrompt = formatChartContextPrompt(context.chartContext);
        if (tryInject('chart_context', 'P2', chartPrompt)) {
            if (context.chartContext.baziChart) {
                const baziChart = context.chartContext.baziChart;
                const baziContent = resolveBaziChartData(baziChart)
                    ? generateBaziChartText(resolveBaziChartData(baziChart) as Omit<BaziChart, 'id' | 'createdAt' | 'userId'>)
                    : formatBaziFallback(baziChart);
                tracker.trackAndInject({
                    type: 'data_source',
                    sourceType: 'bazi_chart',
                    id: baziChart.id || 'bazi_chart',
                    name: `八字命盘-${baziChart.name || '未命名'}`,
                    content: baziContent
                });
            }
            if (context.chartContext.ziweiChart) {
                const ziweiChart = context.chartContext.ziweiChart;
                const ziweiContent = resolveZiweiChartData(ziweiChart)
                    ? generateZiweiChartText(resolveZiweiChartData(ziweiChart) as ZiweiChart)
                    : formatZiweiFallback(ziweiChart);
                tracker.trackAndInject({
                    type: 'data_source',
                    sourceType: 'ziwei_chart',
                    id: ziweiChart.id || 'ziwei_chart',
                    name: `紫微命盘-${ziweiChart.name || '未命名'}`,
                    content: ziweiContent
                });
            }
        }
    }

    if (context.chartContext?.analysisMode === 'mangpai' && context.chartContext.baziChart) {
        const dayPillar = resolveDayPillar(context.chartContext.baziChart);
        if (dayPillar) {
            const mangpai = getMangpaiByDayPillar(dayPillar);
            if (mangpai) {
                const mangpaiData = `【盲派口诀】\n日柱：${mangpai.type}\n称号：${mangpai.称号}\n口诀：${mangpai.口诀}`;
                tryInject('mangpai_data', 'P2', mangpaiData);
            }
        }
    }

    if (context.dreamMode?.enabled) {
        if (context.dreamMode.baziText) {
            tryInject('dream_bazi', 'P2', `【命盘信息】\n${context.dreamMode.baziText}`);
        }
        if (context.dreamMode.fortuneText) {
            tryInject('dream_fortune', 'P2', `【今日运势】\n${context.dreamMode.fortuneText}`);
        }
    }

    for (const mention of context.mentions || []) {
        if (!mention.resolvedContent || !mention.id) continue;
        const prepared = tracker.trackAndInject({
            type: 'mention',
            sourceType: mention.type === 'knowledge_base' ? undefined : mention.type,
            id: mention.id,
            name: mention.name,
            content: mention.resolvedContent,
            dryRun: true
        });
        if (!prepared.injected) {
            diagnostics.push({
                id: `mention_${mention.id}`,
                priority: 'P2',
                included: false,
                tokens: 0,
                truncated: false,
                reason: 'empty'
            });
            continue;
        }
        if (tryInject(`mention_${mention.id}`, 'P2', prepared.content, { tokens: prepared.tokens, truncated: prepared.truncated })) {
            tracker.trackAndInject({
                type: 'mention',
                sourceType: mention.type === 'knowledge_base' ? undefined : mention.type,
                id: mention.id,
                name: mention.name,
                content: prepared.content
            });
        }
    }

    for (const hit of context.knowledgeHits || []) {
        const kbContent = `【知识库: ${hit.kbName}】\n${hit.content}`;
        const prepared = tracker.trackAndInject({
            type: 'knowledge_base',
            id: hit.kbId,
            name: hit.kbName,
            content: kbContent,
            dryRun: true
        });
        if (!prepared.injected) {
            diagnostics.push({
                id: `kb_${hit.kbId}`,
                priority: 'P2',
                included: false,
                tokens: 0,
                truncated: false,
                reason: prepared.reason || 'empty'
            });
            continue;
        }
        if (tryInject(`kb_${hit.kbId}`, 'P2', prepared.content, { tokens: prepared.tokens, truncated: prepared.truncated })) {
            tracker.trackAndInject({
                type: 'knowledge_base',
                id: hit.kbId,
                name: hit.kbName,
                content: prepared.content
            });
        }
    }

    const userMessagePrefix = formatDifyContextAsUserPrefix(context.difyContext);
    const userMessageTokens = userMessagePrefix ? countTokens(userMessagePrefix) : 0;

    return {
        systemPrompt: parts.join('\n\n'),
        userMessagePrefix,
        userMessageTokens,
        sources: tracker.getSources(),
        diagnostics,
        totalTokens: budget - remaining,
        budgetTotal: budget
    };
}
