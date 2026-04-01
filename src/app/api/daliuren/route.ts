/**
 * 大六壬排盘 API 路由
 *
 * action: calculate | interpret | save
 */
import { NextRequest } from 'next/server';
import { getSystemAdminClient, jsonError, jsonOk, requireBearerUser } from '@/lib/api-utils';
import { createInterpretHandler, type InterpretInput } from '@/lib/api/divination-pipeline';
import { SOURCE_CHART_TYPE_MAP } from '@/lib/visualization/chart-types';
import { handleDaliurenCalculate, type DaliurenOutput } from '@mingai/core/daliuren';
import { generateDaliurenResultText } from '@/lib/divination/daliuren';
import { loadResolvedChartPromptDetailLevel } from '@/lib/ai/chart-prompt-detail';

interface DaliurenRequest {
    action: 'calculate' | 'interpret' | 'save';
    date?: string;
    hour?: number;
    minute?: number;
    timezone?: string;
    question?: string;
    birthYear?: number;
    gender?: 'male' | 'female';
    divinationId?: string;
    modelId?: string;
    reasoning?: boolean;
    resultData?: DaliurenOutput;
}

// ─── Interpret pipeline config ───

interface DaliurenInterpretInput extends InterpretInput {
    resultData: DaliurenOutput;
    question?: string;
    divinationId?: string;
}

function buildDaliurenPrompt(result: DaliurenOutput, question?: string, detailLevel?: 'default' | 'more' | 'full'): string {
    return `${generateDaliurenResultText({
        ...result,
        question: question || result.question,
    }, { detailLevel })}\n\n请详细解读。`;
}

const handleInterpret = createInterpretHandler<DaliurenInterpretInput>({
    sourceType: 'daliuren',
    tag: 'daliuren',
    personality: 'daliuren',
    allowedChartTypes: [...SOURCE_CHART_TYPE_MAP.daliuren_divination],
    parseInput: (body) => {
        const b = body as DaliurenRequest;
        if (!b.resultData) {
            return { error: '请提供排盘数据', status: 400 };
        }
        return {
            resultData: b.resultData,
            question: b.question,
            divinationId: b.divinationId,
        };
    },
    resolvePromptContext: async (_input, userId) => ({
        userId,
        chartPromptDetailLevel: await loadResolvedChartPromptDetailLevel(userId, 'daliuren'),
    }),
    buildPrompts: (input, promptContext) => ({
        systemPrompt: '',
        userPrompt: buildDaliurenPrompt(input.resultData, input.question as string | undefined, promptContext?.chartPromptDetailLevel),
    }),
    buildSourceData: (input, modelId) => ({
        ke_name: input.resultData.keName,
        day_ganzhi: input.resultData.dateInfo.ganZhi.day,
        hour_ganzhi: input.resultData.dateInfo.ganZhi.hour,
        yue_jiang: input.resultData.dateInfo.yueJiang,
        question: input.question || null,
        model_id: modelId,
    }),
    generateTitle: (input) => `大六壬 · ${input.resultData.keName}`,
    persistRecord: async (input, userId, conversationId) => {
        if (input.divinationId && conversationId) {
            const serviceClient = getSystemAdminClient();
            await serviceClient
                .from('daliuren_divinations')
                .update({ conversation_id: conversationId })
                .eq('id', input.divinationId)
                .eq('user_id', userId);
        }
    },
});

export async function POST(request: NextRequest) {
    try {
        const body: DaliurenRequest = await request.json();
        const { action } = body;

        switch (action) {
            case 'calculate': {
                const { date, hour, minute, timezone, question, birthYear, gender } = body;
                if (!date || hour == null) {
                    return jsonError('请提供日期和时辰', 400, { success: false });
                }
                const result = handleDaliurenCalculate({
                    date, hour, minute, timezone, question, birthYear, gender,
                });
                return jsonOk({ success: true, data: result });
            }

            case 'save': {
                const authResult = await requireBearerUser(request);
                if ('error' in authResult) {
                    return jsonError(authResult.error.message, authResult.error.status, { success: false });
                }
                const { user } = authResult;
                const { date, hour, minute, timezone, question, resultData } = body;

                if (!date || hour == null || !resultData) {
                    return jsonError('缺少排盘数据', 400, { success: false });
                }

                const serviceClient = getSystemAdminClient();
                const { data: inserted, error: insertError } = await serviceClient
                    .from('daliuren_divinations')
                    .insert({
                        user_id: user.id,
                        question: question || null,
                        solar_date: date,
                        day_ganzhi: resultData.dateInfo.ganZhi.day,
                        hour_ganzhi: resultData.dateInfo.ganZhi.hour,
                        yue_jiang: resultData.dateInfo.yueJiang,
                        result_data: resultData,
                        settings: { hour, minute, timezone },
                    })
                    .select('id')
                    .single();

                if (insertError) {
                    console.error('[daliuren] 保存排盘记录失败:', insertError.message);
                    return jsonError('保存记录失败', 500, { success: false });
                }

                return jsonOk({ success: true, data: { divinationId: inserted?.id } });
            }

            case 'interpret':
                return handleInterpret(request, body as unknown as Record<string, unknown>);

            default:
                return jsonError(`未知操作: ${action}`, 400, { success: false });
        }
    } catch (error) {
        console.error('[daliuren] 路由错误:', error);
        if (error instanceof Error && /(timezone|日期无效|格式无效|闰月|农历)/u.test(error.message)) {
            return jsonError(error.message, 400, { success: false });
        }
        return jsonError('服务器内部错误', 500, { success: false });
    }
}
