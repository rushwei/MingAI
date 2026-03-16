import type { SupabaseClient } from '@supabase/supabase-js';
import type { ChatMessage } from '@/types';

type StoredConversationMessageRow = {
    sequence: number;
    message_id: string;
    role: ChatMessage['role'];
    content: string;
    metadata: Record<string, unknown> | null;
    created_at: string;
};

type MessagePageOptions = {
    limit: number;
    offset: number;
};

function isConversationMessageInfraMissing(error: { message?: string; code?: string } | null | undefined) {
    const text = `${error?.code || ''} ${error?.message || ''}`.toLowerCase();
    return text.includes('replace_conversation_messages')
        || text.includes('conversation_messages')
        || text.includes('does not exist')
        || text.includes('not found');
}

function toStoredConversationMessage(
    conversationId: string,
    message: ChatMessage,
    sequence: number
) {
    const { id, role, content, createdAt, ...metadata } = message;
    return {
        conversation_id: conversationId,
        sequence,
        message_id: id,
        role,
        content,
        metadata,
        created_at: createdAt,
    };
}

function fromStoredConversationMessage(row: StoredConversationMessageRow): ChatMessage {
    return {
        id: row.message_id,
        role: row.role,
        content: row.content,
        createdAt: row.created_at,
        ...((row.metadata || {}) as Omit<ChatMessage, 'id' | 'role' | 'content' | 'createdAt'>),
    };
}

function normalizeFallbackMessages(messages: unknown[] | null | undefined): ChatMessage[] {
    if (!Array.isArray(messages)) return [];
    return messages.filter((message): message is ChatMessage => (
        !!message
        && typeof message === 'object'
        && typeof (message as ChatMessage).id === 'string'
        && typeof (message as ChatMessage).role === 'string'
        && typeof (message as ChatMessage).content === 'string'
    ));
}

export async function replaceConversationMessages(
    supabase: SupabaseClient,
    conversationId: string,
    messages: ChatMessage[]
) {
    const rpc = (supabase as unknown as {
        rpc?: (fn: string, args: Record<string, unknown>) => Promise<{ error: unknown }>;
    }).rpc;

    if (typeof rpc !== 'function') {
        return { error: null };
    }

    const { error } = await rpc('replace_conversation_messages', {
        p_conversation_id: conversationId,
        p_messages: messages,
    });

    if (isConversationMessageInfraMissing(error || undefined)) {
        return { error: null };
    }

    return { error };
}

export async function loadAllConversationMessages(
    supabase: SupabaseClient,
    conversationId: string,
    fallbackMessages?: unknown[] | null
) {
    const { data, error } = await supabase
        .from('conversation_messages')
        .select('sequence, message_id, role, content, metadata, created_at')
        .eq('conversation_id', conversationId)
        .order('sequence', { ascending: true });

    if (error) {
        if (isConversationMessageInfraMissing(error)) {
            return {
                messages: normalizeFallbackMessages(fallbackMessages),
                error: null,
            };
        }
        return {
            messages: normalizeFallbackMessages(fallbackMessages),
            error,
        };
    }

    if (!data?.length) {
        return {
            messages: normalizeFallbackMessages(fallbackMessages),
            error: null,
        };
    }

    return {
        messages: (data as StoredConversationMessageRow[]).map(fromStoredConversationMessage),
        error: null,
    };
}

export async function loadConversationMessagePage(
    supabase: SupabaseClient,
    conversationId: string,
    options: MessagePageOptions,
    fallbackMessages?: unknown[] | null
) {
    const { limit, offset } = options;
    const { data, error, count } = await supabase
        .from('conversation_messages')
        .select('sequence, message_id, role, content, metadata, created_at', { count: 'exact' })
        .eq('conversation_id', conversationId)
        .order('sequence', { ascending: false })
        .range(offset, offset + limit - 1);

    if (error) {
        if (isConversationMessageInfraMissing(error)) {
            const fallback = normalizeFallbackMessages(fallbackMessages);
            const total = fallback.length;
            const startIndex = Math.max(0, total - offset - limit);
            const endIndex = Math.max(0, total - offset);
            return {
                messages: fallback.slice(startIndex, endIndex),
                total,
                hasMore: startIndex > 0,
                error: null,
            };
        }
        const fallback = normalizeFallbackMessages(fallbackMessages);
        const total = fallback.length;
        const startIndex = Math.max(0, total - offset - limit);
        const endIndex = Math.max(0, total - offset);
        return {
            messages: fallback.slice(startIndex, endIndex),
            total,
            hasMore: startIndex > 0,
            error,
        };
    }

    if (!data?.length && Array.isArray(fallbackMessages)) {
        const fallback = normalizeFallbackMessages(fallbackMessages);
        const total = fallback.length;
        const startIndex = Math.max(0, total - offset - limit);
        const endIndex = Math.max(0, total - offset);
        return {
            messages: fallback.slice(startIndex, endIndex),
            total,
            hasMore: startIndex > 0,
            error: null,
        };
    }

    const orderedMessages = (data as StoredConversationMessageRow[])
        .map(fromStoredConversationMessage)
        .reverse();

    return {
        messages: orderedMessages,
        total: count ?? orderedMessages.length,
        hasMore: (count ?? orderedMessages.length) > offset + orderedMessages.length,
        error: null,
    };
}

export function mapConversationMessagesForInsert(conversationId: string, messages: ChatMessage[]) {
    return messages.map((message, index) => toStoredConversationMessage(conversationId, message, index));
}
