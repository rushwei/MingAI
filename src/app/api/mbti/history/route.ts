/**
 * MBTI 历史记录 API
 *
 * 提供历史记录列表与删除操作
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getServiceClient } from '@/lib/supabase-server';

const MAX_HISTORY = 50;

async function getUserFromRequest(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) return { user: null, error: '请先登录' };

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
        return { user: null, error: '认证失败' };
    }

    return { user, error: null };
}

export async function GET(request: NextRequest) {
    const { user, error } = await getUserFromRequest(request);
    if (!user) {
        return NextResponse.json({ success: false, error }, { status: 401 });
    }

    const serviceClient = getServiceClient();
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
    const { user, error } = await getUserFromRequest(request);
    if (!user) {
        return NextResponse.json({ success: false, error }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const id = body?.id as string | undefined;
    if (!id) {
        return NextResponse.json({ success: false, error: '缺少记录ID' }, { status: 400 });
    }

    const serviceClient = getServiceClient();
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
