/**
 * 奇门遁甲 API 路由
 *
 * action: 'calculate' — 排盘计算
 * action: 'interpret' — AI 解读（流式）
 * action: 'save'     — 保存记录
 */
import { NextRequest } from 'next/server';
import { DEFAULT_DIVINATION_TIMEZONE, zonedTimeToUtc } from '@mingai/core/timezone-utils';
import { getSystemAdminClient, jsonError, jsonOk, requireBearerUser } from '@/lib/api-utils';
import {
    calculateQimenBundle,
    generateQimenChartText,
    toStoredQimenZhiFuJiGong,
    type QimenInput,
    type QimenOutput,
} from '@/lib/divination/qimen';
import {
    createInterpretHandler,
    type InterpretInput,
    type InterpretPromptContext,
} from '@/lib/api/divination-pipeline';
import { SOURCE_CHART_TYPE_MAP } from '@/lib/visualization/chart-types';
import { loadResolvedChartPromptDetailLevel } from '@/lib/ai/chart-prompt-detail';

interface QimenRequest {
    action: 'calculate' | 'interpret' | 'save';
    year?: number;
    month?: number;
    day?: number;
    hour?: number;
    minute?: number;
    timezone?: string;
    question?: string;
    panType?: 'zhuan';
    juMethod?: 'chaibu' | 'maoshan';
    zhiFuJiGong?: 'jiLiuYi' | 'jiWuGong';
    modelId?: string;
    reasoning?: boolean;
    stream?: boolean;
    chartId?: string;
}

type RouteError = { error: string; status: number };

interface QimenInterpretInput extends InterpretInput, QimenInput {
    chartId?: string;
}

interface QimenInterpretContext extends InterpretPromptContext {
    chart: QimenOutput;
}

function isRouteError(value: unknown): value is RouteError {
    return Boolean(value && typeof value === 'object' && 'error' in value && 'status' in value);
}

function parseQimenInput(body: QimenRequest): QimenInput | RouteError {
    const { year, month, day, hour, minute, panType, juMethod, zhiFuJiGong } = body;
    if (
        !Number.isInteger(year)
        || !Number.isInteger(month)
        || !Number.isInteger(day)
        || !Number.isInteger(hour)
        || !Number.isInteger(minute)
    ) {
        return { error: '请提供完整的日期时间', status: 400 };
    }
    if (panType && panType !== 'zhuan') {
        return { error: '当前仅支持转盘', status: 400 };
    }
    if (juMethod && juMethod !== 'chaibu' && juMethod !== 'maoshan') {
        return { error: '定局法无效', status: 400 };
    }
    if (zhiFuJiGong && zhiFuJiGong !== 'jiLiuYi' && zhiFuJiGong !== 'jiWuGong') {
        return { error: '直符寄宫配置无效', status: 400 };
    }

    const timezone = typeof body.timezone === 'string' && body.timezone.trim()
        ? body.timezone.trim()
        : undefined;
    const question = typeof body.question === 'string' && body.question.trim()
        ? body.question.trim()
        : undefined;

    return {
        year,
        month,
        day,
        hour,
        minute,
        timezone,
        question,
        panType: panType || 'zhuan',
        juMethod: juMethod || 'chaibu',
        zhiFuJiGong: zhiFuJiGong || 'jiLiuYi',
    };
}

async function calculateQimenOutput(input: QimenInput): Promise<QimenOutput> {
    const { output } = await calculateQimenBundle(input);
    return output;
}

function buildChartInfoText(chart: QimenOutput, question?: string, detailLevel?: 'default' | 'more' | 'full'): string {
    return generateQimenChartText(chart, { question, detailLevel });
}

function getChartTime(input: QimenInput): string {
    return zonedTimeToUtc({
        year: input.year,
        month: input.month,
        day: input.day,
        hour: input.hour,
        minute: input.minute,
    }, input.timezone || DEFAULT_DIVINATION_TIMEZONE).toISOString();
}

function buildInsertPayload(
    userId: string,
    input: QimenInput,
    chart: QimenOutput,
    conversationId: string | null = null,
) {
    return {
        user_id: userId,
        question: input.question || null,
        chart_time: getChartTime(input),
        year: input.year,
        month: input.month,
        day: input.day,
        hour: input.hour,
        minute: input.minute,
        timezone: input.timezone || DEFAULT_DIVINATION_TIMEZONE,
        dun_type: chart.dunType,
        ju_number: chart.juNumber,
        pan_type: input.panType,
        ju_method: input.juMethod,
        zhi_fu_ji_gong: toStoredQimenZhiFuJiGong(input.zhiFuJiGong),
        conversation_id: conversationId,
    };
}

const handleInterpret = createInterpretHandler<QimenInterpretInput, QimenInterpretContext>({
    sourceType: 'qimen',
    tag: 'qimen',
    personality: 'qimen',
    allowedChartTypes: [...SOURCE_CHART_TYPE_MAP.qimen_chart],
    parseInput: (body) => {
        const request = body as QimenRequest;
        const parsed = parseQimenInput(request);
        if (isRouteError(parsed)) return parsed;
        return {
            ...parsed,
            chartId: typeof request.chartId === 'string' && request.chartId.trim()
                ? request.chartId
                : undefined,
        };
    },
    resolvePromptContext: async (input, userId) => ({
        userId,
        chartPromptDetailLevel: await loadResolvedChartPromptDetailLevel(userId, 'qimen'),
        chart: await calculateQimenOutput(input),
    }),
    buildPrompts: (input, context) => {
        const chartInfo = buildChartInfoText(context.chart, input.question, context.chartPromptDetailLevel);
        return {
            systemPrompt: '',
            userPrompt: `${chartInfo}\n\n请根据以上奇门遁甲排盘信息，为求测者详细解读此局。`,
        };
    },
    buildSourceData: (input, modelId, reasoningEnabled, context) => ({
        dun_type: context.chart.dunType,
        ju_number: context.chart.juNumber,
        pan_type_label: context.chart.panType,
        ju_method_label: context.chart.juMethod,
        four_pillars: context.chart.siZhu,
        question: input.question || null,
        model_id: modelId,
        reasoning: reasoningEnabled,
    }),
    generateTitle: (input, context) => {
        if (input.question) {
            return `奇门遁甲 - ${input.question.slice(0, 20)}${input.question.length > 20 ? '...' : ''}`;
        }
        return `奇门遁甲 - ${context.chart.dunType === 'yang' ? '阳遁' : '阴遁'}${context.chart.juNumber}局`;
    },
    persistRecord: async (input, userId, conversationId, context) => {
        const serviceClient = getSystemAdminClient();
        if (input.chartId) {
            await serviceClient
                .from('qimen_charts')
                .update({ conversation_id: conversationId })
                .eq('id', input.chartId)
                .eq('user_id', userId);
            return;
        }

        await serviceClient
            .from('qimen_charts')
            .insert(buildInsertPayload(userId, input, context.chart, conversationId));
    },
});

export async function POST(request: NextRequest) {
    try {
        const body: QimenRequest = await request.json();

        switch (body.action) {
            case 'calculate': {
                const parsed = parseQimenInput(body);
                if (isRouteError(parsed)) {
                    return jsonError(parsed.error, parsed.status, { success: false });
                }

                const authResult = await requireBearerUser(request);
                if ('error' in authResult) {
                    return jsonError(authResult.error.message, authResult.error.status, { success: false });
                }

                const output = await calculateQimenOutput(parsed);
                return jsonOk({ success: true, data: output });
            }

            case 'interpret':
                return handleInterpret(request, body as unknown as Record<string, unknown>);

            case 'save': {
                const parsed = parseQimenInput(body);
                if (isRouteError(parsed)) {
                    return jsonError(parsed.error, parsed.status, { success: false });
                }

                const authResult = await requireBearerUser(request);
                if ('error' in authResult) {
                    return jsonError(authResult.error.message, authResult.error.status, { success: false });
                }

                const output = await calculateQimenOutput(parsed);
                const serviceClient = getSystemAdminClient();
                const { data: inserted, error: insertError } = await serviceClient
                    .from('qimen_charts')
                    .insert(buildInsertPayload(authResult.user.id, parsed, output))
                    .select('id')
                    .single();

                if (insertError) {
                    console.error('[qimen] 保存排盘记录失败:', insertError.message);
                    return jsonError('保存记录失败', 500, { success: false });
                }

                return jsonOk({ success: true, data: { chartId: inserted?.id } });
            }

            default:
                return jsonError('未知操作', 400, { success: false });
        }
    } catch (error) {
        console.error('[qimen] API 错误:', error);
        if (error instanceof Error && /(timezone|日期无效|格式无效)/u.test(error.message)) {
            return jsonError(error.message, 400, { success: false });
        }
        return jsonError('服务器错误', 500, { success: false });
    }
}
