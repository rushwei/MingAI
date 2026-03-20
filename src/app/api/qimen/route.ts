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
function buildChartInfoText(chart: QimenOutput): string {
    return generateQimenResultText(chart);
}

const QIMEN_SYSTEM_PROMPT = `你是一位精通奇门遁甲的资深易学大师，深谙《奇门遁甲统宗》《御定奇门宝鉴》之精髓。

核心断局原则：
- 以用神为核心，结合天盘、地盘、九星、八门、八神五层信息综合判断
- 值符值使为全局主导，值符代表天时大势，值使代表人事走向
- 天干克应：天盘干克地盘干为上克下（主动），地盘干克天盘干为下克上（被动）
- 格局判断：吉格（如青龙返首、飞鸟跌穴）与凶格（如太白入网、朱雀入墓）直接影响吉凶
- 空亡宫位需特别注意，空亡主虚、主变、主不实
- 驿马宫位主动、主变化、主出行
- 门迫（门克宫）为凶，门生宫为吉

解读格式：
1. 【格局概述】整体格局特征和基本含义
2. 【用神分析】根据所问之事确定用神，分析用神所在宫位的旺衰
3. 【天盘地盘】天干克应关系分析
4. 【星门神】九星、八门、八神的综合作用
5. 【格局吉凶】特殊格局的影响
6. 【综合判断】明确吉凶判断和行动建议

要求：专业而通俗易懂，让求测者理解断局依据。字数800-1200字。`;

const handleInterpret = createInterpretHandler<QimenInterpretInput>({
    sourceType: 'qimen',
    tag: 'qimen',
    parseInput: (body) => {
        const b = body as QimenRequest;
        if (!b.chartData) return { error: '请提供排盘数据', status: 400 };
        return { chart: b.chartData, question: b.question, chartId: b.chartId };
    },
    buildPrompts: (input) => {
        const chartInfo = buildChartInfoText(input.chart);
        return {
            systemPrompt: QIMEN_SYSTEM_PROMPT,
            userPrompt: `${input.question ? `【占事】${input.question}\n\n` : ''}${chartInfo}\n\n请根据以上奇门遁甲排盘信息，为求测者详细解读此局。`,
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
