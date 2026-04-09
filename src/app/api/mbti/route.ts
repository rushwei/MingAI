/**
 * MBTI 性格测试 API 路由
 *
 * 提供 AI 性格分析功能
 */
import { NextRequest } from 'next/server';
import { getSystemAdminClient, jsonError, jsonOk, requireBearerUser } from '@/lib/api-utils';
import { type MBTIType, PERSONALITY_BASICS } from '@/lib/divination/mbti';
import { createInterpretHandler, type InterpretInput } from '@/lib/api/divination-pipeline';
import { SOURCE_CHART_TYPE_MAP } from '@/lib/visualization/chart-types';

interface MBTIRequest {
    action: 'analyze' | 'save' | 'history';
    type: MBTIType;
    scores: Record<string, number>;
    percentages: {
        EI: { E: number; I: number };
        SN: { S: number; N: number };
        TF: { T: number; F: number };
        JP: { J: number; P: number };
    };
    readingId?: string;
    modelId?: string;
    reasoning?: boolean;
    stream?: boolean;
}

// ─── Interpret pipeline config ───

interface MBTIInterpretInput extends InterpretInput {
    type: MBTIType;
    scores: Record<string, number>;
    percentages: MBTIRequest['percentages'];
    readingId?: string;
}

const handleInterpret = createInterpretHandler<MBTIInterpretInput>({
    sourceType: 'mbti',
    tag: 'mbti',
    personality: 'mbti',
    allowedChartTypes: [...SOURCE_CHART_TYPE_MAP.mbti_reading],
    parseInput: (body) => {
        const b = body as MBTIRequest;
        if (!b.type || !b.percentages) {
            return { error: '请提供完整的测试结果', status: 400 };
        }
        return {
            type: b.type,
            scores: b.scores,
            percentages: b.percentages,
            readingId: b.readingId,
        };
    },
    buildPrompts: (input) => {
        const basic = PERSONALITY_BASICS[input.type];

        const userPrompt = `用户的 MBTI 测试结果：

性格类型：${input.type} - ${basic.title}
${basic.description}

维度分析：
- 外向(E) ${input.percentages.EI.E}% vs 内向(I) ${input.percentages.EI.I}%
- 实感(S) ${input.percentages.SN.S}% vs 直觉(N) ${input.percentages.SN.N}%
- 思考(T) ${input.percentages.TF.T}% vs 情感(F) ${input.percentages.TF.F}%
- 判断(J) ${input.percentages.JP.J}% vs 知觉(P) ${input.percentages.JP.P}%

请为这位用户提供个性化的深度分析。`;

        return { systemPrompt: '', userPrompt };
    },
    buildSourceData: (input, modelId, reasoningEnabled) => ({
        mbti_type: input.type,
        scores: input.scores,
        percentages: input.percentages,
        model_id: modelId,
        reasoning: reasoningEnabled,
    }),
    generateTitle: (input) => `${input.type} 人格分析`,
    buildHistoryBinding: (input) => ({
        type: 'mbti',
        payload: input.readingId
            ? { reading_id: input.readingId }
            : {
                mbti_type: input.type,
                scores: input.scores,
                percentages: input.percentages,
            },
    }),
});

export async function POST(request: NextRequest) {
    try {
        const body: MBTIRequest = await request.json();
        const { action } = body;

        if (action === 'save') {
            if (!body.type || !body.percentages) {
                return jsonError('请提供完整的测试结果', 400, { success: false });
            }
            const authResult = await requireBearerUser(request);
            if ('error' in authResult) {
                return jsonError(authResult.error.message, authResult.error.status, { success: false });
            }
            const serviceClient = getSystemAdminClient();
            const { data: insertedReading, error: insertError } = await serviceClient
                .from('mbti_readings')
                .insert({
                    user_id: authResult.user.id,
                    mbti_type: body.type,
                    scores: body.scores,
                    percentages: body.percentages,
                })
                .select('id')
                .single();
            if (insertError) {
                console.error('[mbti] 保存测试记录失败:', insertError.message);
                return jsonError('保存记录失败', 500, { success: false });
            }
            return jsonOk({ success: true, data: { readingId: insertedReading?.id } });
        }

        if (action === 'history') {
            const authResult = await requireBearerUser(request);
            if ('error' in authResult) {
                return jsonError(authResult.error.message, authResult.error.status, { success: false });
            }
            const serviceClient = getSystemAdminClient();
            const { data: history, error: historyError } = await serviceClient
                .from('mbti_readings')
                .select('*')
                .eq('user_id', authResult.user.id)
                .order('created_at', { ascending: false })
                .limit(20);
            if (historyError) {
                return jsonError('获取历史记录失败', 500, { success: false });
            }
            return jsonOk({ success: true, data: { history } });
        }

        if (action !== 'analyze') {
            return jsonError('未知操作', 400, { success: false });
        }

        return handleInterpret(request, body as unknown as Record<string, unknown>);
    } catch (error) {
        console.error('[mbti] API 错误:', error);
        return jsonError('服务器错误', 500, { success: false });
    }
}
