/**
 * MBTI 历史记录 API
 *
 * 提供历史记录列表与删除操作
 */
import { NextRequest } from 'next/server';
import { requireBearerUser, getSystemAdminClient, jsonError, jsonOk } from '@/lib/api-utils';

const MAX_HISTORY = 50;

export async function GET(request: NextRequest) {
    const auth = await requireBearerUser(request);
    if ('error' in auth) {
        return jsonError(auth.error.message, auth.error.status, { success: false });
    }
    const { user } = auth;

    const serviceClient = getSystemAdminClient();
    const { data, error: fetchError } = await serviceClient
        .from('mbti_readings')
        .select('id, mbti_type, scores, percentages, created_at, conversation_id, conversation:conversations(source_data)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(MAX_HISTORY);

    if (fetchError) {
        return jsonError('加载历史记录失败', 500, { success: false });
    }

    return jsonOk({ success: true, data: data || [] });
}

export async function DELETE(request: NextRequest) {
    const auth = await requireBearerUser(request);
    if ('error' in auth) {
        return jsonError(auth.error.message, auth.error.status, { success: false });
    }
    const { user } = auth;

    const body = await request.json().catch(() => ({}));
    const id = body?.id as string | undefined;
    if (!id) {
        return jsonError('缺少记录ID', 400, { success: false });
    }

    const serviceClient = getSystemAdminClient();
    const { data: row, error: fetchError } = await serviceClient
        .from('mbti_readings')
        .select('id, conversation_id')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

    if (fetchError || !row) {
        return jsonError('记录不存在', 404, { success: false });
    }

    const { error: deleteError } = await serviceClient
        .from('mbti_readings')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

    if (deleteError) {
        return jsonError('删除失败', 500, { success: false });
    }

    if (row.conversation_id) {
        await serviceClient
            .from('conversations')
            .delete()
            .eq('id', row.conversation_id)
            .eq('user_id', user.id);
    }

    return jsonOk({ success: true });
}
