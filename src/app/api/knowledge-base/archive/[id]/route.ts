import { NextRequest } from 'next/server';
import { requireUserContext, jsonError, jsonOk, getSystemAdminClient } from '@/lib/api-utils';

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireUserContext(_request);
    if ('error' in auth) return jsonError(auth.error.message, auth.error.status);
    const { user } = auth;

    const { id } = await params;

    const service = getSystemAdminClient();
    if (id.startsWith('chat_message:')) {
        const [, kbId, sourceId] = id.split(':');
        if (!kbId || !sourceId) return jsonError('取消归档失败', 400);

        const { data: kb } = await service
            .from('knowledge_bases')
            .select('id')
            .eq('id', kbId)
            .eq('user_id', user.id)
            .maybeSingle();
        if (!kb) return jsonError('取消归档失败', 403);

        const { error: deleteEntriesError } = await service
            .from('knowledge_entries')
            .delete()
            .eq('kb_id', kbId)
            .eq('source_type', 'chat_message')
            .eq('source_id', sourceId);

        if (deleteEntriesError) return jsonError('取消归档失败', 500);

        const { error: deleteArchiveError } = await service
            .from('archived_sources')
            .delete()
            .eq('kb_id', kbId)
            .eq('source_type', 'chat_message')
            .eq('source_id', sourceId)
            .eq('user_id', user.id);

        if (deleteArchiveError) return jsonError('取消归档失败', 500);
        return jsonOk({ success: true });
    }

    const { data: archived, error: fetchError } = await service
        .from('archived_sources')
        .select('id, kb_id, source_type, source_id')
        .eq('id', id)
        .eq('user_id', user.id)
        .maybeSingle();

    if (fetchError || !archived) return jsonError('取消归档失败', 500);

    const { error: deleteEntriesError } = await service
        .from('knowledge_entries')
        .delete()
        .eq('kb_id', archived.kb_id)
        .eq('source_type', archived.source_type)
        .eq('source_id', archived.source_id);

    if (deleteEntriesError) return jsonError('取消归档失败', 500);

    const { error: deleteArchiveError } = await service
        .from('archived_sources')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

    if (deleteArchiveError) return jsonError('取消归档失败', 500);
    return jsonOk({ success: true });
}
