import { type NextRequest } from 'next/server';
import { jsonError, jsonOk, requireUserContext } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
    const auth = await requireUserContext(request);
    if ('error' in auth) return jsonError(auth.error.message, auth.error.status);

    const { searchParams } = new URL(request.url);
    const includeArchived = searchParams.get('includeArchived') === 'true';
    const limit = Math.min(Math.max(Number(searchParams.get('limit') || 50), 1), 100);
    const sourceType = searchParams.get('sourceType');
    const baziChartId = searchParams.get('baziChartId');

    let query = auth.supabase
        .from('conversations_with_archive_status')
        .select('*')
        .eq('user_id', auth.user.id)
        .order('updated_at', { ascending: false })
        .limit(limit);

    if (!includeArchived) {
        query = query.eq('is_archived', false);
    }
    if (sourceType) {
        query = query.eq('source_type', sourceType);
    }
    if (baziChartId) {
        query = query.eq('bazi_chart_id', baziChartId);
    }

    const { data, error } = await query;
    if (error) {
        console.error('[conversations] failed to load list:', error);
        return jsonError('加载对话列表失败', 500);
    }

    return jsonOk({ conversations: data ?? [] });
}

export async function POST(request: NextRequest) {
    const auth = await requireUserContext(request);
    if ('error' in auth) return jsonError(auth.error.message, auth.error.status);

    let body: {
        personality?: string;
        title?: string;
        baziChartId?: string | null;
        ziweiChartId?: string | null;
        messages?: unknown[];
    };

    try {
        body = await request.json() as typeof body;
    } catch {
        return jsonError('请求体不是合法 JSON', 400);
    }

    const { data, error } = await auth.supabase
        .from('conversations')
        .insert({
            user_id: auth.user.id,
            personality: body.personality || 'general',
            title: body.title || '新对话',
            bazi_chart_id: body.baziChartId ?? null,
            ziwei_chart_id: body.ziweiChartId ?? null,
            messages: Array.isArray(body.messages) ? body.messages : [],
        })
        .select('id')
        .single();

    if (error) {
        console.error('[conversations] failed to create conversation:', error);
        return jsonError('创建对话失败', 500);
    }

    return jsonOk({ id: data?.id ?? null }, 201);
}
