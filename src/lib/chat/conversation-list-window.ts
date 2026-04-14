import { CONVERSATION_PAGE_SIZE } from '@/lib/chat/conversation';

export const CONVERSATION_LIST_ESTIMATED_ROW_HEIGHT_PX = 52;
export const CONVERSATION_LIST_BUFFER_ROWS = 2;

function normalizePositiveInteger(value: number | null | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return 0;
  }

  return Math.ceil(value);
}

export function normalizeConversationWindowTargetCount({
  loadedCount,
  requestedCount,
  fallbackCount = CONVERSATION_PAGE_SIZE,
}: {
  loadedCount: number;
  requestedCount?: number | null;
  fallbackCount?: number;
}): number {
  return Math.max(
    normalizePositiveInteger(loadedCount),
    normalizePositiveInteger(requestedCount),
    normalizePositiveInteger(fallbackCount),
  );
}

export function resolveConversationViewportTargetCount({
  viewportHeight,
  estimatedRowHeight = CONVERSATION_LIST_ESTIMATED_ROW_HEIGHT_PX,
  bufferRows = CONVERSATION_LIST_BUFFER_ROWS,
  minimumCount = CONVERSATION_PAGE_SIZE,
  pageSize = CONVERSATION_PAGE_SIZE,
}: {
  viewportHeight: number;
  estimatedRowHeight?: number;
  bufferRows?: number;
  minimumCount?: number;
  pageSize?: number;
}): number {
  const normalizedViewportHeight = normalizePositiveInteger(viewportHeight);
  const normalizedRowHeight = Math.max(normalizePositiveInteger(estimatedRowHeight), 1);
  const normalizedPageSize = Math.max(normalizePositiveInteger(pageSize), 1);
  const normalizedMinimumCount = Math.max(
    normalizePositiveInteger(minimumCount),
    normalizedPageSize,
  );

  if (normalizedViewportHeight === 0) {
    return normalizedMinimumCount;
  }

  const visibleRows = Math.ceil(normalizedViewportHeight / normalizedRowHeight);
  const desiredRows = visibleRows + normalizePositiveInteger(bufferRows);

  return Math.max(
    normalizedMinimumCount,
    Math.ceil(desiredRows / normalizedPageSize) * normalizedPageSize,
  );
}
