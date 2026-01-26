/**
 * 塔罗牌 API 路由
 * 
 * 提供抽牌、每日一牌、牌阵解读等功能
 */
import { NextRequest, NextResponse } from 'next/server';
import { drawCards, drawForSpread, getDailyCard, TAROT_CARDS, TAROT_SPREADS, type DrawnCard, type TarotSpread } from '@/lib/tarot';
import { getServiceRoleClient } from '@/lib/api-utils';
import { useCredit, hasCredits, addCredits } from '@/lib/credits';
import { callAIWithReasoning } from '@/lib/ai';
import { DEFAULT_MODEL_ID } from '@/lib/ai-config';
import { getEffectiveMembershipType } from '@/lib/membership-server';
import { resolveModelAccess } from '@/lib/ai-access';
import { getAuthContext, requireBearerUser } from '@/lib/api-utils';

// 请求类型
interface TarotRequest {
    action: 'draw' | 'daily' | 'spread' | 'draw-only' | 'save' | 'interpret' | 'list-spreads' | 'list-cards';
    spreadId?: string;
    count?: number;
    question?: string;
    cards?: DrawnCard[];
    allowReversed?: boolean;
    readingId?: string; // 已保存的抽牌记录 ID，用于关联 AI 解读
    modelId?: string;
    reasoning?: boolean;
}

// 响应类型
interface TarotResponse {
    success: boolean;
    data?: {
        cards?: DrawnCard[];
        spread?: TarotSpread;
        spreads?: TarotSpread[];
        allCards?: typeof TAROT_CARDS;
        interpretation?: string;
        reasoning?: string;
        dailyCard?: DrawnCard;
        readingId?: string | null;
        conversationId?: string | null;
    };
    error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<TarotResponse>> {
    try {
        const body: TarotRequest = await request.json();
        const { action, spreadId, count = 1, question, cards, allowReversed = true, readingId, modelId, reasoning } = body;

        switch (action) {
            // 获取所有牌阵列表
            case 'list-spreads':
                return NextResponse.json({
                    success: true,
                    data: { spreads: TAROT_SPREADS }
                });

            // 获取所有塔罗牌列表
            case 'list-cards':
                return NextResponse.json({
                    success: true,
                    data: { allCards: TAROT_CARDS }
                });

            // 随机抽牌
            case 'draw':
                const drawnCards = drawCards(Math.min(count, 10), allowReversed);
                return NextResponse.json({
                    success: true,
                    data: { cards: drawnCards }
                });

            // 每日一牌
            case 'daily':
                const dailyCard = getDailyCard();
                return NextResponse.json({
                    success: true,
                    data: { dailyCard }
                });

            // 按牌阵抽牌
            case 'spread': {
                if (!spreadId) {
                    return NextResponse.json({
                        success: false,
                        error: '请指定牌阵ID'
                    }, { status: 400 });
                }
                const spreadResult = drawForSpread(spreadId, allowReversed);
                if (!spreadResult) {
                    return NextResponse.json({
                        success: false,
                        error: '未找到指定牌阵'
                    }, { status: 404 });
                }

                // 如果用户已登录，保存抽牌记录
                let readingId: string | null = null;
                const spreadAuthHeader = request.headers.get('authorization');
                if (spreadAuthHeader) {
                    const { user: spreadUser } = await getAuthContext(request);
                    if (spreadUser) {
            const serviceClient = getServiceRoleClient();
                        const { data: insertedReading, error: insertError } = await serviceClient
                            .from('tarot_readings')
                            .insert({
                                user_id: spreadUser.id,
                                spread_id: spreadId,
                                question: question || null,
                                cards: spreadResult.cards,
                            })
                            .select('id')
                            .single();

                        if (insertError) {
                            console.error('[tarot] 保存抽牌记录失败:', insertError.message);
                        } else {
                            readingId = insertedReading?.id;
                        }
                    }
                }

                return NextResponse.json({
                    success: true,
                    data: {
                        spread: spreadResult.spread,
                        cards: spreadResult.cards,
                        readingId,
                    }
                });
            }

            case 'draw-only': {
                if (!spreadId) {
                    return NextResponse.json({
                        success: false,
                        error: '请指定牌阵ID'
                    }, { status: 400 });
                }
                const spreadResult = drawForSpread(spreadId, allowReversed);
                if (!spreadResult) {
                    return NextResponse.json({
                        success: false,
                        error: '未找到指定牌阵'
                    }, { status: 404 });
                }
                return NextResponse.json({
                    success: true,
                    data: {
                        spread: spreadResult.spread,
                        cards: spreadResult.cards,
                    }
                });
            }

            case 'save': {
                if (!spreadId || !cards || cards.length === 0) {
                    return NextResponse.json({
                        success: false,
                        error: '请提供牌阵与抽牌结果'
                    }, { status: 400 });
                }

                const authResult = await requireBearerUser(request);
                if ('error' in authResult) {
                    return NextResponse.json({
                        success: false,
                        error: authResult.error.message
                    }, { status: authResult.error.status });
                }
                const { user: saveUser } = authResult;

            const serviceClient = getServiceRoleClient();
                const { data: insertedReading, error: insertError } = await serviceClient
                    .from('tarot_readings')
                    .insert({
                        user_id: saveUser.id,
                        spread_id: spreadId,
                        question: question || null,
                        cards,
                    })
                    .select('id')
                    .single();

                if (insertError) {
                    console.error('[tarot] 保存抽牌记录失败:', insertError.message);
                    return NextResponse.json({
                        success: false,
                        error: '保存记录失败'
                    }, { status: 500 });
                }

                return NextResponse.json({
                    success: true,
                    data: { readingId: insertedReading?.id || null }
                });
            }

            // AI 解读塔罗牌
            case 'interpret':
                if (!cards || cards.length === 0) {
                    return NextResponse.json({
                        success: false,
                        error: '请提供要解读的塔罗牌'
                    }, { status: 400 });
                }

                // 检查用户认证
                const authResult = await requireBearerUser(request);
                if ('error' in authResult) {
                    return NextResponse.json({
                        success: false,
                        error: authResult.error.message
                    }, { status: authResult.error.status });
                }
                const { user } = authResult;

                // 检查用户积分（使用服务端客户端绕过 RLS）
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

                // 构建牌面描述，作为用户提示词主体
                const cardsDescription = cards.map((c, i) => {
                    const pos = c.position ? `【${c.position}】` : `【第${i + 1}张】`;
                    const orientation = c.orientation === 'reversed' ? '（逆位）' : '（正位）';
                    return `${pos} ${c.card.nameChinese}${orientation}
- 关键词：${c.card.keywords.join('、')}
- 含义：${c.orientation === 'reversed' ? c.card.reversedMeaning : c.card.uprightMeaning}`;
                }).join('\n\n');

                // 塔罗系统提示词：约束解读深度、语气与字数
                const systemPrompt = `你是一位专业的塔罗牌解读师，精通韦特塔罗牌体系。请根据提供的塔罗牌信息，给出深入、有洞察力的解读。

解读要求：
1. 结合每张牌的含义和位置进行综合分析
2. 注意牌之间的关联和互动
3. 给出具体可操作的建议
4. 语言温暖有同理心，避免过于负面的表述
5. 解读应该在 300-500 字之间`;

                // 用户提示词：包含用户问题与牌面信息
                const userPrompt = question
                    ? `问题：${question}\n\n抽到的塔罗牌：\n${cardsDescription}`
                    : `请解读以下塔罗牌：\n${cardsDescription}`;

                const remainingCredits = await useCredit(user.id);
                if (remainingCredits === null) {
                    console.error('[tarot] 扣除积分失败');
                    return NextResponse.json({
                        success: false,
                        error: '积分扣减失败，请稍后重试'
                    }, { status: 500 });
                }

                try {
                    // 用系统提示词 override 默认人格，保持解读模板一致
                    const { content: interpretation, reasoning: reasoningText } = await callAIWithReasoning(
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
                    const { createAIAnalysisConversation, generateTarotTitle } = await import('@/lib/ai-analysis');
                    const conversationId = await createAIAnalysisConversation({
                        userId: user.id,
                        sourceType: 'tarot',
                        sourceData: {
                            cards: cards,
                            spread_id: spreadId || 'custom',
                            question: question || null,
                            model_id: requestedModelId,
                            reasoning: reasoningEnabled,
                            reasoning_text: reasoningText || null,
                        },
                        title: generateTarotTitle(question, spreadId || 'custom'),
                        aiResponse: interpretation,
                    });

                    if (!conversationId) {
                        console.error('[tarot] 保存 AI 分析对话失败');
                    }

                    // 更新已有记录的 conversation_id，或插入新记录（兼容旧调用）
        const serviceClient = getServiceRoleClient();
                    if (readingId) {
                        // 更新已有记录
                        const { error: updateError } = await serviceClient
                            .from('tarot_readings')
                            .update({ conversation_id: conversationId })
                            .eq('id', readingId)
                            .eq('user_id', user.id);

                        if (updateError) {
                            console.error('[tarot] 更新抽牌记录失败:', updateError.message);
                        }
                    } else {
                        // 兼容旧调用：插入新记录
                        const { error: insertError } = await serviceClient
                            .from('tarot_readings')
                            .insert({
                                user_id: user.id,
                                spread_id: spreadId || 'custom',
                                question: question || null,
                                cards: cards,
                                conversation_id: conversationId,
                            });

                        if (insertError) {
                            console.error('[tarot] 保存抽牌记录失败:', insertError.message);
                        }
                    }

                    return NextResponse.json({
                        success: true,
                        data: { interpretation, reasoning: reasoningText, cards, conversationId }
                    });

                } catch (aiError) {
                    await addCredits(user.id, 1);
                    console.error('AI 解读失败:', aiError);
                    return NextResponse.json({
                        success: false,
                        error: 'AI 解读失败，请稍后重试'
                    }, { status: 500 });
                }

            default:
                return NextResponse.json({
                    success: false,
                    error: '未知的操作类型'
                }, { status: 400 });
        }
    } catch (error) {
        console.error('塔罗牌 API 错误:', error);
        return NextResponse.json({
            success: false,
            error: '服务器错误'
        }, { status: 500 });
    }
}

// GET 方法 - 支持简单查询
export async function GET(request: NextRequest): Promise<NextResponse<TarotResponse>> {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'daily';

    switch (action) {
        case 'daily':
            const dailyCard = getDailyCard();
            return NextResponse.json({
                success: true,
                data: { dailyCard }
            });

        case 'spreads':
            return NextResponse.json({
                success: true,
                data: { spreads: TAROT_SPREADS }
            });

        case 'cards':
            return NextResponse.json({
                success: true,
                data: { allCards: TAROT_CARDS }
            });

        default:
            return NextResponse.json({
                success: false,
                error: '使用 POST 方法进行抽牌和解读操作'
            }, { status: 400 });
    }
}
