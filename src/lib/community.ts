/**
 * 命理社区服务
 * 
 * 提供帖子、评论、投票、举报的 CRUD 操作和管理员功能
 */

import { supabase } from '@/lib/supabase';

// =====================================================
// 类型定义
// =====================================================

export type PostCategory = 'general' | 'bazi' | 'ziwei' | 'liuyao' | 'tarot' | 'other';

export type VoteType = 'up' | 'down';

export type TargetType = 'post' | 'comment';

export type ReportReason = 'spam' | 'abuse' | 'inappropriate' | 'other';

export type ReportStatus = 'pending' | 'reviewed' | 'resolved' | 'dismissed';

export interface CommunityPost {
    id: string;
    user_id: string;
    anonymous_name: string;
    title: string;
    content: string;
    category: PostCategory;
    tags: string[];
    view_count: number;
    upvote_count: number;
    downvote_count: number;
    comment_count: number;
    is_pinned: boolean;
    is_featured: boolean;
    is_deleted: boolean;
    created_at: string;
    updated_at: string;
}

export interface CommunityComment {
    id: string;
    post_id: string;
    user_id: string;
    parent_id: string | null;
    content: string;
    upvote_count: number;
    downvote_count: number;
    is_deleted: boolean;
    created_at: string;
    updated_at: string;
    // 客户端附加的匿名信息
    anonymous_name?: string;
    replies?: CommunityComment[];
}

export interface CommunityVote {
    id: string;
    user_id: string;
    target_type: TargetType;
    target_id: string;
    vote_type: VoteType;
    created_at: string;
}

export interface CommunityReport {
    id: string;
    reporter_id: string;
    target_type: TargetType;
    target_id: string;
    reason: ReportReason;
    description: string | null;
    status: ReportStatus;
    reviewed_by: string | null;
    reviewed_at: string | null;
    review_notes: string | null;
    created_at: string;
}

export interface PostInput {
    title: string;
    content: string;
    category?: PostCategory;
    tags?: string[];
    anonymous_name?: string;
}

export interface CommentInput {
    post_id: string;
    content: string;
    parent_id?: string;
}

export interface PostFilters {
    category?: PostCategory;
    search?: string;
    sortBy?: 'latest' | 'popular' | 'hot';
}

// =====================================================
// 帖子分类配置
// =====================================================

export const POST_CATEGORIES: { value: PostCategory; label: string; icon: string }[] = [
    { value: 'general', label: '综合讨论', icon: '💬' },
    { value: 'bazi', label: '八字命理', icon: '🔮' },
    { value: 'ziwei', label: '紫微斗数', icon: '⭐' },
    { value: 'liuyao', label: '六爻占卜', icon: '☯️' },
    { value: 'tarot', label: '塔罗占卜', icon: '🃏' },
    { value: 'other', label: '其他', icon: '📌' },
];

export const REPORT_REASONS: { value: ReportReason; label: string }[] = [
    { value: 'spam', label: '垃圾广告' },
    { value: 'abuse', label: '辱骂/攻击' },
    { value: 'inappropriate', label: '不当内容' },
    { value: 'other', label: '其他原因' },
];

// =====================================================
// 匿名相关功能
// =====================================================

// =====================================================
// 帖子 CRUD 操作
// =====================================================

/**
 * 获取帖子列表
 */
export async function getPosts(
    filters?: PostFilters,
    page: number = 1,
    pageSize: number = 20
): Promise<{ posts: CommunityPost[]; total: number }> {
    let query = supabase
        .from('community_posts')
        .select('*', { count: 'exact' })
        .eq('is_deleted', false);

    // 应用筛选条件
    if (filters?.category) {
        query = query.eq('category', filters.category);
    }
    if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,content.ilike.%${filters.search}%`);
    }

    // 排序
    const sortBy = filters?.sortBy || 'latest';
    if (sortBy === 'latest') {
        query = query.order('is_pinned', { ascending: false }).order('created_at', { ascending: false });
    } else if (sortBy === 'popular') {
        query = query.order('is_pinned', { ascending: false }).order('upvote_count', { ascending: false });
    } else if (sortBy === 'hot') {
        // 热门：综合考虑投票和评论
        query = query.order('is_pinned', { ascending: false }).order('comment_count', { ascending: false });
    }

    // 分页
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
        console.error('获取帖子失败:', error);
        throw new Error('获取帖子失败');
    }

    return {
        posts: data as CommunityPost[],
        total: count || 0,
    };
}

/**
 * 获取帖子详情
 */
export async function getPost(postId: string): Promise<CommunityPost | null> {
    const response = await fetch(`/api/community/posts/${postId}`);
    if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error('获取帖子失败');
    }
    const payload = await response.json();
    return (payload?.post ?? null) as CommunityPost | null;
}

/**
 * 创建帖子
 */
export async function createPost(input: PostInput): Promise<CommunityPost> {
    const response = await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            title: input.title,
            content: input.content,
            category: input.category || 'general',
            tags: input.tags || [],
            anonymous_name: input.anonymous_name || '匿名用户',
        }),
    });

    if (!response.ok) {
        throw new Error('创建帖子失败');
    }

    const payload = await response.json();
    return payload as CommunityPost;
}

/**
 * 更新帖子
 */
export async function updatePost(postId: string, input: Partial<PostInput>): Promise<CommunityPost> {
    const response = await fetch(`/api/community/posts/${postId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
    });

    if (!response.ok) {
        throw new Error('更新帖子失败');
    }

    const payload = await response.json();
    return payload as CommunityPost;
}

/**
 * 删除帖子（软删除）
 */
export async function deletePost(postId: string): Promise<void> {
    const response = await fetch(`/api/community/posts/${postId}`, { method: 'DELETE' });
    if (!response.ok) {
        throw new Error('删除帖子失败');
    }
}

// =====================================================
// 评论 CRUD 操作
// =====================================================

/**
 * 获取帖子评论
 */
export async function getComments(postId: string): Promise<CommunityComment[]> {
    const response = await fetch(`/api/community/posts/${postId}`);
    if (!response.ok) {
        throw new Error('获取评论失败');
    }
    const payload = await response.json();
    return (payload?.comments ?? []) as CommunityComment[];
}

/**
 * 创建评论
 */
export async function createComment(input: CommentInput): Promise<CommunityComment> {
    const response = await fetch('/api/community/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            post_id: input.post_id,
            content: input.content,
            parent_id: input.parent_id || null,
        }),
    });

    if (!response.ok) {
        throw new Error('创建评论失败');
    }

    const payload = await response.json();
    return payload as CommunityComment;
}

/**
 * 更新评论
 */
export async function updateComment(commentId: string, userId: string, content: string): Promise<CommunityComment> {
    const { data, error } = await supabase
        .from('community_comments')
        .update({
            content,
            updated_at: new Date().toISOString(),
        })
        .eq('id', commentId)
        .eq('user_id', userId)
        .select()
        .single();

    if (error) {
        console.error('更新评论失败:', error);
        throw new Error('更新评论失败');
    }

    return data as CommunityComment;
}

/**
 * 删除评论（软删除）
 */
export async function deleteComment(commentId: string, userId: string): Promise<void> {
    const { error } = await supabase
        .from('community_comments')
        .update({ is_deleted: true, updated_at: new Date().toISOString() })
        .eq('id', commentId)
        .eq('user_id', userId);

    if (error) {
        console.error('删除评论失败:', error);
        throw new Error('删除评论失败');
    }
}

// =====================================================
// 投票功能
// =====================================================

/**
 * 获取用户对目标的投票
 */
export async function getUserVote(
    userId: string,
    targetType: TargetType,
    targetId: string
): Promise<VoteType | null> {
    const { data } = await supabase
        .from('community_votes')
        .select('vote_type')
        .eq('user_id', userId)
        .eq('target_type', targetType)
        .eq('target_id', targetId)
        .single();

    return data?.vote_type as VoteType | null;
}

/**
 * 投票（切换）
 */
export async function vote(
    userId: string,
    targetType: TargetType,
    targetId: string,
    voteType: VoteType
): Promise<VoteType | null> {
    // 获取现有投票
    const { data: existing } = await supabase
        .from('community_votes')
        .select('*')
        .eq('user_id', userId)
        .eq('target_type', targetType)
        .eq('target_id', targetId)
        .single();

    if (existing) {
        if (existing.vote_type === voteType) {
            // 取消投票
            await supabase
                .from('community_votes')
                .delete()
                .eq('id', existing.id);
            return null;
        } else {
            // 切换投票类型
            await supabase
                .from('community_votes')
                .update({ vote_type: voteType })
                .eq('id', existing.id);
            return voteType;
        }
    } else {
        // 新增投票
        await supabase.from('community_votes').insert({
            user_id: userId,
            target_type: targetType,
            target_id: targetId,
            vote_type: voteType,
        });
        return voteType;
    }
}

// =====================================================
// 举报功能
// =====================================================

/**
 * 提交举报
 */
export async function createReport(
    userId: string,
    targetType: TargetType,
    targetId: string,
    reason: ReportReason,
    description?: string
): Promise<CommunityReport> {
    const { data, error } = await supabase
        .from('community_reports')
        .insert({
            reporter_id: userId,
            target_type: targetType,
            target_id: targetId,
            reason,
            description,
        })
        .select()
        .single();

    if (error) {
        console.error('提交举报失败:', error);
        throw new Error('提交举报失败');
    }

    return data as CommunityReport;
}

// =====================================================
// 管理员功能
// =====================================================

/**
 * 管理员置顶帖子
 */
export async function adminPinPost(postId: string, isPinned: boolean): Promise<void> {
    const { error } = await supabase
        .from('community_posts')
        .update({ is_pinned: isPinned, updated_at: new Date().toISOString() })
        .eq('id', postId);

    if (error) throw new Error('操作失败');
}

/**
 * 管理员设置精华帖子
 */
export async function adminFeaturePost(postId: string, isFeatured: boolean): Promise<void> {
    const { error } = await supabase
        .from('community_posts')
        .update({ is_featured: isFeatured, updated_at: new Date().toISOString() })
        .eq('id', postId);

    if (error) throw new Error('操作失败');
}

/**
 * 管理员删除帖子
 */
export async function adminDeletePost(postId: string): Promise<void> {
    const { error } = await supabase
        .from('community_posts')
        .update({ is_deleted: true, updated_at: new Date().toISOString() })
        .eq('id', postId);

    if (error) throw new Error('操作失败');
}

/**
 * 管理员删除评论
 */
export async function adminDeleteComment(commentId: string): Promise<void> {
    const { error } = await supabase
        .from('community_comments')
        .update({ is_deleted: true, updated_at: new Date().toISOString() })
        .eq('id', commentId);

    if (error) throw new Error('操作失败');
}

/**
 * 管理员获取举报列表
 */
export async function adminGetReports(
    status?: ReportStatus,
    page: number = 1,
    pageSize: number = 20
): Promise<{ reports: CommunityReport[]; total: number }> {
    let query = supabase
        .from('community_reports')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

    if (status) {
        query = query.eq('status', status);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) throw new Error('获取举报列表失败');

    return {
        reports: data as CommunityReport[],
        total: count || 0,
    };
}

/**
 * 管理员处理举报
 */
export async function adminResolveReport(
    reportId: string,
    adminId: string,
    status: 'resolved' | 'dismissed',
    notes?: string
): Promise<void> {
    const { error } = await supabase
        .from('community_reports')
        .update({
            status,
            reviewed_by: adminId,
            reviewed_at: new Date().toISOString(),
            review_notes: notes,
        })
        .eq('id', reportId);

    if (error) throw new Error('处理举报失败');
}

/**
 * 检查用户是否是帖子作者
 */
export async function isPostAuthor(postId: string, userId: string): Promise<boolean> {
    const { data } = await supabase
        .from('community_posts')
        .select('user_id')
        .eq('id', postId)
        .single();

    return data?.user_id === userId;
}

/**
 * 检查用户是否是评论作者
 */
export async function isCommentAuthor(commentId: string, userId: string): Promise<boolean> {
    const { data } = await supabase
        .from('community_comments')
        .select('user_id')
        .eq('id', commentId)
        .single();

    return data?.user_id === userId;
}
