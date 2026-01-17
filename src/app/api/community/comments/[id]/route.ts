/**
 * 单个评论 API 路由
 * PUT: 更新评论
 * DELETE: 删除评论（软删除）
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

async function createSupabaseClient() {
    const cookieStore = await cookies();
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
            },
        }
    );
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: '请先登录' }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();

        if (!body.content) {
            return NextResponse.json({ error: '内容不能为空' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('community_comments')
            .update({
                content: body.content,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .eq('user_id', user.id)
            .select()
            .single();

        if (error) {
            console.error('更新评论失败:', error);
            return NextResponse.json({ error: '更新评论失败' }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('更新评论失败:', error);
        return NextResponse.json({ error: '更新评论失败' }, { status: 500 });
    }
}

export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: '请先登录' }, { status: 401 });
        }

        const { id } = await params;

        const { error } = await supabase
            .from('community_comments')
            .update({ is_deleted: true, updated_at: new Date().toISOString() })
            .eq('id', id)
            .eq('user_id', user.id);

        if (error) {
            console.error('删除评论失败:', error);
            return NextResponse.json({ error: '删除评论失败' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('删除评论失败:', error);
        return NextResponse.json({ error: '删除评论失败' }, { status: 500 });
    }
}
