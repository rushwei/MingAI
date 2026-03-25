import type { Mention } from '@/types/mentions';
import type { AIPersonality, BaziChart, DifyContext, PromptLayerPriority, PromptLayerDiagnostic } from '@/types';
import { AI_PERSONALITIES } from './ai';
import type { KnowledgeHit } from '@/lib/knowledge-base/types';
import type { InjectedSource } from '@/lib/source-tracker';
import { createSourceTracker } from '@/lib/source-tracker';
import { countTokens, truncateToTokens } from '@/lib/token-utils';
import { getModelConfigAsync } from '@/lib/server/ai-config';
import { formatBaziCaseProfileForAI, type BaziCaseProfile } from '@/lib/bazi-case-profile';
import { formatBaziPromptText } from '@/lib/bazi-prompt';
import { formatZiweiPromptText, type ZiweiPromptInput } from '@/lib/ziwei-chart-prompt';
import { extractDayPillar, getMangpaiByDayPillar } from '@/lib/divination/mangpai';
import {
    type VisualizationSettings,
} from '@/lib/visualization/settings';
import { type ChartType, SOURCE_CHART_TYPE_MAP } from '@/lib/visualization/chart-types';
import {
    buildVisualizationOutputContractPrompt,
    buildVisualizationPreferencePrompts,
} from '@/lib/visualization/prompt';
import { formatPreviousChartsForPrompt, type ExtractedChart } from '@/lib/visualization/chart-data-extract';

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
    caseProfile?: Pick<BaziCaseProfile, 'masterReview' | 'ownerFeedback' | 'events'> | null;
};

type ZiweiChartInput = ZiweiPromptInput;

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
        visualizationSettings?: VisualizationSettings;
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
    /** 之前分析中已生成的图表（用于复用提示） */
    previousCharts?: ExtractedChart[];
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
    'kimi-k2.5': { maxContext: 128000, promptRatio: 0.25, reserveOutput: 4000, reserveHistory: 4000 },
    'kimi-k2.5-reasoner': { maxContext: 128000, promptRatio: 0.35, reserveOutput: 4000, reserveHistory: 4000, promptCapRatio: 0.6, maxPromptTokens: 6000 },
    default: { maxContext: 32000, promptRatio: 0.25, reserveOutput: 2000, reserveHistory: 4000 }
};

// 计算系统提示词的总预算（token 级），防止挤压历史对话与输出空间
export function resolveModelContextConfig(modelId: string, reasoningEnabled?: boolean): ModelContextConfig {
    if (reasoningEnabled) {
        const reasoningId = `${modelId}-reasoner`;
        if (MODEL_CONTEXT_CONFIGS[reasoningId]) return MODEL_CONTEXT_CONFIGS[reasoningId];
    }
    if (MODEL_CONTEXT_CONFIGS[modelId]) return MODEL_CONTEXT_CONFIGS[modelId];
    if (modelId.startsWith('gemini-pro-')) return MODEL_CONTEXT_CONFIGS['gemini-pro'];
    if (modelId.startsWith('gemini-vl-')) return MODEL_CONTEXT_CONFIGS['gemini-vl'];
    if (modelId.startsWith('deepai-')) return MODEL_CONTEXT_CONFIGS.deepai;
    if (modelId.startsWith('kimi-')) return MODEL_CONTEXT_CONFIGS['kimi-k2.5'];
    return MODEL_CONTEXT_CONFIGS.default;
}

export async function calculatePromptBudget(modelId: string, reasoningEnabled?: boolean): Promise<number> {
    const config = resolveModelContextConfig(modelId, reasoningEnabled);
    // 可用于系统提示词的剩余上下文
    const available = config.maxContext - config.reserveOutput - config.reserveHistory;
    // 按模型比例分配的预算
    const ratioBudget = Math.floor(available * config.promptRatio);
    const model = await getModelConfigAsync(modelId);
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
    mentions?: PromptContext['mentions'];
}): PersonalityResolution {
    const personalities: AIPersonality[] = [];
    const addPersonality = (personality: AIPersonality) => {
        if (!personalities.includes(personality)) {
            personalities.push(personality);
        }
    };

    if (context.dreamMode?.enabled) {
        addPersonality('dream');
    }

    if (context.chartContext?.analysisMode === 'mangpai') {
        addPersonality('mangpai');
    } else {
        const hasBaziChart = !!context.chartContext?.baziChart;
        const hasBaziMention = (context.mentions || []).some(mention => mention.type === 'bazi_chart');
        if (hasBaziChart || hasBaziMention) {
            addPersonality('bazi');
        }
    }

    const hasZiweiChart = !!context.chartContext?.ziweiChart;
    const hasZiweiMention = (context.mentions || []).some(mention => mention.type === 'ziwei_chart');
    if (hasZiweiChart || hasZiweiMention) {
        addPersonality('ziwei');
    }

    // 塔罗牌提及
    const hasTarotMention = (context.mentions || []).some(mention => mention.type === 'tarot_reading');
    if (hasTarotMention) {
        addPersonality('tarot');
    }

    // 六爻提及
    const hasLiuyaoMention = (context.mentions || []).some(mention => mention.type === 'liuyao_divination');
    if (hasLiuyaoMention) {
        addPersonality('liuyao');
    }

    // MBTI 提及
    const hasMbtiMention = (context.mentions || []).some(mention => mention.type === 'mbti_reading');
    if (hasMbtiMention) {
        addPersonality('mbti');
    }

    // 合盘提及
    const hasHepanMention = (context.mentions || []).some(mention => mention.type === 'hepan_chart');
    if (hasHepanMention) {
        addPersonality('hepan');
    }

    if (personalities.length === 0) {
        addPersonality('general');
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

const VISUALIZATION_MENTION_TYPES = new Set(
    Object.keys(SOURCE_CHART_TYPE_MAP).filter(
        (key) => (SOURCE_CHART_TYPE_MAP as Record<string, readonly ChartType[]>)[key].length > 0,
    ),
);

function hasVisualizationMentions(mentions?: PromptContext['mentions']): boolean {
    return (mentions || []).some((mention) => VISUALIZATION_MENTION_TYPES.has(mention.type));
}

// 根据 mention 类型和 chart context 动态推荐适合的图表类型
function resolveAllowedChartTypes(context: PromptContext): ChartType[] {
    const types = new Set<ChartType>();
    for (const m of (context.mentions || [])) {
        const mapped = (SOURCE_CHART_TYPE_MAP as Record<string, readonly ChartType[]>)[m.type];
        if (mapped) {
            for (const t of mapped) types.add(t);
        }
    }
    if (context.chartContext?.baziChart) {
        for (const t of SOURCE_CHART_TYPE_MAP.bazi_chart) types.add(t);
    }
    if (context.chartContext?.ziweiChart) {
        for (const t of SOURCE_CHART_TYPE_MAP.ziwei_chart) types.add(t);
    }
    if (context.dreamMode?.enabled) {
        types.add('dream_association');
    }
    return [...types];
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
        parts.push(formatBaziPromptText(chartContext.baziChart, chartContext.baziChart.caseProfile));
    }

    if (chartContext.ziweiChart) {
        const ziweiText = formatZiweiPromptText(chartContext.ziweiChart);
        if (ziweiText) {
            parts.push(ziweiText);
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
    const budget = await calculatePromptBudget(context.modelId, context.reasoningEnabled);
    const tracker = createSourceTracker();
    let remaining = budget;

    const diagnostics: PromptLayerDiagnostic[] = [];
    const parts: string[] = [];

    const tryInject = (
        id: string,
        priority: PromptLayerPriority,
        content: string,
        options?: {
            tokens?: number;
            truncated?: boolean;
            reason?: PromptLayerDiagnostic['reason'];
        },
    ): boolean => {
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
        if (tokens <= remaining) {
            parts.push(content);
            remaining = Math.max(remaining - tokens, 0);
            diagnostics.push({ id, priority, included: true, tokens, truncated });
            return true;
        }

        if (priority === 'P0' && remaining > 0) {
            const clipped = truncateToTokens(content, remaining).trim();
            if (clipped) {
                const clippedTokens = countTokens(clipped);
                parts.push(clipped);
                remaining = Math.max(remaining - clippedTokens, 0);
                diagnostics.push({ id, priority, included: true, tokens: clippedTokens, truncated: true });
                return true;
            }
        }

        diagnostics.push({ id, priority, included: false, tokens, truncated, reason: 'budget_exceeded' });
        return false;
    };

    // ========== P0 层：必须注入 ==========
    tryInject('base_rules', 'P0', getBaseRulesPrompt());

    const personalityResolution = resolvePersonalities({
        chartContext: context.chartContext,
        dreamMode: context.dreamMode,
        mentions: context.mentions
    });
    tryInject('personality_role', 'P0', buildPersonalityPrompt(personalityResolution.personalities));

    if (context.chartContext) {
        const chartPrompt = formatChartContextPrompt(context.chartContext);
        if (tryInject('chart_context', 'P1', chartPrompt)) {
            if (context.chartContext.baziChart) {
                const baziChart = context.chartContext.baziChart;
                const baziContent = formatBaziPromptText(baziChart, baziChart.caseProfile);
                tracker.trackAndInject({
                    type: 'data_source',
                    sourceType: 'bazi_chart',
                    id: baziChart.id || 'bazi_chart',
                    name: `八字命盘-${baziChart.name || '未命名'}`,
                    content: baziContent
                });
                const caseProfileContent = formatBaziCaseProfileForAI(baziChart.caseProfile);
                if (caseProfileContent) {
                    tracker.trackAndInject({
                        type: 'data_source',
                        sourceType: 'bazi_chart',
                        id: `${baziChart.id || 'bazi_chart'}:case-profile`,
                        name: `断事笔记-${baziChart.name || '未命名'}`,
                        content: caseProfileContent,
                    });
                }
            }
            if (context.chartContext.ziweiChart) {
                const ziweiChart = context.chartContext.ziweiChart;
                const ziweiContent = formatZiweiPromptText(ziweiChart) || formatZiweiFallback(ziweiChart);
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

    // 可视化维度设置（userSettings.visualizationSettings 已在上游 normalize）
    const vizSettings = context.userSettings?.visualizationSettings;
    const visualizationPrompts = buildVisualizationPreferencePrompts(vizSettings);
    if (visualizationPrompts.dimensionsPrompt) {
        tryInject('visualization_dimensions', 'P1', visualizationPrompts.dimensionsPrompt);
    }
    if (visualizationPrompts.dayunPrompt) {
        tryInject(
            'visualization_dayun_display',
            'P1',
            visualizationPrompts.dayunPrompt,
        );
    }
    if (visualizationPrompts.chartStylePrompt) {
        tryInject(
            'visualization_chart_style',
            'P1',
            visualizationPrompts.chartStylePrompt,
        );
    }
    if (context.chartContext || vizSettings || context.dreamMode?.enabled || hasVisualizationMentions(context.mentions)) {
        const allowedChartTypes = resolveAllowedChartTypes(context);
        tryInject(
            'visualization_output_contract',
            'P1',
            buildVisualizationOutputContractPrompt(allowedChartTypes),
        );
    }

    // 之前生成的图表数据复用提示
    if (context.previousCharts && context.previousCharts.length > 0) {
        const chartReusePrompt = formatPreviousChartsForPrompt(context.previousCharts);
        if (chartReusePrompt) {
            tryInject('visualization_previous_charts', 'P2', chartReusePrompt);
        }
    }

    // ========== P2 层：数据类 ==========
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
