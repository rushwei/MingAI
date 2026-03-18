import { NextRequest } from 'next/server';
import type { DataSourceType } from '@/lib/data-sources/types';
import { requireUserContext, jsonError, jsonOk, getSystemAdminClient } from '@/lib/api-utils';
import { ensureFeatureRouteEnabled } from '@/lib/feature-gate-utils';

export async function GET(request: NextRequest) {
    const featureError = await ensureFeatureRouteEnabled('knowledge-base');
    if (featureError) return featureError;
    const auth = await requireUserContext(request);
    if ('error' in auth) return jsonError(auth.error.message, auth.error.status);
    const { user } = auth;

    const { searchParams } = new URL(request.url);
    const kbId = searchParams.get('kbId');

    const service = getSystemAdminClient();
    if (kbId) {
        const { data: kb } = await service
            .from('knowledge_bases')
            .select('id')
            .eq('id', kbId)
            .eq('user_id', user.id)
            .maybeSingle();
        if (!kb) return jsonError('知识库不存在或无权限', 403);
    }
    let query = service
        .from('archived_sources')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (kbId) query = query.eq('kb_id', kbId);

    const { data, error } = await query;
    if (error) return jsonError('获取归档列表失败', 500);
    let archivedSources = data || [];
    if (kbId) {
        const { data: entryRows } = await service
            .from('knowledge_entries')
            .select('source_type, source_id, created_at')
            .eq('kb_id', kbId)
            .eq('source_type', 'chat_message')
            .order('created_at', { ascending: false })
            .limit(200);

        const seen = new Set<string>(archivedSources.map(item => `${item.source_type}:${item.source_id}`));
        const virtual = (entryRows || []).reduce((acc, row) => {
            const key = `${row.source_type}:${row.source_id}`;
            if (seen.has(key)) return acc;
            seen.add(key);
            acc.push({
                id: `chat_message:${kbId}:${row.source_id}`,
                kb_id: kbId,
                source_type: row.source_type,
                source_id: row.source_id,
                created_at: row.created_at,
            });
            return acc;
        }, [] as typeof archivedSources);
        archivedSources = [...virtual, ...archivedSources];

        const pairs = archivedSources.slice(0, 200);
        const sourceIds = Array.from(new Set(pairs.map(item => item.source_id)));
        const sourceTypes = Array.from(new Set(pairs.map(item => item.source_type)));
        if (sourceIds.length > 0 && sourceTypes.length > 0) {
            const extractPreview = (content: string) => {
                const aiMarker = 'AI：';
                const aiIndex = content.indexOf(aiMarker);
                const base = aiIndex >= 0 ? content.slice(aiIndex + aiMarker.length) : content;
                const firstParagraph = base.split(/\n{2,}/)[0] || base;
                return firstParagraph.trim();
            };
            const { data: entryPreviews } = await service
                .from('knowledge_entries')
                .select('source_type, source_id, content, chunk_index')
                .eq('kb_id', kbId)
                .in('source_id', sourceIds)
                .in('source_type', sourceTypes)
                .eq('chunk_index', 0)
                .limit(300);

            const previewMap = new Map<string, string>();
            (entryPreviews || []).forEach((row: { source_type: string; source_id: string; content: string }) => {
                const key = `${row.source_type}:${row.source_id}`;
                if (!previewMap.has(key)) {
                    previewMap.set(key, extractPreview(row.content));
                }
            });

            archivedSources = archivedSources.map(item => ({
                ...item,
                preview: previewMap.get(`${item.source_type}:${item.source_id}`) || null
            }));
        }
    }
    return jsonOk({ archivedSources });
}

export async function POST(request: NextRequest) {
    const featureError = await ensureFeatureRouteEnabled('knowledge-base');
    if (featureError) return featureError;
    const auth = await requireUserContext(request);
    if ('error' in auth) return jsonError(auth.error.message, auth.error.status);
    const { user } = auth;

    const body = await request.json() as {
        kbId?: string;
        sourceType?: 'conversation' | 'record' | 'chat_message' | DataSourceType;
        sourceId?: string;
    };

    if (!body.kbId || !body.sourceType || !body.sourceId) {
        return jsonError('参数不完整', 400);
    }

    const service = getSystemAdminClient();
    const { data: kb } = await service
        .from('knowledge_bases')
        .select('id')
        .eq('id', body.kbId)
        .eq('user_id', user.id)
        .maybeSingle();

    if (!kb) {
        return jsonError('知识库不存在或无权限', 403);
    }

    const { data, error } = await service
        .from('archived_sources')
        .upsert({
            user_id: user.id,
            kb_id: body.kbId,
            source_type: body.sourceType,
            source_id: body.sourceId
        }, {
            onConflict: 'source_type,source_id,kb_id'
        })
        .select('*')
        .single();

    if (error) return jsonError('归档失败', 500);
    return jsonOk(data as Record<string, unknown>);
}
