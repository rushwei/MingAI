import 'server-only';

import { getModelContextInfo, getPromptBudget, buildPromptWithSources } from '@/lib/ai/prompt-builder';
import { buildDreamContextPayload, loadChartContext, type ChartIds } from '@/lib/chat/chat-context';
import { searchKnowledge } from '@/lib/knowledge-base/search';
import type { KnowledgeHit, RankedResult, SearchCandidate } from '@/lib/knowledge-base/types';
import { parseMentions, resolveMention, stripMentionTokens } from '@/lib/mentions';
import { countMessageTokens } from '@/lib/token-utils';
import {
    type ExpressionStyle,
    type UserSettingsSnapshot,
    normalizeUserSettings,
    USER_SETTINGS_SELECT,
} from '@/lib/user/settings';
import type { requireUserContext } from '@/lib/api-utils';
import type { ResolvedChatRequest } from '@/lib/server/chat/request';
import type { buildChatPromptContext } from '@/lib/server/chat/prompt-context';
import type { ChatMessage, DifyContext } from '@/types';
import type { Mention } from '@/types/mentions';

type PreviewAuthContext = Exclude<Awaited<ReturnType<typeof requireUserContext>>, { error: unknown }>;
type PreviewMembershipType = ResolvedChatRequest['membershipType'];
type SharedPromptContextBuilder = typeof buildChatPromptContext;

const PREVIEW_TEXT_LIMIT = 500;

export interface PreviewRequestBody {
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

export type PreviewContextResult = {
    diagnostics: Array<{ id: string; included: boolean; tokens: number; truncated: boolean }>;
    totalTokens: number;
    budgetTotal: number;
    userMessageTokens: number;
    historyTokens: number;
    contextTotal: number;
    remainingContext: number;
    promptKnowledgeBases: Array<{ id: string; name: string }>;
    preview: string;
};

type PreviewBuilderOptions = {
    auth: PreviewAuthContext;
    body: PreviewRequestBody;
    requestedModelId: string;
    reasoningEnabled: boolean;
    membershipType: PreviewMembershipType;
    knowledgeBaseFeatureEnabled: boolean;
    accessTokenForKB: string | null;
    sharedPromptContextBuilder: SharedPromptContextBuilder;
};

function getMessagePayload(messages: unknown): ChatMessage[] {
    return Array.isArray(messages) ? messages as ChatMessage[] : [];
}

function getRequestMentions(mentions: unknown): Mention[] {
    if (!Array.isArray(mentions)) {
        return [];
    }

    return mentions.filter((entry): entry is Mention => {
        if (!entry || typeof entry !== 'object') {
            return false;
        }
        const item = entry as { type?: unknown; name?: unknown };
        return typeof item.type === 'string' && typeof item.name === 'string';
    });
}

function extractUserQuestion(rawUserContent: string): string {
    const marker = '【用户的问题如下】';
    const index = rawUserContent.lastIndexOf(marker);
    if (index >= 0) {
        return rawUserContent.slice(index + marker.length).trim();
    }
    return rawUserContent.trim();
}

function hasSettingsOverrides(body: PreviewRequestBody): boolean {
    return body.expressionStyle === 'direct'
        || body.expressionStyle === 'gentle'
        || typeof body.customInstructions === 'string'
        || body.customInstructions === null
        || body.userProfile !== undefined;
}

function mergeUserSettings(base: UserSettingsSnapshot, body: PreviewRequestBody): UserSettingsSnapshot {
    const expressionStyle = body.expressionStyle === 'gentle' ? 'gentle' : body.expressionStyle === 'direct' ? 'direct' : base.expressionStyle;
    const customInstructions = typeof body.customInstructions === 'string'
        ? body.customInstructions
        : body.customInstructions === null
            ? ''
            : base.customInstructions;
    const userProfile = body.userProfile !== undefined ? body.userProfile : base.userProfile;

    return {
        ...base,
        expressionStyle: expressionStyle as ExpressionStyle,
        customInstructions,
        userProfile,
    };
}

async function loadPromptKnowledgeBases(
    auth: PreviewAuthContext,
    promptKbIds: string[],
): Promise<Array<{ id: string; name: string }>> {
    if (promptKbIds.length === 0) {
        return [];
    }

    const { data } = await auth.supabase
        .from('knowledge_bases')
        .select('id, name')
        .eq('user_id', auth.user.id)
        .in('id', promptKbIds);

    const nameById = new Map<string, string>();
    for (const row of data || []) {
        if (typeof row.id === 'string' && typeof row.name === 'string') {
            nameById.set(row.id, row.name);
        }
    }

    return promptKbIds.map((kbId) => ({
        id: kbId,
        name: nameById.get(kbId) || '知识库',
    }));
}

async function loadNormalizedUserSettings(auth: PreviewAuthContext): Promise<UserSettingsSnapshot> {
    const { data } = await auth.supabase
        .from('user_settings')
        .select(USER_SETTINGS_SELECT)
        .eq('user_id', auth.user.id)
        .maybeSingle();

    return normalizeUserSettings((data ?? null) as Record<string, unknown> | null);
}

async function buildKnowledgeHits(
    auth: PreviewAuthContext,
    query: string,
    accessTokenForKB: string | null,
    promptKbIds: string[],
): Promise<KnowledgeHit[]> {
    const cleanedQuery = stripMentionTokens(query);
    if (!cleanedQuery || promptKbIds.length === 0) {
        return [];
    }

    const results = await searchKnowledge(cleanedQuery, {
        limit: 12,
        topK: 5,
        accessToken: accessTokenForKB || undefined,
        kbIds: promptKbIds,
    });
    const candidates = results as Array<SearchCandidate | RankedResult>;
    const kbIds = Array.from(new Set(candidates.map((result) => result.kbId).filter(Boolean))) as string[];
    if (kbIds.length === 0) {
        return [];
    }

    const { data: kbRows } = await auth.supabase
        .from('knowledge_bases')
        .select('id, name, weight')
        .eq('user_id', auth.user.id)
        .in('id', kbIds);

    const kbMap = new Map<string, { name: string; weight: string }>();
    for (const kb of kbRows || []) {
        if (typeof kb.id === 'string' && typeof kb.name === 'string') {
            kbMap.set(kb.id, {
                name: kb.name,
                weight: typeof kb.weight === 'string' ? kb.weight : 'normal',
            });
        }
    }

    return candidates.slice(0, 8).map((result): KnowledgeHit => ({
        kbId: result.kbId,
        kbName: kbMap.get(result.kbId)?.name || '知识库',
        content: result.content,
        score: result.score || 0,
    }));
}

async function buildSharedPreviewContext({
    auth,
    body,
    requestedModelId,
    reasoningEnabled,
    membershipType,
    knowledgeBaseFeatureEnabled,
    accessTokenForKB,
    sharedPromptContextBuilder,
}: PreviewBuilderOptions): Promise<PreviewContextResult> {
  const messagePayload = getMessagePayload(body.messages);
  const requestMentions = getRequestMentions(body.mentions);

  const sharedContext = await sharedPromptContextBuilder({
        body: {
            messages: messagePayload,
            chartIds: body.chartIds,
            dreamMode: body.dreamMode === true,
            difyContext: body.difyContext,
            mentions: requestMentions,
            model: requestedModelId,
            reasoning: reasoningEnabled,
        },
        userId: auth.user.id,
        canSkipCredit: false,
        accessTokenForKB,
        requestedModelId,
        membershipType,
        reasoningEnabled,
        creditDeducted: false,
    });

  const historyTokens = countMessageTokens(messagePayload as Array<{ content?: string }>);
  const contextTotal = getModelContextInfo(requestedModelId, reasoningEnabled).maxContext;
  const previewText = sharedContext.systemPrompt.slice(0, PREVIEW_TEXT_LIMIT);

  return {
        diagnostics: sharedContext.metadata.promptDiagnostics.layers as Array<{ id: string; included: boolean; tokens: number; truncated: boolean }>,
        totalTokens: sharedContext.metadata.promptDiagnostics.totalTokens,
        budgetTotal: sharedContext.metadata.promptDiagnostics.budgetTotal,
        userMessageTokens: sharedContext.metadata.promptDiagnostics.userMessageTokens,
        historyTokens,
        contextTotal,
        remainingContext: Math.max(0, contextTotal - historyTokens),
        promptKnowledgeBases: knowledgeBaseFeatureEnabled && membershipType !== 'free' ? sharedContext.promptKnowledgeBases : [],
        preview: sharedContext.systemPrompt.length > PREVIEW_TEXT_LIMIT ? `${previewText}...` : previewText,
  };
}

async function buildOverridePreviewContext({
    auth,
    body,
    requestedModelId,
    reasoningEnabled,
    membershipType,
    knowledgeBaseFeatureEnabled,
    accessTokenForKB,
}: Omit<PreviewBuilderOptions, 'sharedPromptContextBuilder'>): Promise<PreviewContextResult> {
    const messagePayload = getMessagePayload(body.messages);
    const lastUserMessage = [...messagePayload].reverse().find((message) => message.role === 'user');
    const rawUserContent = typeof body.userMessage === 'string'
        ? body.userMessage
        : (lastUserMessage?.content || '');
    const userQuestionForSearch = extractUserQuestion(rawUserContent);

    const parsedMentions = parseMentions(rawUserContent);
    const requestMentions = getRequestMentions(body.mentions);
    const canUsePromptKnowledgeBase = knowledgeBaseFeatureEnabled && membershipType !== 'free';
    const mergedMentions = [...requestMentions, ...parsedMentions]
        .filter((mention) => mention && mention.type && mention.name)
        .slice(0, 20);
    const effectiveMentions = canUsePromptKnowledgeBase
        ? mergedMentions
        : mergedMentions.filter((mention) => mention.type !== 'knowledge_base');

    const mentionBudget = await getPromptBudget(requestedModelId, reasoningEnabled);
    const resolvedMentions = await Promise.all(effectiveMentions.map(async (mention) => {
        const resolvedContent = await resolveMention(mention, auth.user.id, {
            client: auth.supabase,
            maxTokens: mentionBudget,
        });
        return { ...mention, resolvedContent };
    }));

    const baseSettings = await loadNormalizedUserSettings(auth);
    const userSettings = mergeUserSettings(baseSettings, body);
    const promptKbIds = canUsePromptKnowledgeBase
        ? Array.from(new Set(userSettings.promptKbIds))
        : [];
    const promptKnowledgeBases = canUsePromptKnowledgeBase
        ? await loadPromptKnowledgeBases(auth, promptKbIds)
        : [];
    const knowledgeHits = canUsePromptKnowledgeBase
        ? await buildKnowledgeHits(auth, userQuestionForSearch, accessTokenForKB, promptKbIds)
        : [];

    const chartContext = body.chartIds && (body.chartIds.baziId || body.chartIds.ziweiId)
        ? await loadChartContext(body.chartIds, auth.user.id)
        : undefined;
    const dreamPayload = body.dreamMode === true
        ? (await buildDreamContextPayload(auth.user.id)).payload
        : undefined;

    const promptBuild = await buildPromptWithSources({
        modelId: requestedModelId,
        reasoningEnabled,
        userMessage: userQuestionForSearch,
        mentions: resolvedMentions,
        knowledgeHits,
        userSettings,
        chartContext: chartContext ? { ...chartContext, analysisMode: body.chartIds?.baziAnalysisMode } : undefined,
        dreamMode: body.dreamMode === true ? {
            enabled: true,
            baziText: dreamPayload?.baziText,
            fortuneText: dreamPayload?.fortuneText,
        } : undefined,
        difyContext: body.difyContext,
    });

    const historyTokens = countMessageTokens(messagePayload as Array<{ content?: string }>);
    const contextTotal = getModelContextInfo(requestedModelId, reasoningEnabled).maxContext;
    const previewText = promptBuild.systemPrompt.slice(0, PREVIEW_TEXT_LIMIT);

    return {
        diagnostics: promptBuild.diagnostics,
        totalTokens: promptBuild.totalTokens,
        budgetTotal: promptBuild.budgetTotal,
        userMessageTokens: promptBuild.userMessageTokens,
        historyTokens,
        contextTotal,
        remainingContext: Math.max(0, contextTotal - historyTokens),
        promptKnowledgeBases: canUsePromptKnowledgeBase ? promptKnowledgeBases : [],
        preview: promptBuild.systemPrompt.length > PREVIEW_TEXT_LIMIT ? `${previewText}...` : previewText,
    };
}

export async function buildPreviewPromptContext(options: PreviewBuilderOptions): Promise<PreviewContextResult> {
    if (!hasSettingsOverrides(options.body)) {
        return await buildSharedPreviewContext(options);
    }

    return await buildOverridePreviewContext(options);
}
