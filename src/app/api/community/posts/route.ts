/**
 * 社区帖子列表 API 路由
 * GET: 获取帖子列表
 * POST: 创建新帖子
 */

import { NextRequest } from 'next/server';
import { PostCategory, PostFilters, CommunityPost } from '@/lib/community';
import { loadCommunityAuthorProfileMap, loadSingleCommunityAuthorProfile } from '@/lib/community-server';
import { jsonError, jsonOk, requireUserContext, getSystemAdminClient } from '@/lib/api-utils';
import { withRetry } from '@/lib/retry';
import { parsePagination } from '@/lib/pagination';
import { hasNonEmptyStrings } from '@/lib/validation';

type CommunityPostRow = Omit<CommunityPost, 'author_name'> & {
    user_id: string;
    anonymous_name: string | null;
};

function quotePostgrestString(value: string): string {
    const sanitized = value
        .replace(/\u0000/g, '')
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"');
    return `"${sanitized}"`;
}

function toPublicPost(
    post: CommunityPostRow,
    authorProfile: { name: string; avatarUrl: string | null },
): CommunityPost {
    return {
        id: post.id,
        author_name: authorProfile.name,
        author_avatar_url: authorProfile.avatarUrl,
        title: post.title,
        content: post.content,
        category: post.category,
        tags: post.tags,
        view_count: post.view_count,
        upvote_count: post.upvote_count,
        downvote_count: post.downvote_count,
        comment_count: post.comment_count,
        is_pinned: post.is_pinned,
        is_featured: post.is_featured,
        is_deleted: post.is_deleted,
        created_at: post.created_at,
        updated_at: post.updated_at,
    };
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);

        const { from, to } = parsePagination(searchParams, { defaultPageSize: 20 });
        const category = searchParams.get('category') as PostCategory | null;
        const search = searchParams.get('search');
        const sortBy = searchParams.get('sortBy') as PostFilters['sortBy'] || 'latest';

        // 使用 serviceClient 和重试逻辑
        const serviceClient = getSystemAdminClient();

        const result = await withRetry(async () => {
            let query = serviceClient
                .from('community_posts')
                .select('*', { count: 'exact' })
                .eq('is_deleted', false);

            // 应用筛选条件
            if (category) {
                query = query.eq('category', category);
            }
            if (search) {
                const pattern = quotePostgrestString(`%${search}%`);
                query = query.or(`title.ilike.${pattern},content.ilike.${pattern}`);
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
            query = query.range(from, to);

            const response = await query;
            if (response.error) {
                throw response.error;
            }
            return response;
        });

        if (result.error) {
            console.error('获取帖子失败:', result.error);
            return jsonError('获取帖子失败', 500);
        }

        const authorMap = await loadCommunityAuthorProfileMap(
            serviceClient,
            (result.data || []).map((post: CommunityPostRow) => post.user_id),
        );
        const safePosts = (result.data || []).map((post: CommunityPostRow) =>
            toPublicPost(post, authorMap.get(post.user_id) || { name: '命理爱好者', avatarUrl: null }),
        );

        return jsonOk({
            posts: safePosts,
            total: result.count || 0,
        });
    } catch (error) {
        console.error('获取帖子失败:', error);
        return jsonError('获取帖子失败', 500);
    }
}

export async function POST(request: NextRequest) {
    try {
        const auth = await requireUserContext(request);
        if ('error' in auth) {
            return jsonError(auth.error.message, auth.error.status);
        }
        const { supabase, user } = auth;

        const body = await request.json();

        if (!hasNonEmptyStrings(body, ['title', 'content'])) {
            return jsonError('标题和内容不能为空', 400);
        }

        const authorProfile = await loadSingleCommunityAuthorProfile(supabase, user.id);

        // 创建帖子
        const { data: post, error: postError } = await supabase
            .from('community_posts')
            .insert({
                user_id: user.id,
                anonymous_name: authorProfile.name,
                title: body.title,
                content: body.content,
                category: body.category || 'general',
                tags: body.tags || [],
            })
            .select()
            .single();

        if (postError) {
            console.error('创建帖子失败:', postError);
            return jsonError('创建帖子失败', 500);
        }

        return jsonOk(toPublicPost(post as CommunityPostRow, authorProfile));
    } catch (error) {
        console.error('创建帖子失败:', error);
        return jsonError('创建帖子失败', 500);
    }
}
