
import { NextRequest } from 'next/server';
import { getEffectiveMembershipType } from '@/lib/user/membership-server';
import type { DataSourceType } from '@/lib/data-sources/types';
import { getSystemAdminClient } from '@/lib/api-utils';
import {
    ingestConversationAsService,
    ingestChatMessageAsService,
    ingestRecordAsService,
    ingestDataSourceAsService,
    backfillVectorsAsService
} from '@/lib/knowledge-base/ingest';
import { triggerVectorIndexCreation } from '@/lib/knowledge-base/vector-index';
import { requireUserContext, jsonError, jsonOk } from '@/lib/api-utils';

export async function POST(request: NextRequest) {
    const auth = await requireUserContext(request);
    if ('error' in auth) return jsonError(auth.error.message, auth.error.status);
    const { user } = auth;

    const body = await request.json() as {
        kbId?: string;
        sourceType?: 'conversation' | 'record' | 'chat_message' | DataSourceType;
        sourceId?: string;
        sourceMeta?: { conversationId?: string };
    };

    if (!body.kbId || !body.sourceType || !body.sourceId) {
        return jsonError('参数不完整', 400);
    }
    if (body.sourceType === 'chat_message' && !body.sourceMeta?.conversationId) {
        return jsonError('缺少对话信息', 400);
    }

    const service = getSystemAdminClient();
    const { data: kb } = await service
        .from('knowledge_bases')
        .select('id, user_id')
        .eq('id', body.kbId)
        .eq('user_id', user.id)
        .maybeSingle();

    if (!kb) return jsonError('知识库不存在或无权限', 403);

    const membership = await getEffectiveMembershipType(user.id);
    if (membership === 'free') {
        return jsonError('当前会员等级无法使用知识库', 403);
    }

    try {
        await service
            .from('archived_sources')
            .upsert({
                user_id: user.id,
                kb_id: body.kbId,
                source_type: body.sourceType,
                source_id: body.sourceId
            }, { onConflict: 'source_type,source_id,kb_id' });
    } catch {
    }

    const ingestResult = body.sourceType === 'conversation'
        ? await ingestConversationAsService(body.kbId, body.sourceId, user.id)
        : body.sourceType === 'record'
            ? await ingestRecordAsService(body.kbId, body.sourceId, user.id)
            : body.sourceType === 'chat_message'
                ? await ingestChatMessageAsService(body.kbId, body.sourceMeta?.conversationId || '', body.sourceId, user.id)
                : await ingestDataSourceAsService(body.kbId, { type: body.sourceType, id: body.sourceId }, user.id);

    if (membership === 'pro') {
        try {
            await backfillVectorsAsService(body.kbId, user.id, 100);
            await triggerVectorIndexCreation();
        } catch {
        }
    }

    return jsonOk({ success: true, ...ingestResult });
}
