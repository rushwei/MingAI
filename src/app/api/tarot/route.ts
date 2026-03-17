/**
 * 塔罗牌 API 路由
 *
 * 提供抽牌、每日一牌、牌阵解读等功能
 */
import { NextRequest, NextResponse } from 'next/server';
import { drawCards, drawForSpread, getDailyCard, TAROT_CARDS, TAROT_SPREADS, type DrawnCard, type TarotSpread } from '@/lib/divination/tarot';
import { getAuthContext, getSystemAdminClient, jsonError, jsonOk, requireBearerUser } from '@/lib/api-utils';
import { createInterpretHandler, type InterpretInput } from '@/lib/api/divination-pipeline';

interface TarotRequest {
    action: 'draw' | 'daily' | 'spread' | 'draw-only' | 'save' | 'interpret' | 'list-spreads' | 'list-cards';
    spreadId?: string;
    count?: number;
    question?: string;
    cards?: DrawnCard[];
    allowReversed?: boolean;
    timezone?: string;
    readingId?: string;
    modelId?: string;
    reasoning?: boolean;
    stream?: boolean;
}

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

// ─── Interpret pipeline config ───

interface TarotInterpretInput extends InterpretInput {
    cards: DrawnCard[];
    spreadId: string;
    question?: string;
    readingId?: string;
}

const handleInterpret = createInterpretHandler<TarotInterpretInput>({
    sourceType: 'tarot',
    tag: 'tarot',
    parseInput: (body) => {
        const b = body as TarotRequest;
        if (!b.cards || b.cards.length === 0) {
            return { error: '请提供要解读的塔罗牌', status: 400 };
        }
        return {
            cards: b.cards,
            spreadId: b.spreadId || 'custom',
            question: b.question,
            readingId: b.readingId,
        };
    },
    buildPrompts: (input) => {
        const cardsDescription = input.cards.map((c, i) => {
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

        const userPrompt = input.question
            ? `问题：${input.question}\n\n抽到的塔罗牌：\n${cardsDescription}`
            : `请解读以下塔罗牌：\n${cardsDescription}`;

        return { systemPrompt, userPrompt };
    },
    buildSourceData: (input, modelId, reasoningEnabled) => ({
        cards: input.cards,
        spread_id: input.spreadId,
        question: input.question || null,
        model_id: modelId,
        reasoning: reasoningEnabled,
    }),
    generateTitle: (input) => {
        const SPREAD_NAMES: Record<string, string> = {
            single: '单牌', 'three-card': '三牌阵', love: '爱情牌阵', 'celtic-cross': '凯尔特十字',
        };
        const spreadName = SPREAD_NAMES[input.spreadId] || input.spreadId || '自定义';
        if (input.question?.trim()) {
            return `${input.question.trim().substring(0, 20)} - ${spreadName}`;
        }
        return `塔罗占卜 - ${spreadName}`;
    },
    persistRecord: async (input, userId, conversationId) => {
        const serviceClient = getSystemAdminClient();
        if (input.readingId) {
            await serviceClient
                .from('tarot_readings')
                .update({ conversation_id: conversationId })
                .eq('id', input.readingId)
                .eq('user_id', userId);
        } else {
            await serviceClient
                .from('tarot_readings')
                .insert({
                    user_id: userId,
                    spread_id: input.spreadId,
                    question: input.question || null,
                    cards: input.cards,
                    conversation_id: conversationId,
                });
        }
    },
});

async function buildDailyCardResponse(timezone?: string, seedScope?: string): Promise<NextResponse<TarotResponse>> {
    try {
        const dailyCard = await getDailyCard(new Date(), { timezone, seedScope });
        return jsonOk({ success: true, data: { dailyCard } });
    } catch (error) {
        if (error instanceof Error && error.message.includes('timezone')) {
            return jsonError(error.message, 400, { success: false });
        }
        throw error;
    }
}

export async function POST(request: NextRequest): Promise<NextResponse<TarotResponse> | Response> {
    try {
        const body: TarotRequest = await request.json();
        const { action, spreadId, count = 1, question, cards, allowReversed = true, timezone } = body;

        switch (action) {
            case 'list-spreads':
                return jsonOk({ success: true, data: { spreads: TAROT_SPREADS } });
            case 'list-cards':
                return jsonOk({ success: true, data: { allCards: TAROT_CARDS } });
            case 'draw': {
                const { user } = await getAuthContext(request);
                const drawnCards = await drawCards(Math.min(count, 10), allowReversed, { seedScope: user?.id });
                return jsonOk({ success: true, data: { cards: drawnCards } });
            }
            case 'daily': {
                const { user } = await getAuthContext(request);
                return buildDailyCardResponse(timezone, user?.id);
            }
            case 'spread': {
                if (!spreadId) return jsonError('请指定牌阵ID', 400, { success: false });
                const { user } = await getAuthContext(request);
                const spreadResult = await drawForSpread(spreadId, allowReversed, { seedScope: user?.id, question });
                if (!spreadResult) return jsonError('未找到指定牌阵', 404, { success: false });
                let readingId: string | null = null;
                if (request.headers.get('authorization')) {
                    const { user: spreadUser } = await getAuthContext(request);
                    if (spreadUser) {
                        const serviceClient = getSystemAdminClient();
                        const { data, error } = await serviceClient
                            .from('tarot_readings')
                            .insert({ user_id: spreadUser.id, spread_id: spreadId, question: question || null, cards: spreadResult.cards })
                            .select('id')
                            .single();
                        if (!error) readingId = data?.id;
                    }
                }
                return jsonOk({ success: true, data: { spread: spreadResult.spread, cards: spreadResult.cards, readingId } });
            }
            case 'draw-only': {
                if (!spreadId) return jsonError('请指定牌阵ID', 400, { success: false });
                const { user } = await getAuthContext(request);
                const spreadResult = await drawForSpread(spreadId, allowReversed, { seedScope: user?.id, question });
                if (!spreadResult) return jsonError('未找到指定牌阵', 404, { success: false });
                return jsonOk({ success: true, data: { spread: spreadResult.spread, cards: spreadResult.cards } });
            }
            case 'save': {
                if (!spreadId || !cards || cards.length === 0) return jsonError('请提供牌阵与抽牌结果', 400, { success: false });
                const authResult = await requireBearerUser(request);
                if ('error' in authResult) return jsonError(authResult.error.message, authResult.error.status, { success: false });
                const serviceClient = getSystemAdminClient();
                const { data, error } = await serviceClient
                    .from('tarot_readings')
                    .insert({ user_id: authResult.user.id, spread_id: spreadId, question: question || null, cards })
                    .select('id')
                    .single();
                if (error) return jsonError('保存记录失败', 500, { success: false });
                return jsonOk({ success: true, data: { readingId: data?.id || null } });
            }
            case 'interpret':
                return handleInterpret(request, body as unknown as Record<string, unknown>);
            default:
                return jsonError('未知的操作类型', 400, { success: false });
        }
    } catch (error) {
        console.error('塔罗牌 API 错误:', error);
        return jsonError('服务器错误', 500, { success: false });
    }
}

export async function GET(request: NextRequest): Promise<NextResponse<TarotResponse>> {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'daily';
    const timezone = searchParams.get('timezone') || undefined;

    switch (action) {
        case 'daily':
            return buildDailyCardResponse(timezone);
        case 'spreads':
            return jsonOk({ success: true, data: { spreads: TAROT_SPREADS } });
        case 'cards':
            return jsonOk({ success: true, data: { allCards: TAROT_CARDS } });
        default:
            return jsonError('使用 POST 方法进行抽牌和解读操作', 400, { success: false });
    }
}
