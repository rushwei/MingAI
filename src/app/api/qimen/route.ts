/**
 * 奇门遁甲 API 路由
 *
 * action: 'calculate' — 排盘计算
 * action: 'analyze'  — AI 解读（流式）
 * action: 'save'     — 保存记录
 */
import { NextRequest } from 'next/server';
import { getSystemAdminClient, jsonError, jsonOk, requireBearerUser, requireUserContext } from '@/lib/api-utils';
import { useCredit, getUserAuthInfo, addCredits } from '@/lib/user/credits';
import { callAIStream, readAIStream } from '@/lib/ai/ai';
import { DEFAULT_MODEL_ID } from '@/lib/ai/ai-config';
import { resolveModelAccessAsync } from '@/lib/ai/ai-access';
import { handleQimenCalculate, type QimenOutput } from '@/lib/divination/qimen';

interface QimenRequest {
    action: 'calculate' | 'analyze' | 'save';
    // calculate params
    year?: number;
    month?: number;
    day?: number;
    hour?: number;
    minute?: number;
    question?: string;
    panType?: 'zhuan' | 'fei';
    juMethod?: 'chaibu' | 'maoshan';
    zhiFuJiGong?: 'jiLiuYi' | 'jiWuGong';
    // analyze params
    chartData?: QimenOutput;
    modelId?: string;
    reasoning?: boolean;
    stream?: boolean;
    // save params
    chartId?: string;
}

export async function GET(request: NextRequest) {
    const auth = await requireUserContext(request);
    if ('error' in auth) {
        return jsonError(auth.error.message, auth.error.status, { success: false });
    }

    const serviceClient = getSystemAdminClient();
    const { data, error } = await serviceClient
        .from('qimen_charts')
        .select('*, conversation:conversations(source_data)')
        .eq('user_id', auth.user.id)
        .order('created_at', { ascending: false })
        .limit(50);

    if (error) {
        console.error('[qimen] 加载历史记录失败:', error.message);
        return jsonError('加载历史记录失败', 500, { success: false });
    }

    return jsonOk({ success: true, data: { charts: data || [] } });
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
    const { data: existing, error: fetchError } = await serviceClient
        .from('qimen_charts')
        .select('conversation_id')
        .eq('id', id)
        .eq('user_id', auth.user.id)
        .maybeSingle();

    if (fetchError) {
        console.error('[qimen] 查询历史记录失败:', fetchError.message);
        return jsonError('删除历史记录失败', 500, { success: false });
    }
    if (!existing) {
        return jsonError('记录不存在', 404, { success: false });
    }

    const { error } = await serviceClient
        .from('qimen_charts')
        .delete()
        .eq('id', id)
        .eq('user_id', auth.user.id);
    if (error) {
        console.error('[qimen] 删除排盘记录失败:', error.message);
        return jsonError('删除历史记录失败', 500, { success: false });
    }

    if (existing.conversation_id) {
        const { error: conversationError } = await serviceClient
            .from('conversations')
            .delete()
            .eq('id', existing.conversation_id)
            .eq('user_id', auth.user.id);
        if (conversationError) {
            console.error('[qimen] 删除关联会话失败:', conversationError.message);
        }
    }

    return jsonOk({ success: true });
}

export async function POST(request: NextRequest) {
    try {
        const body: QimenRequest = await request.json();
        const { action } = body;

        switch (action) {
            case 'calculate': {
                const { year, month, day, hour, minute, question, panType, juMethod, zhiFuJiGong } = body;
                if (!year || !month || !day || hour == null || minute == null) {
                    return jsonError('请提供完整的日期时间', 400, { success: false });
                }

                const authResult = await requireBearerUser(request);
                if ('error' in authResult) {
                    return jsonError(authResult.error.message, authResult.error.status, { success: false });
                }

                const result = await handleQimenCalculate({
                    year, month, day, hour, minute,
                    question,
                    panType: panType || 'zhuan',
                    juMethod: juMethod || 'chaibu',
                    zhiFuJiGong: zhiFuJiGong || 'jiLiuYi',
                });

                return jsonOk({ success: true, data: result });
            }

            case 'analyze': {
                const { chartData, question, modelId, reasoning, stream } = body;
                if (!chartData) {
                    return jsonError('请提供排盘数据', 400, { success: false });
                }

                const authResult = await requireBearerUser(request);
                if ('error' in authResult) {
                    return jsonError(authResult.error.message, authResult.error.status, { success: false });
                }
                const { user } = authResult;
                const chart = chartData;

                const authInfo = await getUserAuthInfo(user.id);
                if (!authInfo || !authInfo.hasCredits) {
                    return jsonError('积分不足，请充值后使用', 403, { success: false });
                }

                const membershipType = authInfo.effectiveMembership;
                const access = await resolveModelAccessAsync(modelId, DEFAULT_MODEL_ID, membershipType, reasoning);
                if ('error' in access) {
                    return jsonError(access.error, access.status, { success: false });
                }
                const { modelId: requestedModelId, reasoningEnabled } = access;

                const chartInfo = buildChartInfoText(chart);

                const systemPrompt = `你是一位精通奇门遁甲的资深易学大师，深谙《奇门遁甲统宗》《御定奇门宝鉴》之精髓。

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

                const userPrompt = `${question ? `【占事】${question}\n\n` : ''}${chartInfo}\n\n请根据以上奇门遁甲排盘信息，为求测者详细解读此局。`;

                const remainingCredits = await useCredit(user.id);
                if (remainingCredits === null) {
                    return jsonError('积分扣减失败，请稍后重试', 500, { success: false });
                }

                const serviceClient = getSystemAdminClient();

                async function persistQimenResult(interpretation: string, reasoningText: string | null) {
                    const { createAIAnalysisConversation } = await import('@/lib/ai/ai-analysis');
                    const title = question
                        ? `奇门遁甲 - ${question.slice(0, 20)}${question.length > 20 ? '...' : ''}`
                        : `奇门遁甲 - ${chart.dunType === 'yang' ? '阳遁' : '阴遁'}${chart.juNumber}局`;

                    const conversationId = await createAIAnalysisConversation({
                        userId: user.id,
                        sourceType: 'qimen',
                        sourceData: {
                            dun_type: chart.dunType,
                            ju_number: chart.juNumber,
                            pan_type_label: chart.panTypeLabel,
                            ju_method_label: chart.juMethodLabel,
                            four_pillars: chart.fourPillars,
                            question: question || null,
                            model_id: requestedModelId,
                            reasoning: reasoningEnabled,
                            reasoning_text: reasoningText || null,
                        },
                        title,
                        aiResponse: interpretation,
                    });

                    if (!conversationId) {
                        console.error('[qimen] 保存 AI 分析对话失败');
                    }

                    // 若排盘时已自动保存过（有 chartId），只更新 conversation_id
                    const existingChartId = body.chartId;
                    if (existingChartId) {
                        const { error: updateError } = await serviceClient
                            .from('qimen_charts')
                            .update({ conversation_id: conversationId })
                            .eq('id', existingChartId)
                            .eq('user_id', user.id);
                        if (updateError) {
                            console.error('[qimen] 更新排盘记录失败:', updateError.message);
                        }
                    } else {
                        const { error: insertError } = await serviceClient
                            .from('qimen_charts')
                            .insert({
                                user_id: user.id,
                                question: question || null,
                                chart_time: new Date().toISOString(),
                                chart_data: chart,
                                dun_type: chart.dunType,
                                ju_number: chart.juNumber,
                                pan_type: 'zhuan',
                                ju_method: chart.juMethodLabel === '茅山法' ? 'maoshan' : 'chaibu',
                                conversation_id: conversationId,
                            });
                        if (insertError) {
                            console.error('[qimen] 保存排盘记录失败:', insertError.message);
                        }
                    }

                    return conversationId;
                }

                try {
                    if (stream) {
                        const streamBody = await callAIStream(
                            [{ role: 'user', content: userPrompt }],
                            'general',
                            `\n\n${systemPrompt}\n\n`,
                            requestedModelId,
                            { reasoning: reasoningEnabled, temperature: 0.7 }
                        );
                        const [clientStream, tapStream] = streamBody.tee();

                        void (async () => {
                            try {
                                const { content: interpretation, reasoning: reasoningText } = await readAIStream(tapStream);
                                await persistQimenResult(interpretation, reasoningText ?? null);
                            } catch (streamError) {
                                console.error('[qimen] 流式结果保存失败:', streamError);
                            }
                        })();

                        return new Response(clientStream, {
                            headers: {
                                'Content-Type': 'text/event-stream',
                                'Cache-Control': 'no-cache',
                                'Connection': 'keep-alive',
                            },
                        });
                    }

                    const { callAIWithReasoning } = await import('@/lib/ai/ai');
                    const { content: interpretation, reasoning: reasoningText } = await callAIWithReasoning(
                        [{ role: 'user', content: userPrompt }],
                        'general',
                        requestedModelId,
                        `\n\n${systemPrompt}\n\n`,
                        { reasoning: reasoningEnabled, temperature: 0.7 }
                    );

                    const conversationId = await persistQimenResult(interpretation, reasoningText ?? null);
                    return jsonOk({ success: true, data: { interpretation, reasoning: reasoningText, conversationId } });
                } catch (aiError) {
                    await addCredits(user.id, 1);
                    console.error('[qimen] AI 解读失败:', aiError);
                    return jsonError('AI 解读失败，请稍后重试', 500, { success: false });
                }
            }

            case 'save': {
                const { chartData: saveChartData, question } = body;
                if (!saveChartData) {
                    return jsonError('请提供排盘数据', 400, { success: false });
                }
                const saveChart = saveChartData;

                const authResult = await requireBearerUser(request);
                if ('error' in authResult) {
                    return jsonError(authResult.error.message, authResult.error.status, { success: false });
                }
                const { user } = authResult;

                const serviceClient = getSystemAdminClient();
                const { data: inserted, error: insertError } = await serviceClient
                    .from('qimen_charts')
                    .insert({
                        user_id: user.id,
                        question: question || null,
                        chart_time: new Date().toISOString(),
                        chart_data: saveChart,
                        dun_type: saveChart.dunType,
                        ju_number: saveChart.juNumber,
                        pan_type: 'zhuan',
                        ju_method: saveChart.juMethodLabel === '茅山法' ? 'maoshan' : 'chaibu',
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
        return jsonError('服务器错误', 500, { success: false });
    }
}

/** 构建排盘信息文本供 AI 解读 */
function buildChartInfoText(chart: QimenOutput): string {
    const lines: string[] = [];

    lines.push('【排盘信息】');
    lines.push(`公历：${chart.solarDate}`);
    lines.push(`农历：${chart.lunarDate}`);
    lines.push(`四柱：${chart.fourPillars.year} ${chart.fourPillars.month} ${chart.fourPillars.day} ${chart.fourPillars.hour}`);
    lines.push(`旬首：${chart.xunShou}`);
    lines.push(`${chart.dunType === 'yang' ? '阳遁' : '阴遁'}${chart.juNumber}局`);
    lines.push(`${chart.panTypeLabel} - ${chart.juMethodLabel}`);
    lines.push(`节气：${chart.solarTermRange}`);
    lines.push(`值符：${chart.zhiFu}  值使：${chart.zhiShi}`);
    lines.push('');

    lines.push('【九宫排盘】');
    for (const p of chart.palaces) {
        if (p.palaceNumber === 5) {
            lines.push(`${p.palaceName}（中宫）`);
            continue;
        }
        const markers: string[] = [];
        if (p.isEmpty) markers.push('空亡');
        if (p.isHorseStar) markers.push('驿马');
        const markerStr = markers.length > 0 ? ` [${markers.join(',')}]` : '';
        const patternStr = p.patterns.length > 0 ? ` 格局：${p.patterns.join('、')}` : '';
        lines.push(
            `${p.palaceName}：地盘${p.earthStem} 天盘${p.heavenStem} ${p.star} ${p.gate} ${p.god}${p.hiddenStem ? ` 暗干${p.hiddenStem}` : ''}${patternStr}${markerStr}`
        );
    }

    lines.push('');
    lines.push('【月令旺衰】');
    const phaseGroups: Record<string, string[]> = {};
    for (const [stem, phase] of Object.entries(chart.monthPhase)) {
        if (!phaseGroups[phase]) phaseGroups[phase] = [];
        phaseGroups[phase].push(stem);
    }
    for (const [phase, stems] of Object.entries(phaseGroups)) {
        lines.push(`${phase}：${stems.join('、')}`);
    }

    return lines.join('\n');
}
