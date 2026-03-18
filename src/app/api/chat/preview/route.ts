import { NextRequest } from 'next/server';
import { jsonError, jsonOk, requireUserContext } from '@/lib/api-utils';
import { DEFAULT_MODEL_ID } from '@/lib/ai/ai-config';
import { isModelAllowedForMembership, isReasoningAllowedForMembership } from '@/lib/ai/ai-access';
import { isFeatureModuleEnabled } from '@/lib/app-settings';
import { buildPreviewPromptContext, type PreviewRequestBody } from '@/lib/chat/preview-context';
import { buildChatPromptContext } from '@/lib/server/chat/prompt-context';
import { getDefaultModelConfigAsync, getModelConfigAsync } from '@/lib/server/ai-config';
import { getEffectiveMembershipType } from '@/lib/user/membership-server';

function getAccessTokenForKnowledgeBase(request: NextRequest): string | null {
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
        return authHeader.replace(/^Bearer\s+/i, '');
    }
    return request.cookies.get('sb-access-token')?.value ?? null;
}

export async function POST(request: NextRequest) {
    const auth = await requireUserContext(request);
    if ('error' in auth) {
        return jsonError(auth.error.message, auth.error.status);
    }

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
        const modelConfig = requestedModelId
            ? await getModelConfigAsync(requestedModelId)
            : await getDefaultModelConfigAsync('chat');
        if (!modelConfig) {
            return jsonError('无效的模型', 400);
        }

        const membershipType = await getEffectiveMembershipType(auth.user.id);
        const knowledgeBaseFeatureEnabled = await isFeatureModuleEnabled('knowledge-base');
        if (!isModelAllowedForMembership(modelConfig, membershipType)) {
            return jsonError('当前会员等级无法使用该模型', 403);
        }

        const reasoningEnabled = isReasoningAllowedForMembership(modelConfig, membershipType)
            ? body.reasoning === true
            : false;
        const canUsePromptKnowledgeBase = knowledgeBaseFeatureEnabled && membershipType !== 'free';
        const previewContext = await buildPreviewPromptContext({
            auth,
            body,
            requestedModelId: modelConfig.id,
            reasoningEnabled,
            membershipType,
            knowledgeBaseFeatureEnabled,
            accessTokenForKB: getAccessTokenForKnowledgeBase(request),
            sharedPromptContextBuilder: buildChatPromptContext,
        });

        return jsonOk({
            diagnostics: previewContext.diagnostics,
            totalTokens: previewContext.totalTokens,
            budgetTotal: previewContext.budgetTotal,
            userMessageTokens: previewContext.userMessageTokens,
            historyTokens: previewContext.historyTokens,
            contextTotal: previewContext.contextTotal,
            remainingContext: previewContext.remainingContext,
            promptKnowledgeBases: canUsePromptKnowledgeBase
                ? previewContext.promptKnowledgeBases
                : [],
            preview: previewContext.preview,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'unknown error';
        return jsonError('生成预览失败', 500, { message });
    }
}
