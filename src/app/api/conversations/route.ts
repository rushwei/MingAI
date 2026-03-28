import { type NextRequest } from 'next/server';
import { jsonError, jsonOk, requireUserContext } from '@/lib/api-utils';
import { replaceConversationMessages } from '@/lib/server/conversation-messages';
import type { ChatMessage } from '@/types';

const CONVERSATION_LIST_SELECT = [
    'id',
    'user_id',
    'personality',
    'title',
    'created_at',
    'updated_at',
    'source_type',
    'question_preview:source_data->>question',
    'is_archived',
    'archived_kb_ids',
].join(', ');

export async function GET(request: NextRequest) {
    const auth = await requireUserContext(request);
    if ('error' in auth) return jsonError(auth.error.message, auth.error.status);

    const { searchParams } = new URL(request.url);
    const includeArchived = searchParams.get('includeArchived') === 'true';
    const limit = Math.min(Math.max(Number.parseInt(searchParams.get('limit') || '100', 10) || 100, 1), 100);
    const offset = Math.max(Number.parseInt(searchParams.get('offset') || '0', 10) || 0, 0);
    const sourceType = searchParams.get('sourceType');

    let query = auth.supabase
        .from('conversations_with_archive_status')
        .select(CONVERSATION_LIST_SELECT)
        .eq('user_id', auth.user.id)
        .order('updated_at', { ascending: false })
        .range(offset, offset + limit);

    if (!includeArchived) {
        query = query.eq('is_archived', false);
    }
    if (sourceType) {
        query = query.eq('source_type', sourceType);
    }

    const { data, error } = await query;
    if (error) {
        console.error('[conversations] failed to load list:', error);
        return jsonError('加载对话列表失败', 500);
    }

    const rows = data ?? [];
    const hasMore = rows.length > limit;
    const conversations = hasMore ? rows.slice(0, limit) : rows;

    return jsonOk({
        conversations,
        pagination: {
            hasMore,
            nextOffset: hasMore ? offset + limit : null,
        },
    });
}

export async function POST(request: NextRequest) {
    const auth = await requireUserContext(request);
    if ('error' in auth) return jsonError(auth.error.message, auth.error.status);

    let body: {
        personality?: string;
        title?: string;
        messages?: unknown[];
    };

    try {
        body = await request.json() as typeof body;
    } catch {
        return jsonError('请求体不是合法 JSON', 400);
    }

    const initialMessages = Array.isArray(body.messages) ? body.messages : [];
    const { data, error } = await auth.supabase
        .from('conversations')
        .insert({
            user_id: auth.user.id,
            personality: body.personality || 'general',
            title: body.title || '新对话',
        })
        .select('id')
        .single();

    if (error) {
        console.error('[conversations] failed to create conversation:', error);
        return jsonError('创建对话失败', 500);
    }

    if (data?.id && initialMessages.length > 0) {
        const syncResult = await replaceConversationMessages(auth.supabase, data.id, initialMessages as ChatMessage[]);
        if (syncResult.error) {
            console.error('[conversations] failed to sync message rows:', syncResult.error);
            return jsonError('创建对话失败', 500);
        }
    }

    return jsonOk({ id: data?.id ?? null }, 201);
}
