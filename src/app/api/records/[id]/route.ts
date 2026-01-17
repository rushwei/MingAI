/**
 * 单条记录 API 路由
 * GET: 获取单条记录
 * PUT: 更新记录
 * DELETE: 删除记录
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

export async function GET(
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

        const { data, error } = await supabase
            .from('ming_records')
            .select('*')
            .eq('id', id)
            .eq('user_id', user.id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return NextResponse.json({ error: '记录不存在' }, { status: 404 });
            }
            console.error('获取记录失败:', error);
            return NextResponse.json({ error: '获取记录失败' }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('获取记录失败:', error);
        return NextResponse.json({ error: '获取记录失败' }, { status: 500 });
    }
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

        // 处理置顶切换
        if (body.togglePin) {
            const { data: record, error: fetchError } = await supabase
                .from('ming_records')
                .select('is_pinned')
                .eq('id', id)
                .eq('user_id', user.id)
                .single();

            if (fetchError || !record) {
                return NextResponse.json({ error: '记录不存在' }, { status: 404 });
            }

            const { data, error } = await supabase
                .from('ming_records')
                .update({ is_pinned: !record.is_pinned, updated_at: new Date().toISOString() })
                .eq('id', id)
                .eq('user_id', user.id)
                .select()
                .single();

            if (error) {
                console.error('更新记录失败:', error);
                return NextResponse.json({ error: '更新记录失败' }, { status: 500 });
            }

            return NextResponse.json(data);
        }

        // 常规更新
        const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (body.title !== undefined) updateData.title = body.title;
        if (body.content !== undefined) updateData.content = body.content;
        if (body.category !== undefined) updateData.category = body.category;
        if (body.tags !== undefined) updateData.tags = body.tags;
        if (body.event_date !== undefined) updateData.event_date = body.event_date;
        if (body.is_pinned !== undefined) updateData.is_pinned = body.is_pinned;

        const { data, error } = await supabase
            .from('ming_records')
            .update(updateData)
            .eq('id', id)
            .eq('user_id', user.id)
            .select()
            .single();

        if (error) {
            console.error('更新记录失败:', error);
            return NextResponse.json({ error: '更新记录失败' }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('更新记录失败:', error);
        return NextResponse.json({ error: '更新记录失败' }, { status: 500 });
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
            .from('ming_records')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id);

        if (error) {
            console.error('删除记录失败:', error);
            return NextResponse.json({ error: '删除记录失败' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('删除记录失败:', error);
        return NextResponse.json({ error: '删除记录失败' }, { status: 500 });
    }
}
