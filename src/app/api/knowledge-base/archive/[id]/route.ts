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

        const { data, error } = await service.rpc('kb_unarchive_source_as_service', {
            p_user_id: user.id,
            p_kb_id: kbId,
            p_source_type: 'chat_message',
            p_source_id: sourceId,
        });

        if (error || data !== true) return jsonError('取消归档失败', 500);
        return jsonOk({ success: true });
    }

    const { data: archived, error: fetchError } = await service
        .from('archived_sources')
        .select('id, kb_id, source_type, source_id')
        .eq('id', id)
        .eq('user_id', user.id)
        .maybeSingle();

    if (fetchError) return jsonError('取消归档失败', 500);
    if (!archived) return jsonError('归档记录不存在', 404);

    const { data, error } = await service.rpc('kb_unarchive_source_as_service', {
        p_user_id: user.id,
        p_kb_id: archived.kb_id,
        p_source_type: archived.source_type,
        p_source_id: archived.source_id,
    });

    if (error || data !== true) return jsonError('取消归档失败', 500);
    return jsonOk({ success: true });
}
