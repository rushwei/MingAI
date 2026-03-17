/**
 * 单个帖子 API 路由
 * GET: 获取帖子详情
 * PUT: 更新帖子
 * DELETE: 删除帖子（软删除）
 */

import { NextRequest } from 'next/server';
import { CommunityPost, CommunityComment } from '@/lib/community';
import { asCommunityLookupClient, loadCommunityAuthorProfileMap } from '@/lib/community-server';
import { getAuthContext, jsonError, jsonOk, requireUserContext, getSystemAdminClient } from '@/lib/api-utils';
import { withRetry } from '@/lib/retry';

type CommunityPostRow = Omit<CommunityPost, 'author_name'> & {
    user_id: string;
    anonymous_name: string | null;
};

type CommunityCommentRow = Omit<CommunityComment, 'author_name' | 'replies'> & {
    user_id: string;
    anonymous_name?: string | null;
    replies?: CommunityCommentRow[];
};

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
        const serviceClient = getSystemAdminClient();
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

        const authorMap = await loadCommunityAuthorProfileMap(asCommunityLookupClient(serviceClient), [
            post.user_id,
            ...((commentsData || []).map((comment: CommunityCommentRow) => comment.user_id)),
        ]);

        type CommentWithReplies = CommunityCommentRow & { replies: CommentWithReplies[] };
        const comments: CommentWithReplies[] = (commentsData || []).map((comment: CommunityCommentRow) => ({
            ...comment,
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
        const viewer = {
            isAuthenticated: !!currentUserId,
            isAuthor: isPostAuthor,
            canEdit: isPostAuthor,
            canDelete: isPostAuthor,
        };

        // 为评论添加 author/isAuthor 标记，然后移除 user_id
        type SafeComment = Omit<CommentWithReplies, 'user_id' | 'replies'> & {
            author_name: string;
            author_avatar_url: string | null;
            isAuthor: boolean;
            isPostAuthor: boolean;
            replies: SafeComment[];
        };
        function processComment(comment: CommentWithReplies): SafeComment {
            const isCommentAuthor = currentUserId ? comment.user_id === currentUserId : false;
            const isPostAuthor = comment.user_id === post.user_id;
            const { replies, ...safeComment } = comment;
            delete (safeComment as { user_id?: unknown }).user_id;
            const authorProfile = authorMap.get(comment.user_id) || { name: '命理爱好者', avatarUrl: null };
            return {
                ...safeComment,
                author_name: authorProfile.name,
                author_avatar_url: authorProfile.avatarUrl,
                isAuthor: isCommentAuthor,
                isPostAuthor,
                replies: (replies || []).map(processComment),
            };
        }

        const safePost = toPublicPost(
            post as CommunityPostRow,
            authorMap.get(post.user_id) || { name: '命理爱好者', avatarUrl: null },
        );
        const safeComments = rootComments.map(c => processComment(c));

        return jsonOk({
            post: safePost,
            comments: safeComments,
            isAuthor: isPostAuthor,
            viewer,
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
        const allowedFields = ['title', 'content', 'category', 'tags'];
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

        const authorMap = await loadCommunityAuthorProfileMap(asCommunityLookupClient(auth.supabase), [user.id]);
        return jsonOk(
            toPublicPost(data as CommunityPostRow, authorMap.get(user.id) || { name: '命理爱好者', avatarUrl: null }),
        );
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
