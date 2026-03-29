import { requestBrowserJson } from '@/lib/browser-api';
import { updateSessionJSON, writeSessionJSON } from '@/lib/cache/session-storage';
import type {
  HistoryRestorePayload,
  HistorySummaryItem,
  HistoryType,
} from '@/lib/history/registry';

type HistoryPagination = {
  hasMore: boolean;
  nextOffset: number | null;
};

const HISTORY_PAGE_SIZE = 100;
const HISTORY_MAX_PAGES = 50;

export async function loadHistorySummariesPage(
  type: HistoryType,
  options: { limit?: number; offset?: number } = {},
): Promise<{ items: HistorySummaryItem[]; pagination: HistoryPagination }> {
  const limit = options.limit ?? HISTORY_PAGE_SIZE;
  const offset = options.offset ?? 0;
  const params = new URLSearchParams({
    type,
    limit: String(limit),
    offset: String(offset),
  });

  const result = await requestBrowserJson<{ items?: HistorySummaryItem[]; pagination?: HistoryPagination }>(`/api/history-summaries?${params.toString()}`, {
    method: 'GET',
  });

  if (result.error) {
    console.error('[history-client] failed to load summaries:', result.error.message);
    return {
      items: [],
      pagination: { hasMore: false, nextOffset: null },
    };
  }

  return {
    items: result.data?.items || [],
    pagination: result.data?.pagination || { hasMore: false, nextOffset: null },
  };
}

export async function loadHistorySummaries(type: HistoryType): Promise<HistorySummaryItem[]> {
  const items: HistorySummaryItem[] = [];
  let offset = 0;

  for (let page = 0; page < HISTORY_MAX_PAGES; page += 1) {
    const result = await loadHistorySummariesPage(type, {
      limit: HISTORY_PAGE_SIZE,
      offset,
    });

    items.push(...result.items);
    if (!result.pagination.hasMore || result.pagination.nextOffset == null) {
      break;
    }

    offset = result.pagination.nextOffset;
  }

  return items;
}

export async function loadHistoryRestore(
  type: HistoryType,
  id: string,
  timezone?: string,
): Promise<HistoryRestorePayload | null> {
  const query = new URLSearchParams({
    type,
    id,
  });
  if (timezone) {
    query.set('timezone', timezone);
  }

  const result = await requestBrowserJson<{ item?: HistoryRestorePayload | null }>(`/api/history-summaries?${query.toString()}`, {
    method: 'GET',
  });

  if (result.error) {
    console.error('[history-client] failed to load restore payload:', result.error.message);
    return null;
  }

  return result.data?.item ?? null;
}

export async function deleteHistorySummary(type: HistoryType, id: string): Promise<boolean> {
  const query = new URLSearchParams({
    type,
    id,
  });

  const result = await requestBrowserJson<{ success?: boolean }>(`/api/history-summaries?${query.toString()}`, {
    method: 'DELETE',
  });

  if (result.error) {
    console.error('[history-client] failed to delete history item:', result.error.message);
    return false;
  }

  return result.data?.success === true;
}

export function applyHistoryRestorePayload(payload: HistoryRestorePayload) {
  writeSessionJSON(payload.sessionKey, payload.sessionData);
  if (payload.useTimestamp) {
    return `${payload.detailPath}?from=history&t=${Date.now()}`;
  }
  return payload.detailPath;
}

export async function resolveHistoryConversationId(
  type: HistoryType,
  id: string,
  sessionKey?: string,
): Promise<string | null> {
  const payload = await loadHistoryRestore(type, id);
  const conversationId = typeof payload?.sessionData?.conversationId === 'string'
    ? payload.sessionData.conversationId
    : null;

  if (conversationId && sessionKey) {
    updateSessionJSON<Record<string, unknown>>(sessionKey, (prev) => ({
      ...(prev || {}),
      conversationId,
    }));
  }

  return conversationId;
}
