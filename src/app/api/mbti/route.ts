/**
 * MBTI 性格测试 API 路由
 * 
 * 提供 AI 性格分析功能
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/api-utils';
import { useCredit, hasCredits, addCredits } from '@/lib/credits';
import { type MBTIType, PERSONALITY_BASICS } from '@/lib/mbti';
import { callAIWithReasoning } from '@/lib/ai';
import { DEFAULT_MODEL_ID } from '@/lib/ai-config';
import { getEffectiveMembershipType } from '@/lib/membership-server';
import { resolveModelAccess } from '@/lib/ai-access';
import { requireBearerUser } from '@/lib/api-utils';

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
    readingId?: string; // 已保存的测试记录 ID，用于关联 AI 分析
    modelId?: string;
    reasoning?: boolean;
}

export async function POST(request: NextRequest) {
    try {
        const body: MBTIRequest = await request.json();
        const { action, type, scores, percentages, readingId, modelId, reasoning } = body;

        // 保存测试记录（不含 AI 分析）
        if (action === 'save') {
            if (!type || !percentages) {
                return NextResponse.json({
                    success: false,
                    error: '请提供完整的测试结果'
                }, { status: 400 });
            }

            const authResult = await requireBearerUser(request);
            if ('error' in authResult) {
                return NextResponse.json({
                    success: false,
                    error: authResult.error.message
                }, { status: authResult.error.status });
            }
            const { user } = authResult;

            const serviceClient = getServiceRoleClient();
            const { data: insertedReading, error: insertError } = await serviceClient
                .from('mbti_readings')
                .insert({
                    user_id: user.id,
                    mbti_type: type,
                    scores,
                    percentages,
                })
                .select('id')
                .single();

            if (insertError) {
                console.error('[mbti] 保存测试记录失败:', insertError.message);
                return NextResponse.json({
                    success: false,
                    error: '保存记录失败'
                }, { status: 500 });
            }

            return NextResponse.json({
                success: true,
                data: { readingId: insertedReading?.id }
            });
        }

        // 获取历史记录
        if (action === 'history') {
            const authResult = await requireBearerUser(request);
            if ('error' in authResult) {
                return NextResponse.json({
                    success: false,
                    error: authResult.error.message
                }, { status: authResult.error.status });
            }
            const { user } = authResult;

            const serviceClient = getServiceRoleClient();
            const { data: history, error: historyError } = await serviceClient
                .from('mbti_readings')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(20);

            if (historyError) {
                return NextResponse.json({
                    success: false,
                    error: '获取历史记录失败'
                }, { status: 500 });
            }

            return NextResponse.json({
                success: true,
                data: { history }
            });
        }

        if (action !== 'analyze') {
            return NextResponse.json({
                success: false,
                error: '未知操作'
            }, { status: 400 });
        }

        if (!type || !percentages) {
            return NextResponse.json({
                success: false,
                error: '请提供完整的测试结果'
            }, { status: 400 });
        }

        // 验证用户身份
        const authResult = await requireBearerUser(request);
        if ('error' in authResult) {
            return NextResponse.json({
                success: false,
                error: authResult.error.message
            }, { status: authResult.error.status });
        }
        const { user } = authResult;

        // 检查积分
        const hasEnoughCredits = await hasCredits(user.id);
        if (!hasEnoughCredits) {
            return NextResponse.json({
                success: false,
                error: '积分不足，请充值后使用'
            }, { status: 403 });
        }

        const membershipType = await getEffectiveMembershipType(user.id);
        const access = resolveModelAccess(modelId, DEFAULT_MODEL_ID, membershipType, reasoning);
        if ('error' in access) {
            return NextResponse.json({
                success: false,
                error: access.error
            }, { status: access.status });
        }
        const { modelId: requestedModelId, reasoningEnabled } = access;

        const basic = PERSONALITY_BASICS[type];

        // MBTI 系统提示词：固定分析结构与语气
        const systemPrompt = `你是一位专业的心理学家和 MBTI 性格分析专家。
请根据用户的 MBTI 测试结果，提供个性化的深度分析和建议。

分析应包括：
1. 对该类型的深入解读
2. 结合维度百分比的个性化分析
3. 职业发展建议
4. 人际关系建议
5. 个人成长建议

语言应专业但易懂，具有鼓励性和建设性。
字数控制在 600-800 字。`;

        // 用户提示词：仅携带测试结果数据
        const userPrompt = `用户的 MBTI 测试结果：

性格类型：${type} - ${basic.title}
${basic.description}

维度分析：
- 外向(E) ${percentages.EI.E}% vs 内向(I) ${percentages.EI.I}%
- 实感(S) ${percentages.SN.S}% vs 直觉(N) ${percentages.SN.N}%
- 思考(T) ${percentages.TF.T}% vs 情感(F) ${percentages.TF.F}%
- 判断(J) ${percentages.JP.J}% vs 知觉(P) ${percentages.JP.P}%

请为这位用户提供个性化的深度分析。`;

        const remainingCredits = await useCredit(user.id);
        if (remainingCredits === null) {
            console.error('[mbti] 扣除积分失败');
            return NextResponse.json({
                success: false,
                error: '积分扣减失败，请稍后重试'
            }, { status: 500 });
        }

        try {
            // 覆盖默认人格提示词，确保 MBTI 解读模板稳定
            const { content: analysis, reasoning: reasoningText } = await callAIWithReasoning(
                [{ role: 'user', content: userPrompt }],
                'master',
                requestedModelId,
                `\n\n${systemPrompt}\n\n`,
                {
                    reasoning: reasoningEnabled,
                    temperature: 0.7,
                }
            );

            // 保存 AI 分析到 conversations 表
            const { createAIAnalysisConversation, generateMbtiTitle } = await import('@/lib/ai-analysis');
            const conversationId = await createAIAnalysisConversation({
                userId: user.id,
                sourceType: 'mbti',
                sourceData: {
                    mbti_type: type,
                    scores,
                    percentages,
                    model_id: requestedModelId,
                    reasoning: reasoningEnabled,
                    reasoning_text: reasoningText || null,
                },
                title: generateMbtiTitle(type),
                aiResponse: analysis,
            });

            if (!conversationId) {
                console.error('[mbti] 保存 AI 分析对话失败');
            }

            // 更新已有记录的 conversation_id，或插入新记录（兼容旧调用）
        const serviceClient = getServiceRoleClient();
            if (readingId) {
                // 更新已有记录
                const { error: updateError } = await serviceClient
                    .from('mbti_readings')
                    .update({ conversation_id: conversationId })
                    .eq('id', readingId)
                    .eq('user_id', user.id);

                if (updateError) {
                    console.error('[mbti] 更新测试记录失败:', updateError.message);
                }
            } else {
                // 兼容旧调用：插入新记录
                const { error: insertError } = await serviceClient
                    .from('mbti_readings')
                    .insert({
                        user_id: user.id,
                        mbti_type: type,
                        scores,
                        percentages,
                        conversation_id: conversationId,
                    });

                if (insertError) {
                    console.error('[mbti] 保存测试记录失败:', insertError.message, insertError.details);
                }
            }

            return NextResponse.json({
                success: true,
                data: { analysis, reasoning: reasoningText, conversationId }
            });

        } catch (error) {
            await addCredits(user.id, 1);
            console.error('[mbti] AI 分析失败:', error);
            return NextResponse.json({
                success: false,
                error: 'AI 分析失败，请稍后重试'
            }, { status: 500 });
        }

    } catch (error) {
        console.error('[mbti] API 错误:', error);
        return NextResponse.json({
            success: false,
            error: '服务器错误'
        }, { status: 500 });
    }
}
