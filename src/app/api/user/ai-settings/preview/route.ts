import { NextRequest, NextResponse } from 'next/server';
import { buildPromptWithSources, getModelContextInfo } from '@/lib/prompt-builder';
import { getAuthContext } from '@/lib/api-utils';
import { DEFAULT_MODEL_ID } from '@/lib/ai-config';
import { resolveMention } from '@/lib/mentions';
import type { Mention } from '@/types/mentions';
import { countMessageTokens } from '@/lib/token-utils';

type PreviewRequestBody = {
    modelId?: unknown;
    expressionStyle?: unknown;
    customInstructions?: unknown;
    userProfile?: unknown;
    mentions?: unknown;
    messages?: unknown;
};

export async function POST(request: NextRequest) {
    const { supabase, user } = await getAuthContext(request);
    if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 });

    let body: PreviewRequestBody;
    try {
        body = (await request.json()) as PreviewRequestBody;
    } catch {
        return NextResponse.json({ error: '请求体不是有效的 JSON' }, { status: 400 });
    }

    const modelId = typeof body.modelId === 'string' && body.modelId.trim() ? body.modelId.trim() : DEFAULT_MODEL_ID;
    const expressionStyle = body.expressionStyle === 'direct' || body.expressionStyle === 'gentle'
        ? body.expressionStyle
        : undefined;
    const customInstructions = typeof body.customInstructions === 'string' ? body.customInstructions : null;
    const userProfile = body.userProfile ?? null;
    const mentionPayload = Array.isArray(body.mentions) ? body.mentions : [];
    const messagePayload = Array.isArray(body.messages) ? body.messages : [];

    try {
        const { data: settings } = await supabase
            .from('user_settings')
            .select('prompt_kb_ids, expression_style, user_profile, custom_instructions')
            .eq('user_id', user.id)
            .maybeSingle();
        const rawIds = Array.isArray((settings as { prompt_kb_ids?: unknown })?.prompt_kb_ids)
            ? (settings as { prompt_kb_ids: unknown[] }).prompt_kb_ids
            : [];
        const promptKbIds = rawIds.filter((value): value is string => typeof value === 'string' && value.length > 0);
        const settingRow = settings as null | {
            expression_style: 'direct' | 'gentle' | null;
            user_profile: unknown;
            custom_instructions: string | null;
        };
        const resolvedExpressionStyle = expressionStyle ?? (settingRow?.expression_style || undefined);
        const resolvedUserProfile = userProfile ?? (settingRow?.user_profile ?? null);
        const resolvedCustomInstructions = customInstructions ?? (settingRow?.custom_instructions ?? null);
        const { data: kbRows } = promptKbIds.length > 0
            ? await supabase
                .from('knowledge_bases')
                .select('id, name, description')
                .eq('user_id', user.id)
                .in('id', promptKbIds)
            : { data: [] as Array<{ id: string; name: string; description: string | null }> };
        const kbMap = new Map((kbRows || []).map(kb => [kb.id, kb]));
        const promptKnowledgeBases = promptKbIds.map(kbId => kbMap.get(kbId)).filter(Boolean) as Array<{ id: string; name: string; description: string | null }>;
        const rawMentions = mentionPayload.filter((m): m is Mention => {
            if (!m || typeof m !== 'object') return false;
            const entry = m as { type?: unknown; name?: unknown; id?: unknown; preview?: unknown };
            return typeof entry.type === 'string' && typeof entry.name === 'string';
        });
        const filteredMentions = rawMentions.filter(m => m.type !== 'knowledge_base');
        const resolvedMentions = await Promise.all(filteredMentions.map(async (m) => {
            const resolvedContent = await resolveMention(m, user.id, { client: supabase });
            return { ...m, resolvedContent };
        }));

        const result = await buildPromptWithSources({
            modelId,
            userMessage: '',
            mentions: resolvedMentions,
            knowledgeHits: [],
            userSettings: {
                expressionStyle: resolvedExpressionStyle,
                userProfile: resolvedUserProfile,
                customInstructions: resolvedCustomInstructions,
            },
        });

        const contextConfig = getModelContextInfo(modelId);
        const historyTokens = countMessageTokens(messagePayload as Array<{ content?: string }>);
        const contextTotal = contextConfig.maxContext;
        const remainingContext = Math.max(0, contextTotal - historyTokens);
        return NextResponse.json({
            modelId,
            totalTokens: result.totalTokens,
            budgetTotal: result.budgetTotal,
            historyTokens,
            contextTotal,
            remainingContext,
            layers: result.diagnostics,
            promptKnowledgeBases: promptKnowledgeBases.map(kb => ({ id: kb.id, name: kb.name })),
            promptPreview: result.systemPrompt,
            promptChars: result.systemPrompt.length,
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'unknown error';
        return NextResponse.json({ error: '生成预览失败', message }, { status: 500 });
    }
}
