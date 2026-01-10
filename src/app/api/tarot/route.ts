/**
 * 塔罗牌 API 路由
 * 
 * 提供抽牌、每日一牌、牌阵解读等功能
 */
import { NextRequest, NextResponse } from 'next/server';
import { drawCards, drawForSpread, getDailyCard, TAROT_CARDS, TAROT_SPREADS, type DrawnCard, type TarotSpread } from '@/lib/tarot';
import { supabase } from '@/lib/supabase';
import { getServiceClient } from '@/lib/supabase-server';
import { useCredit, hasCredits } from '@/lib/credits';

// 请求类型
interface TarotRequest {
    action: 'draw' | 'daily' | 'spread' | 'interpret' | 'list-spreads' | 'list-cards';
    spreadId?: string;
    count?: number;
    question?: string;
    cards?: DrawnCard[];
    allowReversed?: boolean;
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
        dailyCard?: DrawnCard;
    };
    error?: string;
}

// 调用 DeepSeek AI
async function callDeepSeekAI(systemPrompt: string, userPrompt: string): Promise<string> {
    const aiApiUrl = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1/chat/completions';
    const apiKey = process.env.DEEPSEEK_API_KEY;

    if (!apiKey) {
        throw new Error('DeepSeek API key not configured');
    }

    const response = await fetch(aiApiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.7,
            max_tokens: 1000,
        }),
    });

    if (!response.ok) {
        throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '解读生成失败';
}

export async function POST(request: NextRequest): Promise<NextResponse<TarotResponse>> {
    try {
        const body: TarotRequest = await request.json();
        const { action, spreadId, count = 1, question, cards, allowReversed = true } = body;

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
            case 'spread':
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
                        cards: spreadResult.cards
                    }
                });

            // AI 解读塔罗牌
            case 'interpret':
                if (!cards || cards.length === 0) {
                    return NextResponse.json({
                        success: false,
                        error: '请提供要解读的塔罗牌'
                    }, { status: 400 });
                }

                // 检查用户认证
                const authHeader = request.headers.get('authorization');
                if (!authHeader) {
                    return NextResponse.json({
                        success: false,
                        error: '请先登录'
                    }, { status: 401 });
                }

                const token = authHeader.replace('Bearer ', '');
                const { data: { user }, error: authError } = await supabase.auth.getUser(token);

                if (authError || !user) {
                    return NextResponse.json({
                        success: false,
                        error: '认证失败'
                    }, { status: 401 });
                }

                // 检查用户积分（使用服务端客户端绕过 RLS）
                const hasEnoughCredits = await hasCredits(user.id);
                if (!hasEnoughCredits) {
                    return NextResponse.json({
                        success: false,
                        error: '积分不足，请充值后使用'
                    }, { status: 403 });
                }

                // 构建解读 prompt
                const cardsDescription = cards.map((c, i) => {
                    const pos = c.position ? `【${c.position}】` : `【第${i + 1}张】`;
                    const orientation = c.orientation === 'reversed' ? '（逆位）' : '（正位）';
                    return `${pos} ${c.card.nameChinese}${orientation}
- 关键词：${c.card.keywords.join('、')}
- 含义：${c.orientation === 'reversed' ? c.card.reversedMeaning : c.card.uprightMeaning}`;
                }).join('\n\n');

                const systemPrompt = `你是一位专业的塔罗牌解读师，精通韦特塔罗牌体系。请根据提供的塔罗牌信息，给出深入、有洞察力的解读。

解读要求：
1. 结合每张牌的含义和位置进行综合分析
2. 注意牌之间的关联和互动
3. 给出具体可操作的建议
4. 语言温暖有同理心，避免过于负面的表述
5. 解读应该在 300-500 字之间`;

                const userPrompt = question
                    ? `问题：${question}\n\n抽到的塔罗牌：\n${cardsDescription}`
                    : `请解读以下塔罗牌：\n${cardsDescription}`;

                try {
                    const interpretation = await callDeepSeekAI(systemPrompt, userPrompt);

                    // 扣除积分（使用服务端客户端绕过 RLS）
                    const remainingCredits = await useCredit(user.id);
                    if (remainingCredits === null) {
                        console.error('[tarot] 扣除积分失败');
                    }

                    // 保存历史记录（使用服务端客户端绕过 RLS）
                    const serviceClient = getServiceClient();
                    const { error: insertError } = await serviceClient
                        .from('tarot_readings')
                        .insert({
                            user_id: user.id,
                            spread_type: spreadId || 'custom',
                            question: question || null,
                            cards: cards,
                            ai_interpretation: interpretation,
                        });

                    if (insertError) {
                        console.error('[tarot] 保存历史记录失败:', insertError.message);
                    }

                    return NextResponse.json({
                        success: true,
                        data: { interpretation, cards }
                    });

                } catch (aiError) {
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
