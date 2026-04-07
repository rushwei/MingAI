export type ConversationAnalysisSnapshot = {
  analysis: string | null;
  reasoning: string | null;
  modelId: string | null;
  reasoningEnabled: boolean;
};

export async function loadConversationAnalysisSnapshot(
  conversationId: string,
): Promise<ConversationAnalysisSnapshot | null> {
  const response = await fetch(`/api/conversations/${conversationId}?snapshot=analysis`, {
    credentials: 'include',
  });

  if (!response.ok) {
    return null;
  }

  const payload = await response.json().catch(() => null) as {
    snapshot?: ConversationAnalysisSnapshot | null;
  } | null;

  return payload?.snapshot ?? null;
}

export async function loadLatestConversationAnalysisSnapshot(filters: {
  sourceType: string;
  chartId?: string;
}): Promise<ConversationAnalysisSnapshot | null> {
  const query = new URLSearchParams({
    includeArchived: 'true',
    limit: '1',
    sourceType: filters.sourceType,
  });
  if (filters.chartId) {
    query.set('chartId', filters.chartId);
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
