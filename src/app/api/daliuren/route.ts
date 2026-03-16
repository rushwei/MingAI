/**
 * 大六壬排盘 API 路由
 *
 * action: calculate | interpret | save | history
 */
import { NextRequest } from 'next/server';
import { getSystemAdminClient, jsonError, jsonOk, requireBearerUser, requireUserContext } from '@/lib/api-utils';
import { useCredit, getUserAuthInfo, addCredits } from '@/lib/user/credits';
import { callAIStream, readAIStream } from '@/lib/ai/ai';
import { DEFAULT_MODEL_ID } from '@/lib/ai/ai-config';
import { resolveModelAccessAsync } from '@/lib/ai/ai-access';
import { handleDaliurenCalculate } from '@mingai/mcp-core';
import type { DaliurenOutput } from '@mingai/mcp-core/daliuren';

interface DaliurenRequest {
    action: 'calculate' | 'interpret' | 'save' | 'history';
    date?: string;
    hour?: number;
    minute?: number;
    question?: string;
    birthYear?: number;
    gender?: 'male' | 'female';
    divinationId?: string;
    modelId?: string;
    reasoning?: boolean;
    resultData?: DaliurenOutput;
}

export async function GET(request: NextRequest) {
    const auth = await requireUserContext(request);
    if ('error' in auth) {
        return jsonError(auth.error.message, auth.error.status, { success: false });
    }

    const serviceClient = getSystemAdminClient();
    const { data, error } = await serviceClient
        .from('daliuren_divinations')
        .select('id, question, solar_date, day_ganzhi, hour_ganzhi, result_data, settings, conversation_id, created_at')
        .eq('user_id', auth.user.id)
        .order('created_at', { ascending: false })
        .limit(50);

    if (error) {
        console.error('[daliuren] 获取历史记录失败:', error.message);
        return jsonError('获取历史记录失败', 500, { success: false });
    }

    return jsonOk({ success: true, data: { history: data || [] } });
}

export async function DELETE(request: NextRequest) {
    const auth = await requireUserContext(request);
    if ('error' in auth) {
        return jsonError(auth.error.message, auth.error.status, { success: false });
    }

    const id = new URL(request.url).searchParams.get('id');
    if (!id) {
        return jsonError('缺少记录 ID', 400, { success: false });
    }

    const serviceClient = getSystemAdminClient();
    const { error } = await serviceClient
        .from('daliuren_divinations')
        .delete()
        .eq('id', id)
        .eq('user_id', auth.user.id);

    if (error) {
        console.error('[daliuren] 删除历史记录失败:', error.message);
        return jsonError('删除历史记录失败', 500, { success: false });
    }

    return jsonOk({ success: true });
}

export async function POST(request: NextRequest) {
    try {
        const body: DaliurenRequest = await request.json();
        const { action } = body;

        switch (action) {
            case 'calculate': {
                const { date, hour, minute, question, birthYear, gender } = body;
                if (!date || hour == null) {
                    return jsonError('请提供日期和时辰', 400, { success: false });
                }
                const result = handleDaliurenCalculate({
                    date, hour, minute, question, birthYear, gender,
                });
                return jsonOk({ success: true, data: result });
            }

            case 'save': {
                const authResult = await requireBearerUser(request);
                if ('error' in authResult) {
                    return jsonError(authResult.error.message, authResult.error.status, { success: false });
                }
                const { user } = authResult;
                const { date, hour, minute, question, resultData } = body;

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
                        settings: { hour, minute },
                    })
                    .select('id')
                    .single();

                if (insertError) {
                    console.error('[daliuren] 保存排盘记录失败:', insertError.message);
                    return jsonError('保存记录失败', 500, { success: false });
                }

                return jsonOk({ success: true, data: { divinationId: inserted?.id } });
            }

            case 'interpret': {
                const { resultData, question, divinationId, modelId, reasoning } = body;
                if (!resultData) {
                    return jsonError('请提供排盘数据', 400, { success: false });
                }

                const authResult = await requireBearerUser(request);
                if ('error' in authResult) {
                    return jsonError(authResult.error.message, authResult.error.status, { success: false });
                }
                const { user } = authResult;

                const authInfo = await getUserAuthInfo(user.id);
                if (!authInfo || !authInfo.hasCredits) {
                    return jsonError('积分不足，请充值后使用', 403, { success: false });
                }

                const membershipType = authInfo.effectiveMembership;
                const access = await resolveModelAccessAsync(modelId, DEFAULT_MODEL_ID, membershipType, reasoning);
                if ('error' in access) {
                    return jsonError(access.error, access.status, { success: false });
                }
                const { modelId: resolvedModelId } = access;

                const remainingCredits = await useCredit(user.id);
                if (remainingCredits === null) {
                    return jsonError('积分扣减失败，请稍后重试', 500, { success: false });
                }

                const serviceClient = getSystemAdminClient();

                async function persistDaliurenResult(interpretation: string) {
                    const { createAIAnalysisConversation } = await import('@/lib/ai/ai-analysis');
                    const title = `大六壬 · ${resultData!.keName}`;
                    const conversationId = await createAIAnalysisConversation({
                        userId: user.id,
                        sourceType: 'daliuren',
                        sourceData: {
                            ke_name: resultData!.keName,
                            day_ganzhi: resultData!.dateInfo.ganZhi.day,
                            hour_ganzhi: resultData!.dateInfo.ganZhi.hour,
                            yue_jiang: resultData!.dateInfo.yueJiang,
                            question: question || null,
                            model_id: resolvedModelId,
                        },
                        title,
                        aiResponse: interpretation,
                    });
                    if (divinationId && conversationId) {
                        await serviceClient
                            .from('daliuren_divinations')
                            .update({ conversation_id: conversationId })
                            .eq('id', divinationId)
                            .eq('user_id', user.id);
                    }
                }

                try {
                    const userPrompt = buildDaliurenPrompt(resultData, question);
                    const streamBody = await callAIStream(
                        [{ role: 'user', content: userPrompt }],
                        'general',
                        '',
                        resolvedModelId,
                        { reasoning: false, systemPromptOverride: DALIUREN_SYSTEM_PROMPT }
                    );
                    const [clientStream, tapStream] = streamBody.tee();

                    void (async () => {
                        try {
                            const { content: interpretation } = await readAIStream(tapStream);
                            await persistDaliurenResult(interpretation);
                        } catch (err) {
                            console.error('[daliuren] 流式结果保存失败:', err);
                        }
                    })();

                    return new Response(clientStream, {
                        headers: {
                            'Content-Type': 'text/event-stream',
                            'Cache-Control': 'no-cache',
                            'Connection': 'keep-alive',
                        },
                    });
                } catch (aiError) {
                    await addCredits(user.id, 1);
                    console.error('[daliuren] AI 解读失败:', aiError);
                    return jsonError('AI 解读失败，请稍后重试', 500, { success: false });
                }
            }

            case 'history': {
                const authResult = await requireBearerUser(request);
                if ('error' in authResult) {
                    return jsonError(authResult.error.message, authResult.error.status, { success: false });
                }
                const { user } = authResult;

                const serviceClient = getSystemAdminClient();
                const { data: history, error: historyError } = await serviceClient
                    .from('daliuren_divinations')
                    .select('id, question, solar_date, day_ganzhi, hour_ganzhi, yue_jiang, conversation_id, created_at')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(20);

                if (historyError) {
                    return jsonError('获取历史记录失败', 500, { success: false });
                }

                return jsonOk({ success: true, data: { history } });
            }

            default:
                return jsonError(`未知操作: ${action}`, 400, { success: false });
        }
    } catch (error) {
        console.error('[daliuren] 路由错误:', error);
        return jsonError('服务器内部错误', 500, { success: false });
    }
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
