/**
 * 社区帖子列表 API 路由
 * GET: 获取帖子列表（移除 user_id 保护匿名性）
 * POST: 创建新帖子
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { PostCategory, PostFilters, CommunityPost } from '@/lib/community';

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

// 从帖子数据中移除 user_id 以保护匿名性
function sanitizePost(post: CommunityPost): Omit<CommunityPost, 'user_id'> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { user_id, ...safePost } = post;
    return safePost;
}

export async function GET(request: NextRequest) {
    try {
        const supabase = await createSupabaseClient();
        const { searchParams } = new URL(request.url);

        const page = parseInt(searchParams.get('page') || '1');
        const pageSize = parseInt(searchParams.get('pageSize') || '20');
        const category = searchParams.get('category') as PostCategory | null;
        const search = searchParams.get('search');
        const sortBy = searchParams.get('sortBy') as PostFilters['sortBy'] || 'latest';

        let query = supabase
            .from('community_posts')
            .select('*', { count: 'exact' })
            .eq('is_deleted', false);

        // 应用筛选条件
        if (category) {
            query = query.eq('category', category);
        }
        if (search) {
            query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
        }

        // 排序
        if (sortBy === 'latest') {
            query = query.order('is_pinned', { ascending: false }).order('created_at', { ascending: false });
        } else if (sortBy === 'popular') {
            query = query.order('is_pinned', { ascending: false }).order('upvote_count', { ascending: false });
        } else if (sortBy === 'hot') {
            query = query.order('is_pinned', { ascending: false }).order('comment_count', { ascending: false });
        }

        // 分页
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        query = query.range(from, to);

        const { data, error, count } = await query;

        if (error) {
            console.error('获取帖子失败:', error);
            return NextResponse.json({ error: '获取帖子失败' }, { status: 500 });
        }

        // 移除 user_id 保护匿名性
        const safePosts = (data || []).map(post => sanitizePost(post as CommunityPost));

        return NextResponse.json({
            posts: safePosts,
            total: count || 0,
        });
    } catch (error) {
        console.error('获取帖子失败:', error);
        return NextResponse.json({ error: '获取帖子失败' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: '请先登录' }, { status: 401 });
        }

        const body = await request.json();

        if (!body.title || !body.content) {
            return NextResponse.json({ error: '标题和内容不能为空' }, { status: 400 });
        }

        const anonymousName = body.anonymous_name || '匿名用户';

        // 创建帖子
        const { data: post, error: postError } = await supabase
            .from('community_posts')
            .insert({
                user_id: user.id,
                anonymous_name: anonymousName,
                title: body.title,
                content: body.content,
                category: body.category || 'general',
                tags: body.tags || [],
            })
            .select()
            .single();

        if (postError) {
            console.error('创建帖子失败:', postError);
            return NextResponse.json({ error: '创建帖子失败' }, { status: 500 });
        }

        // 创建作者的匿名映射（楼主）
        await supabase.from('community_anonymous_mapping').insert({
            post_id: post.id,
            user_id: user.id,
            anonymous_name: anonymousName,
            display_order: 0,
        });

        // 创建成功后返回时移除 user_id
        return NextResponse.json(sanitizePost(post as CommunityPost));
    } catch (error) {
        console.error('创建帖子失败:', error);
        return NextResponse.json({ error: '创建帖子失败' }, { status: 500 });
    }
}
