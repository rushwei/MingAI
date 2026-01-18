/**
 * 单个评论 API 路由
 * PUT: 更新评论
 * DELETE: 删除评论（软删除）
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getServiceClient } from '@/lib/supabase-server';

// 网络请求重试工具
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 500): Promise<T> {
    let lastError: unknown;
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (err) {
            lastError = err;
            if (i < retries - 1) {
                await new Promise(r => setTimeout(r, delay * (i + 1)));
            }
        }
    }
    throw lastError;
}

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

        // 使用 serviceClient 绕过 RLS
        const serviceClient = getServiceClient();

        // 先验证用户是否是评论作者
        const checkResult = await withRetry(async () => {
            return await serviceClient
                .from('community_comments')
                .select('user_id')
                .eq('id', id)
                .single();
        });

        if (checkResult.error || checkResult.data?.user_id !== user.id) {
            return NextResponse.json({ error: '无权限编辑此评论' }, { status: 403 });
        }

        const updateResult = await withRetry(async () => {
            return await serviceClient
                .from('community_comments')
                .update({
                    content: body.content,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', id)
                .select()
                .single();
        });

        if (updateResult.error) {
            console.error('更新评论失败:', updateResult.error);
            return NextResponse.json({ error: '更新评论失败' }, { status: 500 });
        }

        return NextResponse.json(updateResult.data);
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

        // 使用 serviceClient 绕过 RLS
        const serviceClient = getServiceClient();

        // 先验证用户是否是评论作者
        const checkResult = await withRetry(async () => {
            return await serviceClient
                .from('community_comments')
                .select('user_id')
                .eq('id', id)
                .single();
        });

        if (checkResult.error || checkResult.data?.user_id !== user.id) {
            return NextResponse.json({ error: '无权限删除此评论' }, { status: 403 });
        }

        const deleteResult = await withRetry(async () => {
            return await serviceClient
                .from('community_comments')
                .update({ is_deleted: true, updated_at: new Date().toISOString() })
                .eq('id', id);
        });

        if (deleteResult.error) {
            console.error('删除评论失败:', deleteResult.error);
            return NextResponse.json({ error: '删除评论失败' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('删除评论失败:', error);
        return NextResponse.json({ error: '删除评论失败' }, { status: 500 });
    }
}
