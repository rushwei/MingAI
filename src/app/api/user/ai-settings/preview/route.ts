import { NextRequest, NextResponse } from 'next/server';
import { buildPromptWithSources } from '@/lib/prompt-builder';
import { resolveMention } from '@/lib/mentions';
import { getAuthContext } from '@/lib/api-utils';
import type { Mention } from '@/types/mentions';

type PreviewRequestBody = {
    modelId?: unknown;
    expressionStyle?: unknown;
    customInstructions?: unknown;
    userProfile?: unknown;
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

    const modelId = typeof body.modelId === 'string' && body.modelId.trim() ? body.modelId.trim() : 'deepseek-chat';
    const expressionStyle = body.expressionStyle === 'direct' || body.expressionStyle === 'gentle'
        ? body.expressionStyle
        : undefined;
    const customInstructions = typeof body.customInstructions === 'string' ? body.customInstructions : null;
    const userProfile = body.userProfile ?? null;

    try {
        const { data: settings } = await supabase
            .from('user_settings')
            .select('prompt_kb_ids')
            .eq('user_id', user.id)
            .maybeSingle();
        const rawIds = Array.isArray((settings as { prompt_kb_ids?: unknown })?.prompt_kb_ids)
            ? (settings as { prompt_kb_ids: unknown[] }).prompt_kb_ids
            : [];
        const promptKbIds = rawIds.filter((value): value is string => typeof value === 'string' && value.length > 0);
        const { data: kbRows } = promptKbIds.length > 0
            ? await supabase
                .from('knowledge_bases')
                .select('id, name, description')
                .eq('user_id', user.id)
                .in('id', promptKbIds)
            : { data: [] as Array<{ id: string; name: string; description: string | null }> };
        const kbMap = new Map((kbRows || []).map(kb => [kb.id, kb]));
        const promptKnowledgeBases = promptKbIds.map(kbId => kbMap.get(kbId)).filter(Boolean) as Array<{ id: string; name: string; description: string | null }>;
        const resolvedPromptMentions = await Promise.all(promptKnowledgeBases.map(async kb => {
            const mention: Mention = { type: 'knowledge_base', id: kb.id, name: kb.name, preview: kb.description || '知识库' };
            const resolvedContent = await resolveMention(mention, user.id, { client: supabase });
            return { ...mention, resolvedContent };
        }));
        const result = await buildPromptWithSources({
            modelId,
            userMessage: '',
            mentions: resolvedPromptMentions,
            knowledgeHits: [],
            userSettings: {
                expressionStyle,
                userProfile,
                customInstructions,
            },
        });

        return NextResponse.json({
            modelId,
            totalTokens: result.totalTokens,
            budgetTotal: result.budgetTotal,
            layers: result.diagnostics,
            promptKnowledgeBases: promptKnowledgeBases.map(kb => ({ id: kb.id, name: kb.name })),
            promptPreview: '',
            promptChars: 0,
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'unknown error';
        return NextResponse.json({ error: '生成预览失败', message }, { status: 500 });
    }
}
