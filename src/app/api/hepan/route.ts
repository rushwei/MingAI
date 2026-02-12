/**
 * 关系合盘 API 路由
 */
import { NextRequest } from 'next/server';
import { getServiceRoleClient, jsonError, jsonOk, requireBearerUser } from '@/lib/api-utils';
import { useCredit, hasCredits, addCredits } from '@/lib/user/credits';
import { type HepanResult, getHepanTypeName } from '@/lib/divination/hepan';
import { callAIWithReasoning, callAIStream, readAIStream } from '@/lib/ai/ai';
import { DEFAULT_MODEL_ID } from '@/lib/ai/ai-config';
import { getEffectiveMembershipType } from '@/lib/user/membership-server';
import { resolveModelAccessAsync } from '@/lib/ai/ai-access';

interface HepanRequest {
    action: 'analyze' | 'save' | 'list';
    result?: HepanResult;
    chartId?: string; // 已保存的合盘记录 ID，用于关联 AI 分析（analyze 时更新）
    modelId?: string;
    reasoning?: boolean;
    stream?: boolean;  // 是否使用流式输出
}

export async function POST(request: NextRequest) {
    try {
        const body: HepanRequest = await request.json();
        const { action, result, chartId, modelId, reasoning, stream } = body;

        if (action === 'save') {
            // 保存合盘记录（不含 AI 分析）
            if (!result) {
                return jsonError('请提供合盘结果', 400, { success: false });
            }

            const authResult = await requireBearerUser(request);
            if ('error' in authResult) {
                return jsonError(authResult.error.message, authResult.error.status, { success: false });
            }
            const { user } = authResult;

            const serviceClient = getServiceRoleClient();
            const { data: insertedChart, error: insertError } = await serviceClient
                .from('hepan_charts')
                .insert({
                    user_id: user.id,
                    type: result.type,
                    person1_name: result.person1.name,
                    person1_birth: {
                        year: result.person1.year,
                        month: result.person1.month,
                        day: result.person1.day,
                        hour: result.person1.hour,
                    },
                    person2_name: result.person2.name,
                    person2_birth: {
                        year: result.person2.year,
                        month: result.person2.month,
                        day: result.person2.day,
                        hour: result.person2.hour,
                    },
                    compatibility_score: result.overallScore,
                    result_data: result,
                })
                .select('id')
                .single();

            if (insertError) {
                console.error('[hepan] 保存合盘记录失败:', insertError.message);
                return jsonError('保存记录失败', 500, { success: false });
            }

            return jsonOk({
                success: true,
                data: { chartId: insertedChart?.id }
            });
        }

        if (action === 'analyze') {
            if (!result) {
                return jsonError('请提供合盘结果', 400, { success: false });
            }

            // 验证用户身份
            const authResult = await requireBearerUser(request);
            if ('error' in authResult) {
                return jsonError(authResult.error.message, authResult.error.status, { success: false });
            }
            const { user } = authResult;

            // 检查积分
            const hasEnoughCredits = await hasCredits(user.id);
            if (!hasEnoughCredits) {
                return jsonError('积分不足，请充值后使用', 403, { success: false });
            }

            const membershipType = await getEffectiveMembershipType(user.id);
            const access = await resolveModelAccessAsync(modelId, DEFAULT_MODEL_ID, membershipType, reasoning);
            if ('error' in access) {
                return jsonError(access.error, access.status, { success: false });
            }
            const { modelId: requestedModelId, reasoningEnabled } = access;

            const typeName = getHepanTypeName(result.type);
            const dimensionsSummary = result.dimensions
                .map(d => `${d.name}: ${d.score}分 - ${d.description}`)
                .join('\n');
            const conflictsSummary = result.conflicts.length > 0
                ? result.conflicts.map(c => `[${c.severity}] ${c.title}: ${c.description}`).join('\n')
                : '无明显冲突';

            // 合盘系统提示词：定义分析结构与语气
            const systemPrompt = `你是一位资深的命理学家和关系咨询师，精通八字合盘分析。
请根据提供的合盘分析结果，给出专业、实用的深度解读和相处建议。

分析应包括：
1. 对整体契合度的解读
2. 双方相处的优势分析
3. 需要注意的问题和化解方法
4. 针对具体关系类型的实用建议
5. 未来发展展望

语言应温和、建设性，避免过于绝对的论断。
字数控制在 600-800 字。`;

            // 用户提示词：注入合盘结果与冲突点，避免系统规则混入
            const userPrompt = `合盘类型：${typeName}

双方信息：
- ${result.person1.name}：${result.person1.year}年${result.person1.month}月${result.person1.day}日
- ${result.person2.name}：${result.person2.year}年${result.person2.month}月${result.person2.day}日

综合契合度：${result.overallScore}分

各维度分析：
${dimensionsSummary}

潜在冲突点：
${conflictsSummary}

请为这对关系提供深度分析和相处建议。`;

            const remainingCredits = await useCredit(user.id);
            if (remainingCredits === null) {
                console.error('[hepan] 扣除积分失败');
                return jsonError('积分扣减失败，请稍后重试', 500, { success: false });
            }

            try {
                // 流式输出模式
                if (stream) {
                    const streamBody = await callAIStream(
                        [{ role: 'user', content: userPrompt }],
                        'general',
                        `\n\n${systemPrompt}\n\n`,
                        requestedModelId,
                        {
                            reasoning: reasoningEnabled,
                            temperature: 0.7,
                        }
                    );
                    const [clientStream, tapStream] = streamBody.tee();

                    // 异步持久化流式结果
                    void (async () => {
                        try {
                            const { content: analysis, reasoning: reasoningText } = await readAIStream(tapStream);
                            const { createAIAnalysisConversation, generateHepanTitle } = await import('@/lib/ai/ai-analysis');
                            const conversationId = await createAIAnalysisConversation({
                                userId: user.id,
                                sourceType: 'hepan',
                                sourceData: {
                                    type: result.type,
                                    person1_name: result.person1.name,
                                    person1_birth: result.person1,
                                    person2_name: result.person2.name,
                                    person2_birth: result.person2,
                                    compatibility_score: result.overallScore,
                                    dimensions: result.dimensions,
                                    conflicts: result.conflicts,
                                    model_id: requestedModelId,
                                    reasoning: reasoningEnabled,
                                    reasoning_text: reasoningText || null,
                                },
                                title: generateHepanTitle(result.person1.name, result.person2.name, result.type),
                                aiResponse: analysis,
                            });

                            if (!conversationId) {
                                console.error('[hepan] 保存 AI 分析对话失败');
                            }

                            const serviceClient = getServiceRoleClient();
                            if (chartId) {
                                const { error: updateError } = await serviceClient
                                    .from('hepan_charts')
                                    .update({ conversation_id: conversationId })
                                    .eq('id', chartId)
                                    .eq('user_id', user.id);

                                if (updateError) {
                                    console.error('[hepan] 更新合盘记录失败:', updateError.message);
                                }
                            } else {
                                const { error: insertError } = await serviceClient
                                    .from('hepan_charts')
                                    .insert({
                                        user_id: user.id,
                                        type: result.type,
                                        person1_name: result.person1.name,
                                        person1_birth: {
                                            year: result.person1.year,
                                            month: result.person1.month,
                                            day: result.person1.day,
                                            hour: result.person1.hour,
                                        },
                                        person2_name: result.person2.name,
                                        person2_birth: {
                                            year: result.person2.year,
                                            month: result.person2.month,
                                            day: result.person2.day,
                                            hour: result.person2.hour,
                                        },
                                        compatibility_score: result.overallScore,
                                        conversation_id: conversationId,
                                        result_data: result,
                                    });

                                if (insertError) {
                                    console.error('[hepan] 保存合盘记录失败:', insertError.message, insertError.details);
                                }
                            }
                        } catch (streamError) {
                            console.error('[hepan] 流式结果保存失败:', streamError);
                        }
                    })();

                    // 返回 SSE 格式响应
                    return new Response(clientStream, {
                        headers: {
                            'Content-Type': 'text/event-stream',
                            'Cache-Control': 'no-cache',
                            'Connection': 'keep-alive',
                        },
                    });
                }

                // 非流式模式：覆盖默认人格提示词，保证合盘输出结构稳定
                const { content: analysis, reasoning: reasoningText } = await callAIWithReasoning(
                    [{ role: 'user', content: userPrompt }],
                    'general',
                    requestedModelId,
                    `\n\n${systemPrompt}\n\n`,
                    {
                        reasoning: reasoningEnabled,
                        temperature: 0.7,
                    }
                );

                // 保存 AI 分析到 conversations 表
                const { createAIAnalysisConversation, generateHepanTitle } = await import('@/lib/ai/ai-analysis');
                const conversationId = await createAIAnalysisConversation({
                    userId: user.id,
                    sourceType: 'hepan',
                    sourceData: {
                        type: result.type,
                        person1_name: result.person1.name,
                        person1_birth: result.person1,
                        person2_name: result.person2.name,
                        person2_birth: result.person2,
                        compatibility_score: result.overallScore,
                        dimensions: result.dimensions,
                        conflicts: result.conflicts,
                        model_id: requestedModelId,
                        reasoning: reasoningEnabled,
                        reasoning_text: reasoningText || null,
                    },
                    title: generateHepanTitle(result.person1.name, result.person2.name, result.type),
                    aiResponse: analysis,
                });

                if (!conversationId) {
                    console.error('[hepan] 保存 AI 分析对话失败');
                }

                // 更新已有记录的 conversation_id，或插入新记录（兼容旧调用）
                const serviceClient = getServiceRoleClient();
                if (chartId) {
                    // 更新已有记录
                    const { error: updateError } = await serviceClient
                        .from('hepan_charts')
                        .update({ conversation_id: conversationId })
                        .eq('id', chartId)
                        .eq('user_id', user.id);

                    if (updateError) {
                        console.error('[hepan] 更新合盘记录失败:', updateError.message);
                    }
                } else {
                    // 兼容旧调用：插入新记录
                    const { error: insertError } = await serviceClient
                        .from('hepan_charts')
                        .insert({
                            user_id: user.id,
                            type: result.type,
                            person1_name: result.person1.name,
                            person1_birth: {
                                year: result.person1.year,
                                month: result.person1.month,
                                day: result.person1.day,
                                hour: result.person1.hour,
                            },
                            person2_name: result.person2.name,
                            person2_birth: {
                                year: result.person2.year,
                                month: result.person2.month,
                                day: result.person2.day,
                                hour: result.person2.hour,
                            },
                            compatibility_score: result.overallScore,
                            conversation_id: conversationId,
                            result_data: result,
                        });

                    if (insertError) {
                        console.error('[hepan] 保存合盘记录失败:', insertError.message, insertError.details);
                    }
                }

                return jsonOk({
                    success: true,
                    data: { analysis, reasoning: reasoningText, conversationId }
                });

            } catch (aiError) {
                await addCredits(user.id, 1);
                console.error('[hepan] AI 分析失败:', aiError);
                return jsonError('AI 分析失败，请稍后重试', 500, { success: false });
            }
        }

        if (action === 'list') {
            const authResult = await requireBearerUser(request);
            if ('error' in authResult) {
                return jsonError(authResult.error.message, authResult.error.status, { success: false });
            }
            const { user } = authResult;

            const serviceClient = getServiceRoleClient();
            const { data: charts, error: listError } = await serviceClient
                .from('hepan_charts')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(20);

            if (listError) {
                return jsonError('获取历史记录失败', 500, { success: false });
            }

            return jsonOk({
                success: true,
                data: { charts }
            });
        }

        return jsonError('未知操作', 400, { success: false });

    } catch (error) {
        console.error('[hepan] API 错误:', error);
        return jsonError('服务器错误', 500, { success: false });
    }
}
