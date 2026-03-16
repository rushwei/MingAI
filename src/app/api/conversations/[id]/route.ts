import { type NextRequest } from 'next/server';
import { jsonError, jsonOk, requireUserContext } from '@/lib/api-utils';

type ConversationPatchBody = {
    title?: string;
    messages?: unknown[];
    personality?: string;
    baziChartId?: string | null;
    ziweiChartId?: string | null;
};

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireUserContext(request);
    if ('error' in auth) return jsonError(auth.error.message, auth.error.status);

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const includeContext = searchParams.get('includeContext') === '1';

    const { data, error } = await auth.supabase
        .from('conversations_with_archive_status')
        .select('*')
        .eq('id', id)
        .eq('user_id', auth.user.id)
        .maybeSingle();

    if (error) {
        console.error('[conversations] failed to load conversation:', error);
        return jsonError('加载对话失败', 500);
    }
    if (!data) {
        return jsonError('对话不存在', 404);
    }

    if (!includeContext) {
        return jsonOk({ conversation: data });
    }

    const context: { baziName?: string; ziweiName?: string } = {};
    const baziChartId = typeof data.bazi_chart_id === 'string' ? data.bazi_chart_id : null;
    const ziweiChartId = typeof data.ziwei_chart_id === 'string' ? data.ziwei_chart_id : null;

    const [baziResult, ziweiResult] = await Promise.all([
        baziChartId
            ? auth.supabase.from('bazi_charts').select('name').eq('id', baziChartId).eq('user_id', auth.user.id).maybeSingle()
            : Promise.resolve({ data: null, error: null }),
        ziweiChartId
            ? auth.supabase.from('ziwei_charts').select('name').eq('id', ziweiChartId).eq('user_id', auth.user.id).maybeSingle()
            : Promise.resolve({ data: null, error: null }),
    ]);

    if (!baziResult.error && baziResult.data?.name) {
        context.baziName = baziResult.data.name;
    }
    if (!ziweiResult.error && ziweiResult.data?.name) {
        context.ziweiName = ziweiResult.data.name;
    }

    return jsonOk({ conversation: data, context });
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
    if (body.messages !== undefined) updatePayload.messages = body.messages;
    if (body.personality !== undefined) updatePayload.personality = body.personality;
    if (body.baziChartId !== undefined) updatePayload.bazi_chart_id = body.baziChartId;
    if (body.ziweiChartId !== undefined) updatePayload.ziwei_chart_id = body.ziweiChartId;

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

    return jsonOk({ success: true, id: data.id });
}

export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireUserContext(_request);
    if ('error' in auth) return jsonError(auth.error.message, auth.error.status);

    const { id } = await params;
    const { error } = await auth.supabase
        .from('conversations')
        .delete()
        .eq('id', id)
        .eq('user_id', auth.user.id);

    if (error) {
        console.error('[conversations] failed to delete conversation:', error);
        return jsonError('删除对话失败', 500);
    }

    return jsonOk({ success: true });
}
