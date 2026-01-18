/**
 * 评论 API 路由
 * POST: 创建评论
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

export async function POST(request: NextRequest) {
    try {
        const supabase = await createSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: '请先登录' }, { status: 401 });
        }

        const body = await request.json();

        if (!body.post_id || !body.content) {
            return NextResponse.json({ error: '帖子ID和内容不能为空' }, { status: 400 });
        }

        // 使用 serviceClient 和重试逻辑
        const serviceClient = getServiceClient();

        // 获取或创建匿名映射
        let anonymousName = '匿名用户';

        // 先查找现有映射
        const existingResult = await withRetry(async () => {
            return await serviceClient
                .from('community_anonymous_mapping')
                .select('anonymous_name')
                .eq('post_id', body.post_id)
                .eq('user_id', user.id)
                .single();
        });

        if (existingResult.data) {
            anonymousName = existingResult.data.anonymous_name;
        } else {
            // 获取当前帖子的最大序号
            const maxOrderResult = await withRetry(async () => {
                return await serviceClient
                    .from('community_anonymous_mapping')
                    .select('display_order')
                    .eq('post_id', body.post_id)
                    .order('display_order', { ascending: false })
                    .limit(1)
                    .single();
            });

            const nextOrder = (maxOrderResult.data?.display_order || 0) + 1;
            anonymousName = `匿名用户${String.fromCharCode(64 + nextOrder)}`;

            // 创建映射
            await withRetry(async () => {
                return await serviceClient
                    .from('community_anonymous_mapping')
                    .insert({
                        post_id: body.post_id,
                        user_id: user.id,
                        anonymous_name: anonymousName,
                        display_order: nextOrder,
                    });
            });
        }

        // 创建评论
        const commentResult = await withRetry(async () => {
            return await serviceClient
                .from('community_comments')
                .insert({
                    post_id: body.post_id,
                    user_id: user.id,
                    parent_id: body.parent_id || null,
                    content: body.content,
                })
                .select()
                .single();
        });

        if (commentResult.error) {
            console.error('创建评论失败:', commentResult.error);
            return NextResponse.json({ error: '创建评论失败' }, { status: 500 });
        }

        return NextResponse.json({
            ...commentResult.data,
            anonymous_name: anonymousName,
        });
    } catch (error) {
        console.error('创建评论失败:', error);
        return NextResponse.json({ error: '创建评论失败' }, { status: 500 });
    }
}
