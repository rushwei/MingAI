/**
 * 对话历史访问层
 *
 * 浏览器侧只调用 Conversations HTTP API，不再直接查库。
 */

import { hydrateConversationMessages } from '@/lib/ai/ai-analysis-query';
import { normalizeConversationSourceType } from '@/lib/source-contracts';
import type { AIPersonality, ChatMessage, Conversation, ConversationListItem } from '@/types';

export interface PaginatedMessages {
    messages: ChatMessage[];
    total: number;
    hasMore: boolean;
}

export interface PaginatedConversations {
    conversations: ConversationListItem[];
    pagination: {
        hasMore: boolean;
        nextOffset: number | null;
    };
}

type ConversationDetailApiRow = {
    id: string;
    user_id: string;
    personality?: string | null;
    title?: string | null;
    messages?: ChatMessage[] | null;
    created_at: string;
    updated_at: string;
    source_type?: string | null;
    source_data?: Record<string, unknown> | null;
    is_archived?: boolean | null;
    archived_kb_ids?: string[] | null;
};

type ConversationListApiRow = {
    id: string;
    user_id: string;
    personality?: string | null;
    title?: string | null;
    created_at: string;
    updated_at: string;
    source_type?: string | null;
    question_preview?: string | null;
    is_archived?: boolean | null;
    archived_kb_ids?: string[] | null;
};

const JSON_HEADERS = { 'Content-Type': 'application/json' };
const CONVERSATION_PAGE_SIZE = 7;
const CONVERSATION_MAX_PAGES = 50;
export const DEFAULT_CONVERSATION_TITLE = '新对话';

const AI_PERSONALITY_VALUES: ReadonlySet<string> = new Set<AIPersonality>([
    'bazi', 'ziwei', 'dream', 'mangpai', 'tarot', 'liuyao',
    'mbti', 'hepan', 'qimen', 'daliuren', 'general',
]);

const normalizePersonality = (value?: string | null): AIPersonality => {
    if (value && AI_PERSONALITY_VALUES.has(value)) {
        return value as AIPersonality;
    }
    return 'general';
};

function toConversation(row: ConversationDetailApiRow): Conversation {
    return {
        id: row.id,
        userId: row.user_id,
        personality: normalizePersonality(row.personality),
        title: row.title || DEFAULT_CONVERSATION_TITLE,
        messages: hydrateConversationMessages(row.messages || [], row.source_data || undefined),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        sourceType: normalizeConversationSourceType(row.source_type),
        sourceData: row.source_data || undefined,
        isArchived: row.is_archived ?? false,
        archivedKbIds: row.archived_kb_ids ?? [],
    };
}

function toConversationListItem(row: ConversationListApiRow): ConversationListItem {
    return {
        id: row.id,
        userId: row.user_id,
        personality: normalizePersonality(row.personality),
        title: row.title || DEFAULT_CONVERSATION_TITLE,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        sourceType: normalizeConversationSourceType(row.source_type),
        questionPreview: typeof row.question_preview === 'string' ? row.question_preview : null,
        isArchived: row.is_archived ?? false,
        archivedKbIds: row.archived_kb_ids ?? [],
    };
}

async function parseJson<T>(response: Response): Promise<T | null> {
    return await response.json().catch(() => null) as T | null;
}

export async function createConversation(params: {
    userId: string;
    personality?: AIPersonality;
    title?: string;
}): Promise<string | null> {
    void params.userId;

    const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({
            personality: params.personality || 'general',
            title: params.title || DEFAULT_CONVERSATION_TITLE,
            messages: [],
        }),
    });

    if (!response.ok) {
        console.error('[conversation] 创建对话失败');
        return null;
    }

    const payload = await parseJson<{ id?: string | null }>(response);
    return payload?.id || null;
}

export async function loadConversations(
    userId: string,
    options: {
        limit?: number;
        offset?: number;
        signal?: AbortSignal;
    } = {},
): Promise<PaginatedConversations | null> {
    void userId;
    const { limit = CONVERSATION_PAGE_SIZE, offset = 0, signal } = options;
    const response = await fetch(`/api/conversations?limit=${limit}&offset=${offset}`, {
        credentials: 'include',
        signal,
    });

    if (!response.ok) {
        console.error('[conversation] 加载对话列表失败');
        return null;
    }

    const payload = await parseJson<{
        conversations?: ConversationListApiRow[];
        pagination?: { hasMore?: boolean; nextOffset?: number | null };
    }>(response);

    return {
        conversations: (payload?.conversations || []).map(toConversationListItem),
        pagination: {
            hasMore: payload?.pagination?.hasMore === true,
            nextOffset: payload?.pagination?.nextOffset ?? null,
        },
    };
}

export async function loadAllConversations(
    userId: string,
    options: {
        pageSize?: number;
        signal?: AbortSignal;
    } = {},
): Promise<ConversationListItem[]> {
    const { pageSize = CONVERSATION_PAGE_SIZE, signal } = options;
    const rows: ConversationListItem[] = [];
    let offset = 0;

    for (let page = 0; page < CONVERSATION_MAX_PAGES; page += 1) {
        const payload = await loadConversations(userId, {
            limit: pageSize,
            offset,
            signal,
        });

        if (!payload) {
            return [];
        }

        rows.push(...payload.conversations);
        if (!payload.pagination.hasMore || payload.pagination.nextOffset == null) {
            break;
        }

        offset = payload.pagination.nextOffset;
    }

    return rows;
}

export async function loadConversationWindow(
    userId: string,
    options: {
        targetCount: number;
        preserveIds?: string[];
        pageSize?: number;
        signal?: AbortSignal;
    }
): Promise<PaginatedConversations | null> {
    const { targetCount, preserveIds = [], pageSize = CONVERSATION_PAGE_SIZE, signal } = options;
    const minimumCount = Math.max(targetCount, pageSize);
    const remainingIds = new Set(preserveIds);
    const rows: ConversationListItem[] = [];
    let offset = 0;
    let hasMore = false;
    let nextOffset: number | null = null;

    for (let page = 0; page < CONVERSATION_MAX_PAGES; page += 1) {
        const payload = await loadConversations(userId, {
            limit: pageSize,
            offset,
            signal,
        });

        if (!payload) {
            return null;
        }

        rows.push(...payload.conversations);
        payload.conversations.forEach((conversation) => {
            remainingIds.delete(conversation.id);
        });
        hasMore = payload.pagination.hasMore;
        nextOffset = payload.pagination.nextOffset;

        if (
            (rows.length >= minimumCount && remainingIds.size === 0)
            || !hasMore
            || nextOffset == null
        ) {
            break;
        }

        offset = nextOffset;
    }

    return {
        conversations: rows,
        pagination: {
            hasMore,
            nextOffset,
        },
    };
}

export async function loadConversation(conversationId: string): Promise<Conversation | null> {
    const response = await fetch(`/api/conversations/${conversationId}`, {
        credentials: 'include',
    });

    if (!response.ok) {
        console.error('[conversation] 加载对话失败');
        return null;
    }

    const payload = await parseJson<{ conversation?: ConversationDetailApiRow | null }>(response);
    return payload?.conversation ? toConversation(payload.conversation) : null;
}

export async function saveConversation(
    conversationId: string,
    messages: ChatMessage[],
    title?: string
): Promise<boolean> {
    const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'PATCH',
        headers: JSON_HEADERS,
        body: JSON.stringify({
            messages,
            ...(title ? { title } : {}),
        }),
    });

    if (!response.ok) {
        console.error('[conversation] 保存对话失败');
        return false;
    }

    return true;
}

export async function deleteConversation(conversationId: string): Promise<boolean> {
    const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'DELETE',
    });

    if (!response.ok) {
        console.error('[conversation] 删除对话失败');
        return false;
    }

    return true;
}

export async function renameConversation(
    conversationId: string,
    title: string
): Promise<boolean> {
    const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'PATCH',
        headers: JSON_HEADERS,
        body: JSON.stringify({ title }),
    });

    if (!response.ok) {
        console.error('[conversation] 重命名对话失败');
        return false;
    }

    return true;
}

export async function loadConversationMessages(
    conversationId: string,
    options: {
        limit?: number;
        offset?: number;
    } = {}
): Promise<PaginatedMessages | null> {
    const { limit = 20, offset = 0 } = options;
    const params = new URLSearchParams({
        messageLimit: String(limit),
        messageOffset: String(offset),
    });

    const response = await fetch(`/api/conversations/${conversationId}?${params.toString()}`, {
        credentials: 'include',
    });

    if (!response.ok) {
        console.error('[conversation] 加载对话消息失败');
        return null;
    }

    const payload = await parseJson<{
        conversation?: ConversationDetailApiRow | null;
        pagination?: {
            total?: number;
            hasMore?: boolean;
        } | null;
        messagePage?: {
            total?: number;
            hasMore?: boolean;
        } | null;
    }>(response);

    if (!payload?.conversation) {
        return null;
    }

    return {
        messages: hydrateConversationMessages(payload.conversation.messages || [], payload.conversation.source_data || undefined),
        total: payload.pagination?.total ?? payload.messagePage?.total ?? payload.conversation.messages?.length ?? 0,
        hasMore: payload.pagination?.hasMore ?? payload.messagePage?.hasMore ?? false,
    };
}

export async function loadInitialMessages(
    conversationId: string,
    initialCount: number = 20
): Promise<PaginatedMessages | null> {
    return loadConversationMessages(conversationId, {
        limit: initialCount,
        offset: 0,
    });
}
