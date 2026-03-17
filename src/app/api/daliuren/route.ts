/**
 * 大六壬排盘 API 路由
 *
 * action: calculate | interpret | save
 */
import { NextRequest } from 'next/server';
import { getSystemAdminClient, jsonError, jsonOk, requireBearerUser } from '@/lib/api-utils';
import { createInterpretHandler, type InterpretInput } from '@/lib/api/divination-pipeline';
import { handleDaliurenCalculate, type DaliurenOutput } from '@mingai/mcp-core/daliuren';

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

const DALIUREN_SYSTEM_PROMPT = `你是一位精通大六壬的命理大师，擅长根据六壬课式进行详细解读。
请根据提供的排盘数据，按以下结构进行分析：
1. 课义：概括本课的核心含义
2. 解日：详细解读日干支与三传四课的关系
3. 断日：给出具体的判断
4. 分类占：根据占事类型给出具体建议（天时、家宅、功名、求财、婚姻、疾病、出行等）
请用传统六壬术语，语言简洁有力。`;

function buildDaliurenPrompt(result: DaliurenOutput, question?: string): string {
    const lines: string[] = [
        `## 大六壬排盘数据`,
        `日期：${result.dateInfo.solarDate}`,
        `八字：${result.dateInfo.bazi}`,
        `月将：${result.dateInfo.yueJiang}（${result.dateInfo.yueJiangName}）`,
        `旬空：${result.dateInfo.kongWang.join('')}`,
        `课名：${result.keName}`,
        `课体：${result.keTi.subTypes.join('、')}${result.keTi.extraTypes.length ? '，' + result.keTi.extraTypes.join('、') : ''}`,
        `\n三传：初传${result.sanChuan.chu[0]}(${result.sanChuan.chu[1]}) 中传${result.sanChuan.zhong[0]}(${result.sanChuan.zhong[1]}) 末传${result.sanChuan.mo[0]}(${result.sanChuan.mo[1]})`,
        `四课：一课${result.siKe.yiKe[0]} 二课${result.siKe.erKe[0]} 三课${result.siKe.sanKe[0]} 四课${result.siKe.siKe[0]}`,
    ];
    if (question) lines.push(`\n占事：${question}`);
    lines.push(`\n请详细解读。`);
    return lines.join('\n');
}

const handleInterpret = createInterpretHandler<DaliurenInterpretInput>({
    sourceType: 'daliuren',
    tag: 'daliuren',
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
    buildPrompts: (input) => ({
        systemPrompt: DALIUREN_SYSTEM_PROMPT,
        userPrompt: buildDaliurenPrompt(input.resultData, input.question as string | undefined),
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
        return jsonError('服务器内部错误', 500, { success: false });
    }
}
