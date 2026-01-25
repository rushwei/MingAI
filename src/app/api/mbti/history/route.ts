/**
 * MBTI 历史记录 API
 *
 * 提供历史记录列表与删除操作
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireBearerUser, getServiceRoleClient } from '@/lib/api-utils';

const MAX_HISTORY = 50;

export async function GET(request: NextRequest) {
    const auth = await requireBearerUser(request);
    if ('error' in auth) {
        return NextResponse.json({ success: false, error: auth.error.message }, { status: auth.error.status });
    }
    const { user } = auth;

    const serviceClient = getServiceRoleClient();
    const { data, error: fetchError } = await serviceClient
        .from('mbti_readings')
        .select('id, mbti_type, scores, percentages, created_at, conversation_id, conversation:conversations(source_data)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(MAX_HISTORY);

    if (fetchError) {
        return NextResponse.json({ success: false, error: '加载历史记录失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data || [] });
}

export async function DELETE(request: NextRequest) {
    const auth = await requireBearerUser(request);
    if ('error' in auth) {
        return NextResponse.json({ success: false, error: auth.error.message }, { status: auth.error.status });
    }
    const { user } = auth;

    const body = await request.json().catch(() => ({}));
    const id = body?.id as string | undefined;
    if (!id) {
        return NextResponse.json({ success: false, error: '缺少记录ID' }, { status: 400 });
    }

    const serviceClient = getServiceRoleClient();
    const { data: row, error: fetchError } = await serviceClient
        .from('mbti_readings')
        .select('id, conversation_id')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

    if (fetchError || !row) {
        return NextResponse.json({ success: false, error: '记录不存在' }, { status: 404 });
    }

    const { error: deleteError } = await serviceClient
        .from('mbti_readings')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

    if (deleteError) {
        return NextResponse.json({ success: false, error: '删除失败' }, { status: 500 });
    }

    if (row.conversation_id) {
        await serviceClient
            .from('conversations')
            .delete()
            .eq('id', row.conversation_id)
            .eq('user_id', user.id);
    }

    return NextResponse.json({ success: true });
}
