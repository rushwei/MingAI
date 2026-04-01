/**
 * 奇门遁甲 API 路由
 *
 * action: 'calculate' — 排盘计算
 * action: 'analyze'  — AI 解读（流式）
 * action: 'save'     — 保存记录
 */
import { NextRequest } from 'next/server';
import { getSystemAdminClient, jsonError, jsonOk, requireBearerUser } from '@/lib/api-utils';
import { handleQimenCalculate } from '@/lib/divination/qimen';
import { generateQimenResultText, type QimenOutput } from '@/lib/divination/qimen-shared';
import { createInterpretHandler, type InterpretInput } from '@/lib/api/divination-pipeline';
import { SOURCE_CHART_TYPE_MAP } from '@/lib/visualization/chart-types';
import { loadResolvedChartPromptDetailLevel } from '@/lib/ai/chart-prompt-detail';

interface QimenRequest {
    action: 'calculate' | 'analyze' | 'save';
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
    chartData?: QimenOutput;
    modelId?: string;
    reasoning?: boolean;
    stream?: boolean;
    chartId?: string;
}

// ─── Interpret pipeline config ───

interface QimenInterpretInput extends InterpretInput {
    chart: QimenOutput;
    question?: string;
    chartId?: string;
}

/** 构建排盘信息文本供 AI 解读 */
function buildChartInfoText(chart: QimenOutput, question?: string, detailLevel?: 'default' | 'more' | 'full'): string {
    return generateQimenResultText({
        ...chart,
        question,
    }, { detailLevel });
}

const handleInterpret = createInterpretHandler<QimenInterpretInput>({
    sourceType: 'qimen',
    tag: 'qimen',
    personality: 'qimen',
    allowedChartTypes: [...SOURCE_CHART_TYPE_MAP.qimen_chart],
    parseInput: (body) => {
        const b = body as QimenRequest;
        if (!b.chartData) return { error: '请提供排盘数据', status: 400 };
        return { chart: b.chartData, question: b.question, chartId: b.chartId };
    },
    resolvePromptContext: async (_input, userId) => ({
        userId,
        chartPromptDetailLevel: await loadResolvedChartPromptDetailLevel(userId, 'qimen'),
    }),
    buildPrompts: (input, promptContext) => {
        const chartInfo = buildChartInfoText(input.chart, input.question, promptContext?.chartPromptDetailLevel);
        return {
            systemPrompt: '',
            userPrompt: `${chartInfo}\n\n请根据以上奇门遁甲排盘信息，为求测者详细解读此局。`,
        };
    },
    buildSourceData: (input, modelId, reasoningEnabled) => ({
        dun_type: input.chart.dunType,
        ju_number: input.chart.juNumber,
        pan_type_label: input.chart.panTypeLabel,
        ju_method_label: input.chart.juMethodLabel,
        four_pillars: input.chart.fourPillars,
        question: input.question || null,
        model_id: modelId,
        reasoning: reasoningEnabled,
    }),
    generateTitle: (input) => {
        if (input.question) {
            return `奇门遁甲 - ${(input.question as string).slice(0, 20)}${(input.question as string).length > 20 ? '...' : ''}`;
        }
        return `奇门遁甲 - ${input.chart.dunType === 'yang' ? '阳遁' : '阴遁'}${input.chart.juNumber}局`;
    },
    persistRecord: async (input, userId, conversationId) => {
        const serviceClient = getSystemAdminClient();
        if (input.chartId) {
            await serviceClient
                .from('qimen_charts')
                .update({ conversation_id: conversationId })
                .eq('id', input.chartId)
                .eq('user_id', userId);
        } else {
            await serviceClient
                .from('qimen_charts')
                .insert({
                    user_id: userId,
                    question: input.question || null,
                    chart_time: new Date().toISOString(),
                    chart_data: input.chart,
                    dun_type: input.chart.dunType,
                    ju_number: input.chart.juNumber,
                    pan_type: 'zhuan',
                    ju_method: input.chart.juMethodLabel === '茅山法' ? 'maoshan' : 'chaibu',
                    conversation_id: conversationId,
                });
        }
    },
});

export async function POST(request: NextRequest) {
    try {
        const body: QimenRequest = await request.json();
        const { action } = body;

        switch (action) {
            case 'calculate': {
                const { year, month, day, hour, minute, timezone, question, panType, juMethod, zhiFuJiGong } = body;
                if (!year || !month || !day || hour == null || minute == null) {
                    return jsonError('请提供完整的日期时间', 400, { success: false });
                }
                if (panType && panType !== 'zhuan') {
                    return jsonError('当前仅支持转盘', 400, { success: false });
                }
                const authResult = await requireBearerUser(request);
                if ('error' in authResult) {
                    return jsonError(authResult.error.message, authResult.error.status, { success: false });
                }
                const result = await handleQimenCalculate({
                    year, month, day, hour, minute, timezone, question,
                    panType: panType || 'zhuan',
                    juMethod: juMethod || 'chaibu',
                    zhiFuJiGong: zhiFuJiGong || 'jiLiuYi',
                });
                return jsonOk({ success: true, data: result });
            }

            case 'analyze':
                return handleInterpret(request, body as unknown as Record<string, unknown>);

            case 'save': {
                const { chartData: saveChartData, question } = body;
                if (!saveChartData) return jsonError('请提供排盘数据', 400, { success: false });
                const authResult = await requireBearerUser(request);
                if ('error' in authResult) return jsonError(authResult.error.message, authResult.error.status, { success: false });
                const serviceClient = getSystemAdminClient();
                const { data: inserted, error: insertError } = await serviceClient
                    .from('qimen_charts')
                    .insert({
                        user_id: authResult.user.id,
                        question: question || null,
                        chart_time: new Date().toISOString(),
                        chart_data: saveChartData,
                        dun_type: saveChartData.dunType,
                        ju_number: saveChartData.juNumber,
                        pan_type: 'zhuan',
                        ju_method: saveChartData.juMethodLabel === '茅山法' ? 'maoshan' : 'chaibu',
                    })
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
