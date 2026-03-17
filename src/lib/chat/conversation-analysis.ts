import { extractAnalysisFromConversation } from '@/lib/ai/ai-analysis-query';
import { loadConversation } from '@/lib/chat/conversation';

export type ConversationAnalysisSnapshot = {
  analysis: string | null;
  reasoning: string | null;
  modelId: string | null;
  reasoningEnabled: boolean;
};

export async function loadConversationAnalysisSnapshot(
  conversationId: string,
): Promise<ConversationAnalysisSnapshot | null> {
  const conversation = await loadConversation(conversationId);
  if (!conversation) {
    return null;
  }

  const sourceData = conversation.sourceData as Record<string, unknown> | undefined;
  const { analysis, reasoning, modelId } = extractAnalysisFromConversation(
    conversation.messages,
    sourceData,
  );

  return {
    analysis,
    reasoning,
    modelId,
    reasoningEnabled: typeof sourceData?.reasoning === 'boolean' ? sourceData.reasoning : false,
  };
}

export async function loadLatestConversationAnalysisSnapshot(filters: {
  sourceType: string;
  baziChartId?: string;
}): Promise<ConversationAnalysisSnapshot | null> {
  const query = new URLSearchParams({
    includeArchived: 'true',
    limit: '1',
    sourceType: filters.sourceType,
  });

  if (filters.baziChartId) {
    query.set('baziChartId', filters.baziChartId);
  }

  const response = await fetch(`/api/conversations?${query.toString()}`, {
    credentials: 'include',
  });
  if (!response.ok) {
    return null;
  }

  const payload = await response.json().catch(() => null) as {
    conversations?: Array<{ id?: string | null }>;
  } | null;
  const conversationId = payload?.conversations?.[0]?.id;
  if (typeof conversationId !== 'string' || !conversationId) {
    return null;
  }

  return await loadConversationAnalysisSnapshot(conversationId);
}
