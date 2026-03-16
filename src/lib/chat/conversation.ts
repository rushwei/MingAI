/**
 * 对话历史访问层
 *
 * 浏览器侧只调用 Conversations HTTP API，不再直接查库。
 */

import { hydrateConversationMessages } from '@/lib/ai/ai-analysis-query';
import type { AIPersonality, ChatMessage, Conversation } from '@/types';

export interface ConversationWithContext extends Conversation {
    baziContext?: string;
    ziweiContext?: string;
}

export interface PaginatedMessages {
    messages: ChatMessage[];
    total: number;
    hasMore: boolean;
}

type ConversationApiRow = {
    id: string;
    user_id: string;
    bazi_chart_id?: string | null;
    ziwei_chart_id?: string | null;
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

type ConversationContextResponse = {
    baziName?: string;
    ziweiName?: string;
};

const JSON_HEADERS = { 'Content-Type': 'application/json' };

const normalizePersonality = (value?: string | null): AIPersonality => {
    if (
        value === 'bazi'
        || value === 'ziwei'
        || value === 'dream'
        || value === 'mangpai'
        || value === 'general'
        || value === 'tarot'
        || value === 'liuyao'
        || value === 'mbti'
        || value === 'hepan'
    ) {
        return value;
    }
    return 'general';
};

function toConversation(row: ConversationApiRow): Conversation {
    return {
        id: row.id,
        userId: row.user_id,
        baziChartId: row.bazi_chart_id ?? undefined,
        ziweiChartId: row.ziwei_chart_id ?? undefined,
        personality: normalizePersonality(row.personality),
        title: row.title || '新对话',
        messages: hydrateConversationMessages(row.messages || [], row.source_data || undefined),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        sourceType: row.source_type || 'chat',
        sourceData: row.source_data || undefined,
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
    baziChartId?: string;
    ziweiChartId?: string;
}): Promise<string | null> {
    void params.userId;

    const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({
            personality: params.personality || 'general',
            title: params.title || '新对话',
            baziChartId: params.baziChartId ?? null,
            ziweiChartId: params.ziweiChartId ?? null,
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

export async function loadConversations(userId: string): Promise<Conversation[]> {
    void userId;

    const response = await fetch('/api/conversations?limit=50', {
        credentials: 'include',
    });

    if (!response.ok) {
        console.error('[conversation] 加载对话列表失败');
        return [];
    }

    const payload = await parseJson<{ conversations?: ConversationApiRow[] }>(response);
    return (payload?.conversations || []).map(toConversation);
}

export async function loadConversation(conversationId: string): Promise<Conversation | null> {
    const response = await fetch(`/api/conversations/${conversationId}`, {
        credentials: 'include',
    });

    if (!response.ok) {
        console.error('[conversation] 加载对话失败');
        return null;
    }

    const payload = await parseJson<{ conversation?: ConversationApiRow | null }>(response);
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

export async function updateConversationPersonality(
    conversationId: string,
    personality: AIPersonality
): Promise<boolean> {
    const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'PATCH',
        headers: JSON_HEADERS,
        body: JSON.stringify({ personality }),
    });

    if (!response.ok) {
        console.error('[conversation] 更新人格失败');
        return false;
    }

    return true;
}

export async function updateConversationCharts(
    conversationId: string,
    charts: { baziChartId?: string | null; ziweiChartId?: string | null }
): Promise<boolean> {
    const response = await fetch(`/api/conversations/${conversationId}`, {
        method: 'PATCH',
        headers: JSON_HEADERS,
        body: JSON.stringify({
            baziChartId: charts.baziChartId ?? null,
            ziweiChartId: charts.ziweiChartId ?? null,
        }),
    });

    if (!response.ok) {
        console.error('[conversation] 更新对话命盘失败');
        return false;
    }

    return true;
}

export async function getConversationContext(conversationId: string): Promise<string> {
    const response = await fetch(`/api/conversations/${conversationId}?includeContext=1`, {
        credentials: 'include',
    });

    if (!response.ok) {
        return '';
    }

    const payload = await parseJson<{
        context?: ConversationContextResponse | null;
    }>(response);

    const parts: string[] = [];
    if (payload?.context?.baziName) {
        parts.push(`用户八字命盘(${payload.context.baziName})已关联`);
    }
    if (payload?.context?.ziweiName) {
        parts.push(`用户紫微命盘(${payload.context.ziweiName})已关联`);
    }

    return parts.join('。');
}

export function generateConversationTitle(messages: ChatMessage[]): string {
    const firstUserMessage = messages.find((message) => message.role === 'user');
    if (!firstUserMessage) return '新对话';

    const content = firstUserMessage.content.trim();
    if (content.length <= 20) return content;
    return `${content.substring(0, 20)}...`;
}

export async function loadConversationMessages(
    conversationId: string,
    options: {
        limit?: number;
        offset?: number;
    } = {}
): Promise<PaginatedMessages | null> {
    const conversation = await loadConversation(conversationId);
    if (!conversation) {
        return null;
    }

    const { limit = 20, offset = 0 } = options;
    const allMessages = conversation.messages || [];
    const total = allMessages.length;
    const startIndex = Math.max(0, total - offset - limit);
    const endIndex = Math.max(0, total - offset);

    return {
        messages: allMessages.slice(startIndex, endIndex),
        total,
        hasMore: startIndex > 0,
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

export async function loadMoreMessages(
    conversationId: string,
    currentCount: number,
    batchSize: number = 20
): Promise<PaginatedMessages | null> {
    return loadConversationMessages(conversationId, {
        limit: batchSize,
        offset: currentCount,
    });
}
