import { NextRequest } from 'next/server';
import type { ChatMessage, DifyContext } from '@/types';
import type { Mention } from '@/types/mentions';
import { jsonError, jsonOk, requireUserContext } from '@/lib/api-utils';
import { DEFAULT_MODEL_ID } from '@/lib/ai/ai-config';
import { getModelConfigAsync } from '@/lib/server/ai-config';
import { getEffectiveMembershipType } from '@/lib/user/membership-server';
import { isModelAllowedForMembership, isReasoningAllowedForMembership } from '@/lib/ai/ai-access';
import { buildPromptWithSources, getModelContextInfo, getPromptBudget } from '@/lib/ai/prompt-builder';
import { countMessageTokens } from '@/lib/token-utils';
import { buildDreamContextPayload, loadChartContext, type ChartIds } from '@/lib/chat/chat-context';
import { parseMentions, resolveMention, stripMentionTokens } from '@/lib/mentions';
import { searchKnowledge } from '@/lib/knowledge-base/search';
import type { KnowledgeHit, RankedResult, SearchCandidate } from '@/lib/knowledge-base/types';

interface PreviewRequestBody {
    model?: unknown;
    reasoning?: unknown;
    chartIds?: ChartIds;
    dreamMode?: unknown;
    difyContext?: DifyContext;
    mentions?: unknown;
    messages?: unknown;
    userMessage?: unknown;
    expressionStyle?: unknown;
    customInstructions?: unknown;
    userProfile?: unknown;
}

export async function POST(request: NextRequest) {
    const auth = await requireUserContext(request);
    if ('error' in auth) {
        return jsonError(auth.error.message, auth.error.status);
    }
    const { supabase, user } = auth;

    let body: PreviewRequestBody;
    try {
        body = (await request.json()) as PreviewRequestBody;
    } catch {
        return jsonError('请求体不是有效的 JSON', 400);
    }

    try {
        const requestedModelId = typeof body.model === 'string' && body.model.trim()
            ? body.model.trim()
            : DEFAULT_MODEL_ID;
        const modelConfig = await getModelConfigAsync(requestedModelId);
        if (!modelConfig) {
            return jsonError('无效的模型', 400);
        }

        const membershipType = await getEffectiveMembershipType(user.id);
        if (!isModelAllowedForMembership(modelConfig, membershipType)) {
            return jsonError('当前会员等级无法使用该模型', 403);
        }

        const reasoningEnabled = isReasoningAllowedForMembership(modelConfig, membershipType)
            ? body.reasoning === true
            : false;

        const chartIds = body.chartIds;
        const chartContext = chartIds && (chartIds.baziId || chartIds.ziweiId)
            ? await loadChartContext(chartIds, user.id)
            : undefined;

        let dreamContextPayload: { baziText?: string; fortuneText?: string } | undefined;
        if (body.dreamMode === true) {
            const { payload } = await buildDreamContextPayload(user.id);
            dreamContextPayload = payload;
        }

        const messagePayload = Array.isArray(body.messages) ? body.messages as ChatMessage[] : [];
        const lastUserMessage = [...messagePayload].reverse().find(m => m.role === 'user');
        const rawUserContent = typeof body.userMessage === 'string'
            ? body.userMessage
            : (lastUserMessage?.content || '');

        const userQuestionForSearch = (() => {
            const marker = '【用户的问题如下】';
            const idx = rawUserContent.lastIndexOf(marker);
            if (idx >= 0) {
                return rawUserContent.slice(idx + marker.length).trim();
            }
            return rawUserContent.trim();
        })();

        const parsedMentions = parseMentions(rawUserContent);
        const requestMentions = Array.isArray(body.mentions)
            ? body.mentions.filter((m): m is Mention => {
                if (!m || typeof m !== 'object') return false;
                const entry = m as { type?: unknown; name?: unknown };
                return typeof entry.type === 'string' && typeof entry.name === 'string';
            })
            : [];
        const mergedMentions = [...requestMentions, ...parsedMentions]
            .filter(m => m && m.type && m.name)
            .slice(0, 20);

        const mentionBudget = await getPromptBudget(requestedModelId, reasoningEnabled);
        const resolvedMentions = await Promise.all(mergedMentions.map(async (m) => {
            const resolvedContent = await resolveMention(m, user.id, {
                client: supabase,
                maxTokens: mentionBudget
            });
            return { ...m, resolvedContent };
        }));

        const { data } = await supabase
            .from('user_settings')
            .select('expression_style, user_profile, custom_instructions, prompt_kb_ids')
            .eq('user_id', user.id)
            .maybeSingle();
        const row = data as null | {
            expression_style: 'direct' | 'gentle' | null;
            user_profile: unknown;
            custom_instructions: string | null;
            prompt_kb_ids?: unknown;
        };
        // 应用可选的覆盖参数（ai-settings 页面实时预览）
        const overrideExpression = body.expressionStyle === 'direct' || body.expressionStyle === 'gentle'
            ? body.expressionStyle
            : undefined;
        const overrideCustom = typeof body.customInstructions === 'string' ? body.customInstructions : undefined;
        const overrideProfile = typeof body.userProfile === 'object' ? (body.userProfile as unknown) : undefined;
        const userSettings = {
            expressionStyle: (overrideExpression ?? row?.expression_style ?? 'direct') as 'direct' | 'gentle',
            userProfile: overrideProfile ?? (row?.user_profile || {}),
            customInstructions: (overrideCustom ?? row?.custom_instructions ?? ''),
            promptKbIds: Array.isArray(row?.prompt_kb_ids)
                ? row?.prompt_kb_ids.filter((value: unknown): value is string => typeof value === 'string' && value.length > 0)
                : []
        };

        const promptKbIds = Array.from(new Set(userSettings.promptKbIds));
        const { data: promptKbRows } = promptKbIds.length > 0
            ? await supabase
                .from('knowledge_bases')
                .select('id, name')
                .eq('user_id', user.id)
                .in('id', promptKbIds)
            : { data: [] as Array<{ id: string; name: string }> };
        const promptKbMap = new Map<string, string>();
        (promptKbRows || []).forEach((kb: { id: string; name: string }) => promptKbMap.set(kb.id, kb.name));

        let accessTokenForKB: string | null = null;
        const authHeader = request.headers.get('authorization');
        if (authHeader) {
            accessTokenForKB = authHeader.replace('Bearer ', '');
        } else {
            const accessToken = request.cookies.get('sb-access-token')?.value;
            if (accessToken) accessTokenForKB = accessToken;
        }

        const knowledgeHits = membershipType !== 'free' ? await (async () => {
            const cleanedQuery = stripMentionTokens(userQuestionForSearch);
            if (!cleanedQuery) return [];
            if (promptKbIds.length === 0) return [];
            const results = await searchKnowledge(cleanedQuery, {
                limit: 12,
                topK: 5,
                accessToken: accessTokenForKB || undefined,
                kbIds: promptKbIds.length > 0 ? promptKbIds : undefined
            });
            const candidates = results as Array<SearchCandidate | RankedResult>;
            const kbIds = Array.from(new Set(candidates.map(r => r.kbId).filter(Boolean))) as string[];
            if (kbIds.length === 0) return [];

            const { data: kbRows } = await supabase
                .from('knowledge_bases')
                .select('id, name, weight')
                .eq('user_id', user.id)
                .in('id', kbIds);

            const kbMap = new Map<string, { name: string; weight: string }>();
            (kbRows || []).forEach((kb: { id: string; name: string; weight: string }) => kbMap.set(kb.id, { name: kb.name, weight: kb.weight }));

            return candidates.slice(0, 8).map((r): KnowledgeHit => ({
                kbId: r.kbId,
                kbName: kbMap.get(r.kbId)?.name || '知识库',
                content: r.content,
                score: r.score || 0
            }));
        })() : [];

        const promptBuild = await buildPromptWithSources({
            modelId: requestedModelId,
            reasoningEnabled,
            userMessage: userQuestionForSearch,
            mentions: resolvedMentions,
            knowledgeHits,
            userSettings,
            chartContext: chartContext ? { ...chartContext, analysisMode: chartIds?.baziAnalysisMode } : undefined,
            dreamMode: body.dreamMode === true ? {
                enabled: true,
                baziText: dreamContextPayload?.baziText,
                fortuneText: dreamContextPayload?.fortuneText,
            } : undefined,
            difyContext: body.difyContext,
        });

        const contextConfig = getModelContextInfo(requestedModelId, reasoningEnabled);
        const historyTokens = countMessageTokens(messagePayload as Array<{ content?: string }>);
        const contextTotal = contextConfig.maxContext;
        const remainingContext = Math.max(0, contextTotal - historyTokens);
        const previewText = promptBuild.systemPrompt.slice(0, 500);
        return jsonOk({
            diagnostics: promptBuild.diagnostics,
            totalTokens: promptBuild.totalTokens,
            budgetTotal: promptBuild.budgetTotal,
            userMessageTokens: promptBuild.userMessageTokens,
            historyTokens,
            contextTotal,
            remainingContext,
            promptKnowledgeBases: promptKbIds.map(kbId => ({ id: kbId, name: promptKbMap.get(kbId) || '知识库' })),
            preview: promptBuild.systemPrompt.length > 500 ? `${previewText}...` : previewText,
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'unknown error';
        return jsonError('生成预览失败', 500, { message });
    }
}
