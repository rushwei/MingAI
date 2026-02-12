import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { ChatMessage } from '@/types';
import type { DataSourceType } from '@/lib/data-sources/types';
import { getProvider } from '@/lib/data-sources';
import { getServiceRoleClient } from '@/lib/api-utils';
import { generateEmbeddings } from '@/lib/knowledge-base/embedding-config';
import type { IngestResult } from '@/lib/knowledge-base/types';
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/supabase-env';

interface ChunkConfig {
    maxChunkSize: number;
    overlapSize: number;
    separators: string[];
}

const DEFAULT_CHUNK_CONFIG: ChunkConfig = {
    maxChunkSize: 500,
    overlapSize: 50,
    separators: ['\n\n', '\n', '。', '！', '？', '.', '!', '?', ' ']
};

export interface IngestOptions {
    chunkConfig?: Partial<ChunkConfig>;
}

interface ChunkData {
    content: string;
    sourceType: 'conversation' | 'record' | 'file' | 'chat_message' | DataSourceType;
    sourceId: string;
    chunkIndex: number;
    metadata: Record<string, unknown>;
}

interface IngestResultWithVectors extends IngestResult {
    processed?: number;
    skipped?: number;
    alreadyExists?: number;
}

async function createSupabaseClient() {
    const cookieStore = await cookies();
    return createServerClient(
        getSupabaseUrl(),
        getSupabaseAnonKey(),
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        for (const { name, value, options } of cookiesToSet) {
                            cookieStore.set(name, value, options);
                        }
                    } catch {
                        // 只读 cookies 上下文无法写入时忽略
                    }
                },
            },
        }
    );
}

export async function ingestConversation(
    kbId: string,
    conversationId: string,
    options?: IngestOptions
): Promise<IngestResult> {
    const supabase = await createSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: conversation } = await supabase
        .from('conversations')
        .select('id, user_id, messages')
        .eq('id', conversationId)
        .eq('user_id', user.id)
        .maybeSingle();

    if (!conversation) throw new Error('Conversation not found');

    const messagePairs = extractMessagePairs((conversation.messages as ChatMessage[]) || []);
    const chunks: ChunkData[] = [];

    for (const pair of messagePairs) {
        const content = formatMessagePair(pair);
        const pairChunks = chunkText(content, {
            ...DEFAULT_CHUNK_CONFIG,
            ...(options?.chunkConfig || {})
        });
        const baseIndex = chunks.length;
        chunks.push(...pairChunks.map((c, i) => ({
            content: c,
            sourceType: 'conversation' as const,
            sourceId: conversationId,
            chunkIndex: baseIndex + i,
            metadata: {
                message_ids: [pair.user.id, pair.assistant.id]
            }
        })));
    }

    return await upsertEntries(kbId, chunks);
}

export async function ingestRecord(
    kbId: string,
    recordId: string,
    options?: IngestOptions
): Promise<IngestResult> {
    const supabase = await createSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: record } = await supabase
        .from('ming_records')
        .select('id, user_id, title, content, tags, category')
        .eq('id', recordId)
        .eq('user_id', user.id)
        .maybeSingle();

    if (!record) throw new Error('Record not found');

    const content = [
        `## ${record.title}`,
        record.content,
        Array.isArray(record.tags) && record.tags.length ? `标签：${record.tags.join(', ')}` : ''
    ].filter(Boolean).join('\n\n');

    const textChunks = chunkText(content, {
        ...DEFAULT_CHUNK_CONFIG,
        ...(options?.chunkConfig || {})
    });

    const chunks: ChunkData[] = textChunks.map((c, i) => ({
        content: c,
        sourceType: 'record' as const,
        sourceId: recordId,
        chunkIndex: i,
        metadata: {
            category: record.category,
            tags: record.tags
        }
    }));

    return await upsertEntries(kbId, chunks);
}

export async function ingestFile(_kbId: string, _file: File, _options?: IngestOptions): Promise<IngestResult> {
    const supabase = await createSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const content = await _file.text();
    if (!content.trim()) {
        return { entriesCreated: 0, chunks: 0 };
    }

    const textChunks = chunkText(content, {
        ...DEFAULT_CHUNK_CONFIG,
        ...(_options?.chunkConfig || {})
    });

    const chunks: ChunkData[] = textChunks.map((c, i) => ({
        content: c,
        sourceType: 'file',
        sourceId: _file.name,
        chunkIndex: i,
        metadata: {
            file_name: _file.name,
            file_type: _file.type || null
        }
    }));

    return await upsertEntries(_kbId, chunks);
}

export async function ingestConversationAsService(
    kbId: string,
    conversationId: string,
    userId: string,
    options?: IngestOptions
): Promise<IngestResult> {
    const supabase = getServiceRoleClient();
    const { data: conversation } = await supabase
        .from('conversations')
        .select('id, user_id, messages')
        .eq('id', conversationId)
        .eq('user_id', userId)
        .maybeSingle();

    if (!conversation) throw new Error('Conversation not found');

    const messagePairs = extractMessagePairs((conversation.messages as ChatMessage[]) || []);
    const chunks: ChunkData[] = [];

    for (const pair of messagePairs) {
        const content = formatMessagePair(pair);
        const pairChunks = chunkText(content, {
            ...DEFAULT_CHUNK_CONFIG,
            ...(options?.chunkConfig || {})
        });
        const baseIndex = chunks.length;
        chunks.push(...pairChunks.map((c, i) => ({
            content: c,
            sourceType: 'conversation' as const,
            sourceId: conversationId,
            chunkIndex: baseIndex + i,
            metadata: {
                message_ids: [pair.user.id, pair.assistant.id]
            }
        })));
    }

    return await upsertEntriesAsService(kbId, chunks);
}

export async function ingestChatMessageAsService(
    kbId: string,
    conversationId: string,
    messageId: string,
    userId: string,
    options?: IngestOptions
): Promise<IngestResult> {
    const supabase = getServiceRoleClient();
    const { data: conversation } = await supabase
        .from('conversations')
        .select('id, user_id, messages')
        .eq('id', conversationId)
        .eq('user_id', userId)
        .maybeSingle();

    if (!conversation) throw new Error('Conversation not found');

    const messages = (conversation.messages as ChatMessage[]) || [];
    const index = messages.findIndex(m => m.id === messageId);
    if (index < 0) throw new Error('Message not found');

    const target = messages[index];
    if (!target.content?.trim()) {
        return { entriesCreated: 0, chunks: 0 };
    }

    let previousUser: ChatMessage | null = null;
    for (let i = index - 1; i >= 0; i--) {
        if (messages[i]?.role === 'user' && messages[i]?.content?.trim()) {
            previousUser = messages[i];
            break;
        }
    }

    const content = [
        previousUser ? `用户：${previousUser.content}` : '',
        `${target.role === 'assistant' ? 'AI' : '用户'}：${target.content}`
    ].filter(Boolean).join('\n\n');

    const textChunks = chunkText(content, {
        ...DEFAULT_CHUNK_CONFIG,
        ...(options?.chunkConfig || {})
    });

    const chunks: ChunkData[] = textChunks.map((c, i) => ({
        content: c,
        sourceType: 'chat_message',
        sourceId: messageId,
        chunkIndex: i,
        metadata: {
            conversation_id: conversationId,
            message_id: messageId,
            user_message_id: previousUser?.id || null,
            role: target.role
        }
    }));

    return await upsertEntriesAsService(kbId, chunks);
}

export async function ingestRecordAsService(
    kbId: string,
    recordId: string,
    userId: string,
    options?: IngestOptions
): Promise<IngestResult> {
    const supabase = getServiceRoleClient();
    const { data: record } = await supabase
        .from('ming_records')
        .select('id, user_id, title, content, tags, category')
        .eq('id', recordId)
        .eq('user_id', userId)
        .maybeSingle();

    if (!record) throw new Error('Record not found');

    const content = [
        `## ${record.title}`,
        record.content,
        Array.isArray(record.tags) && record.tags.length ? `标签：${record.tags.join(', ')}` : ''
    ].filter(Boolean).join('\n\n');

    const textChunks = chunkText(content, {
        ...DEFAULT_CHUNK_CONFIG,
        ...(options?.chunkConfig || {})
    });

    const chunks: ChunkData[] = textChunks.map((c, i) => ({
        content: c,
        sourceType: 'record' as const,
        sourceId: recordId,
        chunkIndex: i,
        metadata: {
            category: record.category,
            tags: record.tags
        }
    }));

    return await upsertEntriesAsService(kbId, chunks);
}

export async function ingestFileAsService(
    kbId: string,
    file: { name: string; type: string | null; content: string },
    _userId: string,
    options?: IngestOptions
): Promise<IngestResult> {
    const text = file.content || '';
    if (!text.trim()) {
        return { entriesCreated: 0, chunks: 0 };
    }

    const textChunks = chunkText(text, {
        ...DEFAULT_CHUNK_CONFIG,
        ...(options?.chunkConfig || {})
    });

    const chunks: ChunkData[] = textChunks.map((c, i) => ({
        content: c,
        sourceType: 'file',
        sourceId: file.name,
        chunkIndex: i,
        metadata: {
            file_name: file.name,
            file_type: file.type || null
        }
    }));

    return await upsertEntriesAsService(kbId, chunks);
}

export async function ingestDataSourceAsService(
    kbId: string,
    ref: { type: DataSourceType; id: string },
    userId: string,
    options?: IngestOptions
): Promise<IngestResult> {
    const provider = await getProvider(ref.type);
    const data = await provider.get(ref.id, userId);
    if (!data) throw new Error('Data source not found');

    const content = provider.formatForAI(data);
    const textChunks = chunkText(content, {
        ...DEFAULT_CHUNK_CONFIG,
        ...(options?.chunkConfig || {})
    });

    const chunks: ChunkData[] = textChunks.map((c, i) => ({
        content: c,
        sourceType: ref.type,
        sourceId: ref.id,
        chunkIndex: i,
        metadata: {}
    }));

    return await upsertEntriesAsService(kbId, chunks);
}

export function chunkText(text: string, config: ChunkConfig = DEFAULT_CHUNK_CONFIG): string[] {
    const { maxChunkSize, overlapSize, separators } = config;

    if (text.length <= maxChunkSize) {
        return [text];
    }

    for (const sep of separators) {
        const parts = text.split(sep);
        if (parts.length > 1) {
            const chunks: string[] = [];
            let current = '';

            for (const part of parts) {
                const candidate = current ? `${current}${sep}${part}` : part;
                if (candidate.length <= maxChunkSize) {
                    current = candidate;
                } else {
                    if (current) chunks.push(current);
                    current = part;
                }
            }

            if (current) chunks.push(current);
            return addOverlap(chunks, overlapSize);
        }
    }

    return forceChunk(text, maxChunkSize, overlapSize);
}

function addOverlap(chunks: string[], overlapSize: number): string[] {
    if (overlapSize <= 0) return chunks;
    const result: string[] = [];

    for (let i = 0; i < chunks.length; i++) {
        const current = chunks[i] || '';
        if (i === 0) {
            result.push(current);
            continue;
        }

        const prev = chunks[i - 1] || '';
        const overlap = prev.slice(Math.max(0, prev.length - overlapSize));
        result.push(`${overlap}${current}`);
    }

    return result;
}

function forceChunk(text: string, maxChunkSize: number, overlapSize: number): string[] {
    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
        const end = Math.min(start + maxChunkSize, text.length);
        chunks.push(text.slice(start, end));
        if (end >= text.length) break;
        start = Math.max(0, end - overlapSize);
    }

    return chunks;
}

function extractMessagePairs(messages: ChatMessage[]): Array<{ user: ChatMessage; assistant: ChatMessage }> {
    const pairs: Array<{ user: ChatMessage; assistant: ChatMessage }> = [];
    for (let i = 0; i < messages.length - 1; i++) {
        const current = messages[i];
        const next = messages[i + 1];
        if (current.role === 'user' && next.role === 'assistant') {
            if (current.content?.trim() && next.content?.trim()) {
                pairs.push({ user: current, assistant: next });
            }
        }
    }
    return pairs;
}

function formatMessagePair(pair: { user: ChatMessage; assistant: ChatMessage }): string {
    return [`用户：${pair.user.content}`, `AI：${pair.assistant.content}`].join('\n\n');
}

export async function upsertEntries(kbId: string, chunks: ChunkData[]): Promise<IngestResult> {
    const supabase = await createSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    if (chunks.length > 0) {
        const { sourceType, sourceId } = chunks[0];
        const sameSource = chunks.every(c => c.sourceType === sourceType && c.sourceId === sourceId);
        const contiguous = sameSource && chunks.every((c, i) => c.chunkIndex === i);
        if (contiguous) {
            const { error: cleanupError } = await supabase
                .from('knowledge_entries')
                .delete()
                .eq('kb_id', kbId)
                .eq('source_type', sourceType)
                .eq('source_id', sourceId)
                .gte('chunk_index', chunks.length);
            if (cleanupError) throw cleanupError;
        }
    }

    const entries = chunks.map(chunk => ({
        kb_id: kbId,
        content: chunk.content,
        content_vector: null,
        source_type: chunk.sourceType,
        source_id: chunk.sourceId,
        chunk_index: chunk.chunkIndex,
        metadata: chunk.metadata
    }));

    const { data, error } = await supabase
        .from('knowledge_entries')
        .upsert(entries, {
            onConflict: 'kb_id,source_type,source_id,chunk_index'
        })
        .select('id');

    if (error) throw error;

    return {
        entriesCreated: (data || []).length,
        chunks: chunks.length
    };
}

export async function upsertEntriesAsService(kbId: string, chunks: ChunkData[]): Promise<IngestResult> {
    const supabase = getServiceRoleClient();

    if (chunks.length > 0) {
        const { sourceType, sourceId } = chunks[0];
        const sameSource = chunks.every(c => c.sourceType === sourceType && c.sourceId === sourceId);
        const contiguous = sameSource && chunks.every((c, i) => c.chunkIndex === i);
        if (contiguous) {
            const { error: cleanupError } = await supabase
                .from('knowledge_entries')
                .delete()
                .eq('kb_id', kbId)
                .eq('source_type', sourceType)
                .eq('source_id', sourceId)
                .gte('chunk_index', chunks.length);
            if (cleanupError) throw cleanupError;
        }
    }

    const entries = chunks.map(chunk => ({
        kb_id: kbId,
        content: chunk.content,
        content_vector: null,
        source_type: chunk.sourceType,
        source_id: chunk.sourceId,
        chunk_index: chunk.chunkIndex,
        metadata: chunk.metadata
    }));

    const { data, error } = await supabase
        .from('knowledge_entries')
        .upsert(entries, {
            onConflict: 'kb_id,source_type,source_id,chunk_index'
        })
        .select('id');

    if (error) throw error;

    return {
        entriesCreated: (data || []).length,
        chunks: chunks.length
    };
}

export async function backfillVectors(
    kbId: string,
    batchSize: number = 100
): Promise<IngestResultWithVectors> {
    const supabase = await createSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: entries } = await supabase
        .from('knowledge_entries')
        .select('id, content')
        .eq('kb_id', kbId)
        .is('content_vector', null)
        .limit(batchSize);

    if (!entries?.length) {
        return { entriesCreated: 0, chunks: 0, processed: 0, skipped: 0, alreadyExists: 0 };
    }

    const embeddingResult = await generateEmbeddings(entries.map(e => e.content as string));
    const { vectors, model, dimension } = embeddingResult;

    const updates = entries
        .map((entry, i) => ({
            id: entry.id as string,
            content_vector: vectors[i],
            metadata: {
                embedding_model: model,
                embedding_dim: dimension
            }
        }))
        .filter(u => Array.isArray(u.content_vector) && u.content_vector.length === dimension);

    if (updates.length === 0) {
        return { entriesCreated: 0, chunks: 0, processed: 0, skipped: entries.length, alreadyExists: 0 };
    }

    const { data, error } = await supabase.rpc('batch_update_vectors', {
        p_updates: updates,
        p_expected_dim: dimension,
        p_force_overwrite: false
    });

    if (error) throw error;

    const row = Array.isArray(data) ? data[0] : data;

    return {
        entriesCreated: 0,
        chunks: 0,
        processed: row?.updated_count ?? 0,
        skipped: row?.skipped_count ?? 0,
        alreadyExists: row?.already_exists_count ?? 0
    };
}

export async function backfillVectorsAsService(
    kbId: string,
    userId: string,
    batchSize: number = 100
): Promise<IngestResultWithVectors> {
    const supabase = getServiceRoleClient();

    const { data: kb } = await supabase
        .from('knowledge_bases')
        .select('id, user_id')
        .eq('id', kbId)
        .eq('user_id', userId)
        .maybeSingle();

    if (!kb) throw new Error('Knowledge base not found');

    const { data: entries } = await supabase
        .from('knowledge_entries')
        .select('id, content')
        .eq('kb_id', kbId)
        .is('content_vector', null)
        .limit(batchSize);

    if (!entries?.length) {
        return { entriesCreated: 0, chunks: 0, processed: 0, skipped: 0, alreadyExists: 0 };
    }

    const embeddingResult = await generateEmbeddings(entries.map(e => e.content as string));
    const { vectors, model, dimension } = embeddingResult;

    const updates = entries
        .map((entry, i) => ({
            id: entry.id as string,
            content_vector: vectors[i],
            metadata: {
                embedding_model: model,
                embedding_dim: dimension
            }
        }))
        .filter(u => Array.isArray(u.content_vector) && u.content_vector.length === dimension);

    if (updates.length === 0) {
        return { entriesCreated: 0, chunks: 0, processed: 0, skipped: entries.length, alreadyExists: 0 };
    }

    const { data, error } = await supabase.rpc('batch_update_vectors_as_service', {
        p_updates: updates,
        p_expected_dim: dimension,
        p_force_overwrite: false,
        p_user_id: userId
    });

    if (error) throw error;

    const row = Array.isArray(data) ? data[0] : data;

    return {
        entriesCreated: 0,
        chunks: 0,
        processed: row?.updated_count ?? 0,
        skipped: row?.skipped_count ?? 0,
        alreadyExists: row?.already_exists_count ?? 0
    };
}
