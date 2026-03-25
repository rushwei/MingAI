/**
 * 塔罗牌 API 路由
 *
 * 提供抽牌、每日一牌、牌阵解读等功能
 */
import { NextRequest, NextResponse } from 'next/server';
import { drawCards, drawForSpread, generateTarotReadingText, getDailyCard, TAROT_CARDS, TAROT_SPREADS, type DrawnCard, type TarotNumerology, type TarotSpread } from '@/lib/divination/tarot';
import { getAuthContext, getSystemAdminClient, jsonError, jsonOk, requireBearerUser } from '@/lib/api-utils';
import { createInterpretHandler, type InterpretInput } from '@/lib/api/divination-pipeline';
import { SOURCE_CHART_TYPE_MAP } from '@/lib/visualization/chart-types';

interface TarotRequest {
    action: 'draw' | 'daily' | 'spread' | 'draw-only' | 'save' | 'interpret' | 'list-spreads' | 'list-cards';
    spreadId?: string;
    count?: number;
    question?: string;
    cards?: DrawnCard[];
    seed?: string;
    allowReversed?: boolean;
    timezone?: string;
    readingId?: string;
    modelId?: string;
    reasoning?: boolean;
    stream?: boolean;
    birthDate?: string;
    numerology?: TarotNumerology;
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
        numerology?: TarotNumerology;
        seed?: string;
    };
    error?: string;
}

// ─── Interpret pipeline config ───

interface TarotInterpretInput extends InterpretInput {
    cards: DrawnCard[];
    spreadId: string;
    question?: string;
    readingId?: string;
    seed?: string;
    birthDate?: string;
    numerology?: TarotNumerology;
}

function buildTarotMetadata(birthDate?: string, numerology?: TarotNumerology, seed?: string): Record<string, unknown> | undefined {
    const metadata: Record<string, unknown> = {};
    if (birthDate) {
        metadata.birthDate = birthDate;
    }
    if (numerology) {
        metadata.numerology = numerology;
    }
    if (seed) {
        metadata.seed = seed;
    }
    return Object.keys(metadata).length > 0 ? metadata : undefined;
}

type TarotInsertResult = {
    data?: { id?: string } | null;
    error?: { code?: string; message?: string; details?: string } | null;
};

async function resolveTarotInsert(
    insertBuilder: unknown,
    selectId: boolean,
): Promise<TarotInsertResult> {
    if (
        selectId
        && insertBuilder
        && typeof (insertBuilder as { select?: unknown }).select === 'function'
    ) {
        return (insertBuilder as { select: (columns: string) => { single: () => Promise<TarotInsertResult> } })
            .select('id')
            .single();
    }
    return await (insertBuilder as Promise<TarotInsertResult>);
}

async function insertTarotReading(
    serviceClient: ReturnType<typeof getSystemAdminClient>,
    payload: Record<string, unknown>,
    metadata?: Record<string, unknown>,
    options: { selectId?: boolean } = {},
) {
    const selectId = options.selectId ?? false;
    const primaryPayload = metadata ? { ...payload, metadata } : payload;
    return resolveTarotInsert(
        serviceClient.from('tarot_readings').insert(primaryPayload),
        selectId,
    );
}

async function updateTarotReading(
    serviceClient: ReturnType<typeof getSystemAdminClient>,
    filters: { id: string; userId: string },
    fields: Record<string, unknown>,
    metadata?: Record<string, unknown>,
) {
    const primaryPayload = metadata ? { ...fields, metadata } : fields;
    return serviceClient
        .from('tarot_readings')
        .update(primaryPayload)
        .eq('id', filters.id)
        .eq('user_id', filters.userId);
}

const handleInterpret = createInterpretHandler<TarotInterpretInput>({
    sourceType: 'tarot',
    tag: 'tarot',
    personality: 'tarot',
    allowedChartTypes: [...SOURCE_CHART_TYPE_MAP.tarot_reading],
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
            seed: b.seed,
            birthDate: b.birthDate,
            numerology: b.numerology,
        };
    },
    buildPrompts: (input) => {
        const spreadName = TAROT_SPREADS.find((spread) => spread.id === input.spreadId)?.name || input.spreadId || '自定义牌阵';
        const userPrompt = generateTarotReadingText({
            spreadName,
            spreadId: input.spreadId,
            question: input.question,
            cards: input.cards,
            seed: input.seed,
            numerology: input.numerology,
            birthDate: input.birthDate,
        });

        return { systemPrompt: '', userPrompt };
    },
    buildSourceData: (input, modelId, reasoningEnabled) => ({
        cards: input.cards,
        spread_id: input.spreadId,
        question: input.question || null,
        model_id: modelId,
        reasoning: reasoningEnabled,
        seed: input.seed || null,
        birth_date: input.birthDate || null,
        numerology: input.numerology || null,
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
        const metadata = buildTarotMetadata(input.birthDate, input.numerology, input.seed);
        if (input.readingId) {
            const updateResult = await updateTarotReading(
                serviceClient,
                { id: input.readingId, userId },
                { conversation_id: conversationId },
                metadata,
            );
            if (updateResult.error) {
                throw new Error(updateResult.error.message || '更新塔罗记录失败');
            }
        } else {
            const insertResult = await insertTarotReading(serviceClient, {
                user_id: userId,
                spread_id: input.spreadId,
                question: input.question || null,
                cards: input.cards,
                conversation_id: conversationId,
            }, metadata, { selectId: false });
            if (insertResult.error) {
                throw new Error(insertResult.error.message || '保存塔罗记录失败');
            }
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
        const { action, spreadId, count = 1, question, cards, seed, allowReversed = true, timezone, birthDate, numerology } = body;
        const metadata = buildTarotMetadata(birthDate, numerology, seed);

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
                const spreadResult = await drawForSpread(spreadId, allowReversed, { seed, seedScope: user?.id, question, birthDate });
                if (!spreadResult) return jsonError('未找到指定牌阵', 404, { success: false });
                const spreadMetadata = buildTarotMetadata(birthDate, spreadResult.numerology || numerology, spreadResult.seed);
                let readingId: string | null = null;
                if (request.headers.get('authorization')) {
                    const { user: spreadUser } = await getAuthContext(request);
                    if (spreadUser) {
                        const serviceClient = getSystemAdminClient();
                        const { data, error } = await insertTarotReading(serviceClient, {
                            user_id: spreadUser.id,
                            spread_id: spreadId,
                            question: question || null,
                            cards: spreadResult.cards,
                        }, spreadMetadata, { selectId: true });
                        if (!error) readingId = data?.id ?? null;
                    }
                }
                return jsonOk({
                    success: true,
                    data: { spread: spreadResult.spread, cards: spreadResult.cards, readingId, numerology: spreadResult.numerology, seed: spreadResult.seed },
                });
            }
            case 'draw-only': {
                if (!spreadId) return jsonError('请指定牌阵ID', 400, { success: false });
                const { user } = await getAuthContext(request);
                const spreadResult = await drawForSpread(spreadId, allowReversed, { seed, seedScope: user?.id, question, birthDate });
                if (!spreadResult) return jsonError('未找到指定牌阵', 404, { success: false });
                return jsonOk({
                    success: true,
                    data: { spread: spreadResult.spread, cards: spreadResult.cards, numerology: spreadResult.numerology, seed: spreadResult.seed },
                });
            }
            case 'save': {
                if (!spreadId || !cards || cards.length === 0) return jsonError('请提供牌阵与抽牌结果', 400, { success: false });
                const authResult = await requireBearerUser(request);
                if ('error' in authResult) return jsonError(authResult.error.message, authResult.error.status, { success: false });
                const serviceClient = getSystemAdminClient();
                const { data, error } = await insertTarotReading(serviceClient, {
                    user_id: authResult.user.id,
                    spread_id: spreadId,
                    question: question || null,
                    cards,
                }, metadata, { selectId: true });
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
