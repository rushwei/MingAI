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

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(payload?.error || '加载分析快照失败');
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
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(payload?.error || '加载分析快照失败');
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
