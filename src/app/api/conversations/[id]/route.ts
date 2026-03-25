import { type NextRequest } from 'next/server';
import { jsonError, jsonOk, requireUserContext } from '@/lib/api-utils';
import { loadAllConversationMessages, loadConversationMessagePage, replaceConversationMessages } from '@/lib/server/conversation-messages';
import { deleteConversationGraph } from '@/lib/chat/conversation-delete';
import type { ChatMessage } from '@/types';

type ConversationPatchBody = {
    title?: string;
    messages?: unknown[];
    personality?: string;
};

type ConversationDetailRow = {
    id: string;
    user_id: string;
    personality?: string | null;
    title?: string | null;
    created_at?: string;
    updated_at?: string;
    source_type?: string | null;
    source_data?: unknown;
    is_archived?: boolean | null;
    archived_kb_ids?: unknown;
};

const CONVERSATION_DETAIL_SELECT = [
    'id',
    'user_id',
    'personality',
    'title',
    'created_at',
    'updated_at',
    'source_type',
    'source_data',
    'is_archived',
    'archived_kb_ids',
].join(', ');

function isConversationDetailRow(value: unknown): value is ConversationDetailRow {
    return !!value && typeof value === 'object' && !Array.isArray(value) && !('error' in value);
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireUserContext(request);
    if ('error' in auth) return jsonError(auth.error.message, auth.error.status);

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const includeContext = searchParams.get('includeContext') === '1';
    const messageLimit = Number(searchParams.get('messageLimit') || 0);
    const messageOffset = Math.max(Number(searchParams.get('messageOffset') || 0), 0);

    const { data, error } = await auth.supabase
        .from('conversations_with_archive_status')
        .select(CONVERSATION_DETAIL_SELECT)
        .eq('id', id)
        .eq('user_id', auth.user.id)
        .maybeSingle();

    if (error) {
        console.error('[conversations] failed to load conversation:', error);
        return jsonError('加载对话失败', 500);
    }
    if (!data || !isConversationDetailRow(data)) {
        return jsonError('对话不存在', 404);
    }

    const conversationRow: ConversationDetailRow = data;

    const paginationRequested = Number.isFinite(messageLimit) && messageLimit > 0;
    const messageResult = paginationRequested
        ? await loadConversationMessagePage(auth.supabase, id, {
            limit: messageLimit,
            offset: messageOffset,
        })
        : await loadAllConversationMessages(auth.supabase, id);

    if (messageResult.error) {
        console.error('[conversations] failed to load conversation messages:', messageResult.error);
        return jsonError('加载对话失败', 500);
    }

    const conversation = {
        ...conversationRow,
        messages: messageResult.messages,
    };

    if (!includeContext) {
        return jsonOk({
            conversation,
            ...(paginationRequested ? {
                pagination: {
                    total: 'total' in messageResult ? messageResult.total : messageResult.messages.length,
                    hasMore: 'hasMore' in messageResult ? messageResult.hasMore : false,
                    offset: messageOffset,
                    limit: messageLimit,
                },
            } : {}),
        });
    }

    return jsonOk({
        conversation,
        context: {},
        ...(paginationRequested ? {
            pagination: {
                total: 'total' in messageResult ? messageResult.total : messageResult.messages.length,
                hasMore: 'hasMore' in messageResult ? messageResult.hasMore : false,
                offset: messageOffset,
                limit: messageLimit,
            },
        } : {}),
    });
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireUserContext(request);
    if ('error' in auth) return jsonError(auth.error.message, auth.error.status);

    const { id } = await params;
    let body: ConversationPatchBody;

    try {
        body = await request.json() as ConversationPatchBody;
    } catch {
        return jsonError('请求体不是合法 JSON', 400);
    }

    const updatePayload: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
    };

    if (body.title !== undefined) updatePayload.title = body.title;
    const shouldSyncMessages = body.messages !== undefined;
    const nextMessages = Array.isArray(body.messages) ? body.messages as ChatMessage[] : [];
    if (body.personality !== undefined) updatePayload.personality = body.personality;

    const { data, error } = await auth.supabase
        .from('conversations')
        .update(updatePayload)
        .eq('id', id)
        .eq('user_id', auth.user.id)
        .select('id')
        .maybeSingle();

    if (error) {
        console.error('[conversations] failed to update conversation:', error);
        return jsonError('更新对话失败', 500);
    }
    if (!data) {
        return jsonError('对话不存在', 404);
    }

    if (shouldSyncMessages) {
        const syncResult = await replaceConversationMessages(auth.supabase, id, nextMessages);
        if (syncResult.error) {
            console.error('[conversations] failed to sync message rows:', syncResult.error);
            return jsonError('更新对话失败', 500);
        }
    }

    return jsonOk({ success: true, id: data.id });
}

export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireUserContext(_request);
    if ('error' in auth) return jsonError(auth.error.message, auth.error.status);

    const { id } = await params;
    const result = await deleteConversationGraph(
        auth.supabase as never,
        auth.user.id,
        id,
    );
    if (result.error) {
        console.error('[conversations] failed to delete conversation:', result.error);
        return jsonError('删除对话失败', 500);
    }

    return jsonOk({ success: true });
}
