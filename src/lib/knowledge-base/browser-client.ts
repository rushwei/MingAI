import { requestBrowserData } from '@/lib/browser-api';
import type { KnowledgeBaseWeight } from '@/lib/knowledge-base/types';

export type KnowledgeBaseSummary = {
  id: string;
  name: string;
  description: string | null;
  weight?: KnowledgeBaseWeight;
  created_at?: string;
  updated_at?: string;
};

export type ArchivedSource = {
  id: string;
  kb_id: string;
  source_type: string;
  source_id: string;
  created_at?: string;
  preview?: string | null;
};

export type KnowledgeBaseArchivePage = {
  items: ArchivedSource[];
  hasMore: boolean;
  nextOffset: number | null;
};

export const KNOWLEDGE_BASE_ARCHIVE_CHANGED_EVENT = 'mingai:knowledge-base:archive-changed';

export type KnowledgeBaseArchiveChangedDetail = {
  action: 'archive' | 'unarchive';
  sourceType: string;
  sourceId: string;
  kbId: string;
};

type KnowledgeBaseArchivePayload = {
  archivedSources?: ArchivedSource[];
  pagination?: {
    hasMore?: boolean;
    nextOffset?: number | null;
  };
};

export function dispatchKnowledgeBaseArchiveChanged(detail: KnowledgeBaseArchiveChangedDetail) {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent(KNOWLEDGE_BASE_ARCHIVE_CHANGED_EVENT, { detail }));
}

async function requestKnowledgeBaseJson<T>(
  url: string,
  init?: RequestInit,
  fallbackMessage = '请求失败',
): Promise<T> {
  return await requestBrowserData<T>(url, init, { fallbackMessage }) as T;
}

export async function listKnowledgeBases(): Promise<KnowledgeBaseSummary[]> {
  const data = await requestKnowledgeBaseJson<{ knowledgeBases?: KnowledgeBaseSummary[] }>(
    '/api/knowledge-base',
    { method: 'GET' },
    '获取知识库失败',
  );

  return Array.isArray(data.knowledgeBases) ? data.knowledgeBases : [];
}

export async function createKnowledgeBase(input: {
  name: string;
  description?: string | null;
  weight?: KnowledgeBaseWeight;
}): Promise<KnowledgeBaseSummary> {
  return await requestKnowledgeBaseJson<KnowledgeBaseSummary>(
    '/api/knowledge-base',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
    '创建知识库失败',
  );
}

export async function updateKnowledgeBase(
  id: string,
  input: {
    name?: string;
    description?: string | null;
    weight?: KnowledgeBaseWeight;
  },
): Promise<KnowledgeBaseSummary> {
  return await requestKnowledgeBaseJson<KnowledgeBaseSummary>(
    `/api/knowledge-base/${id}`,
    {
      method: 'PATCH',
      body: JSON.stringify(input),
    },
    '更新知识库失败',
  );
}

export async function deleteKnowledgeBase(id: string): Promise<void> {
  await requestKnowledgeBaseJson<{ success?: boolean }>(
    `/api/knowledge-base/${id}`,
    { method: 'DELETE' },
    '删除知识库失败',
  );
}

export async function listKnowledgeBaseArchives(
  kbId: string,
  options: { limit?: number; offset?: number } = {},
): Promise<KnowledgeBaseArchivePage> {
  const params = new URLSearchParams({
    kbId,
    limit: String(options.limit ?? 20),
    offset: String(options.offset ?? 0),
  });
  const data = await requestKnowledgeBaseJson<KnowledgeBaseArchivePayload>(
    `/api/knowledge-base/archive?${params.toString()}`,
    { method: 'GET' },
    '获取归档失败',
  );

  return {
    items: Array.isArray(data.archivedSources) ? data.archivedSources : [],
    hasMore: data.pagination?.hasMore === true,
    nextOffset: typeof data.pagination?.nextOffset === 'number'
      ? data.pagination.nextOffset
      : null,
  };
}

export async function ingestKnowledgeBaseSource(input: {
  kbId: string;
  sourceType: string;
  sourceId: string;
  sourceMeta?: Record<string, unknown>;
}): Promise<Record<string, unknown>> {
  const result = await requestKnowledgeBaseJson<Record<string, unknown>>(
    '/api/knowledge-base/ingest',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
    '加入知识库失败',
  );

  dispatchKnowledgeBaseArchiveChanged({
    action: 'archive',
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    kbId: input.kbId,
  });

  return result;
}

export async function removeKnowledgeBaseArchive(
  id: string,
  detail?: Pick<KnowledgeBaseArchiveChangedDetail, 'sourceType' | 'sourceId' | 'kbId'>,
): Promise<void> {
  await requestKnowledgeBaseJson<{ success?: boolean }>(
    `/api/knowledge-base/archive/${id}`,
    { method: 'DELETE' },
    '取消归档失败',
  );

  if (detail) {
    dispatchKnowledgeBaseArchiveChanged({
      action: 'unarchive',
      ...detail,
    });
  }
}

export async function uploadKnowledgeBaseFile(
  kbId: string,
  file: File,
): Promise<Record<string, unknown>> {
  const formData = new FormData();
  formData.append('kbId', kbId);
  formData.append('file', file);

  return await requestKnowledgeBaseJson<Record<string, unknown>>(
    '/api/knowledge-base/upload',
    {
      method: 'POST',
      body: formData,
    },
    '上传失败',
  );
}
