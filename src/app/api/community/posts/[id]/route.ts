/**
 * 单个帖子 API 路由
 * GET: 获取帖子详情（移除 user_id 保护匿名性，使用 Service Role 更新浏览量）
 * PUT: 更新帖子（限制可更新字段）
 * DELETE: 删除帖子（软删除）
 */

import { NextRequest } from 'next/server';
import { CommunityPost, CommunityComment } from '@/lib/community';
import { getAuthContext, jsonError, jsonOk, requireUserContext, getServiceRoleClient } from '@/lib/api-utils';
import { withRetry } from '@/lib/retry';

// 从帖子数据中移除 user_id 以保护匿名性
function sanitizePost(post: CommunityPost): Omit<CommunityPost, 'user_id'> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { user_id, ...safePost } = post;
    return safePost;
}

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { supabase, user } = await getAuthContext(_request);
        const { id } = await params;

        // 获取帖子
        const { data: post, error: postError } = await supabase
            .from('community_posts')
            .select('*')
            .eq('id', id)
            .eq('is_deleted', false)
            .single();

        if (postError) {
            if (postError.code === 'PGRST116') {
                return jsonError('帖子不存在', 404);
            }
            console.error('获取帖子失败:', postError);
            return jsonError('获取帖子失败', 500);
        }

        // 使用 Service Role Client 增加浏览量（绕过 RLS）
        const serviceClient = getServiceRoleClient();
        await withRetry(async () => {
            const { error } = await serviceClient
                .rpc('increment_community_post_view_count', { post_id: id });
            if (error) {
                throw error;
            }
        });

        // 获取评论 - 使用 serviceClient 和重试逻辑
        const commentsResult = await withRetry(async () => {
            const response = await serviceClient
                .from('community_comments')
                .select('*')
                .eq('post_id', id)
                .eq('is_deleted', false)
                .order('created_at', { ascending: true });
            if (response.error) {
                throw response.error;
            }
            return response;
        });
        const commentsData = commentsResult.data;
        const commentsError = commentsResult.error;

        if (commentsError) {
            console.error('获取评论失败:', commentsError);
        }

        // 获取匿名映射 - 使用 serviceClient 和重试逻辑
        const mappingsResult = await withRetry(async () => {
            const response = await serviceClient
                .from('community_anonymous_mapping')
                .select('user_id, anonymous_name')
                .eq('post_id', id);
            if (response.error) {
                throw response.error;
            }
            return response;
        });
        const mappings = mappingsResult.data;

        const anonymousMap = new Map<string, string>();
        mappings?.forEach((item: { user_id: string; anonymous_name: string }) => {
            anonymousMap.set(item.user_id, item.anonymous_name);
        });

        // 构建评论树并添加匿名名称
        type CommentWithReplies = CommunityComment & { replies: CommentWithReplies[] };
        const comments: CommentWithReplies[] = (commentsData || []).map((comment: CommunityComment) => ({
            ...comment,
            anonymous_name: anonymousMap.get(comment.user_id) || '匿名用户',
            replies: [],
        }));

        const commentMap = new Map<string, CommentWithReplies>();
        const rootComments: CommentWithReplies[] = [];

        comments.forEach(comment => {
            commentMap.set(comment.id, comment);
        });

        comments.forEach(comment => {
            if (comment.parent_id) {
                const parent = commentMap.get(comment.parent_id);
                if (parent) {
                    parent.replies.push(comment);
                }
            } else {
                rootComments.push(comment);
            }
        });

        // 获取当前用户信息（需要在处理评论前获取）
        const currentUserId = user?.id;
        const isPostAuthor = currentUserId ? post.user_id === currentUserId : false;

        // 为评论添加 isAuthor 标记，然后移除 user_id
        type SafeComment = Omit<CommentWithReplies, 'user_id' | 'replies'> & {
            isAuthor: boolean;
            replies: SafeComment[];
        };
        function processComment(comment: CommentWithReplies): SafeComment {
            const isCommentAuthor = currentUserId ? comment.user_id === currentUserId : false;
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { user_id, replies, ...safeComment } = comment;
            return {
                ...safeComment,
                isAuthor: isCommentAuthor,
                replies: (replies || []).map(processComment),
            };
        }

        // 移除 user_id 保护匿名性
        const safePost = sanitizePost(post as CommunityPost);
        const safeComments = rootComments.map(c => processComment(c));

        return jsonOk({
            post: safePost,
            comments: safeComments,
            isAuthor: isPostAuthor,
        });
    } catch (error) {
        console.error('获取帖子失败:', error);
        return jsonError('获取帖子失败', 500);
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const auth = await requireUserContext(request);
        if ('error' in auth) {
            return jsonError(auth.error.message, auth.error.status);
        }
        const { supabase, user } = auth;

        const { id } = await params;
        const body = await request.json();

        // 只允许用户更新特定字段，防止权限提升
        const allowedFields = ['title', 'content', 'category', 'tags', 'anonymous_name'];
        const updateData: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
        };

        for (const field of allowedFields) {
            if (body[field] !== undefined) {
                updateData[field] = body[field];
            }
        }

        const { data, error } = await supabase
            .from('community_posts')
            .update(updateData)
            .eq('id', id)
            .eq('user_id', user.id)
            .select()
            .single();

        if (error) {
            console.error('更新帖子失败:', error);
            return jsonError('更新帖子失败', 500);
        }

        // 移除 user_id
        return jsonOk(sanitizePost(data as CommunityPost));
    } catch (error) {
        console.error('更新帖子失败:', error);
        return jsonError('更新帖子失败', 500);
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const auth = await requireUserContext(request);
        if ('error' in auth) {
            return jsonError(auth.error.message, auth.error.status);
        }
        const { supabase, user } = auth;

        const { id } = await params;

        const { error } = await supabase
            .from('community_posts')
            .update({ is_deleted: true, updated_at: new Date().toISOString() })
            .eq('id', id)
            .eq('user_id', user.id);

        if (error) {
            console.error('删除帖子失败:', error);
            return jsonError('删除帖子失败', 500);
        }

        return jsonOk({ success: true });
    } catch (error) {
        console.error('删除帖子失败:', error);
        return jsonError('删除帖子失败', 500);
    }
}
