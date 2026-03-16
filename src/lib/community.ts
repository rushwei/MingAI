/**
 * 命理社区服务
 *
 * 浏览器侧统一通过社区 API 访问数据。
 */

// =====================================================
// 类型定义
// =====================================================

export type PostCategory = 'general' | 'bazi' | 'ziwei' | 'liuyao' | 'tarot' | 'qimen' | 'other';

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

async function requestJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
    const response = await fetch(input, {
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...(init?.headers || {}),
        },
        ...init,
    });

    const payload = await response.json().catch(() => null) as T | { error?: string } | null;
    if (!response.ok) {
        throw new Error((payload as { error?: string } | null)?.error || '请求失败');
    }
    return payload as T;
}

// =====================================================
// 帖子分类配置
// =====================================================

export const POST_CATEGORIES: { value: PostCategory; label: string; icon: string }[] = [
    { value: 'general', label: '综合讨论', icon: '💬' },
    { value: 'bazi', label: '八字命理', icon: '🔮' },
    { value: 'ziwei', label: '紫微斗数', icon: '⭐' },
    { value: 'liuyao', label: '六爻占卜', icon: '☯️' },
    { value: 'qimen', label: '奇门遁甲', icon: '🧭' },
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
    const query = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        sortBy: filters?.sortBy || 'latest',
    });
    if (filters?.category) query.set('category', filters.category);
    if (filters?.search) query.set('search', filters.search);

    const payload = await requestJson<{ posts: CommunityPost[]; total: number }>(`/api/community/posts?${query.toString()}`);
    return {
        posts: payload.posts || [],
        total: payload.total || 0,
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
    void userId;

    return await requestJson<CommunityComment>(`/api/community/comments/${commentId}`, {
        method: 'PUT',
        body: JSON.stringify({ content }),
    });
}

/**
 * 删除评论（软删除）
 */
export async function deleteComment(commentId: string, userId: string): Promise<void> {
    void userId;

    await requestJson(`/api/community/comments/${commentId}`, {
        method: 'DELETE',
    });
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
    void userId;

    const query = new URLSearchParams({ targetType, targetId });
    const payload = await requestJson<{ vote: VoteType | null }>(`/api/community/votes?${query.toString()}`);
    return payload.vote || null;
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
    void userId;

    const payload = await requestJson<{ vote: VoteType | null }>('/api/community/votes', {
        method: 'POST',
        body: JSON.stringify({ targetType, targetId, voteType }),
    });
    return payload.vote || null;
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
    void userId;

    return await requestJson<CommunityReport>('/api/community/reports', {
        method: 'POST',
        body: JSON.stringify({ targetType, targetId, reason, description }),
    });
}

// =====================================================
// 管理员功能
// =====================================================

/**
 * 管理员置顶帖子
 */
export async function adminPinPost(postId: string, isPinned: boolean): Promise<void> {
    await requestJson(`/api/community/posts/${postId}/admin`, {
        method: 'PUT',
        body: JSON.stringify({ action: 'pin', value: isPinned }),
    });
}

/**
 * 管理员设置精华帖子
 */
export async function adminFeaturePost(postId: string, isFeatured: boolean): Promise<void> {
    await requestJson(`/api/community/posts/${postId}/admin`, {
        method: 'PUT',
        body: JSON.stringify({ action: 'feature', value: isFeatured }),
    });
}

/**
 * 管理员删除帖子
 */
export async function adminDeletePost(postId: string): Promise<void> {
    await requestJson(`/api/community/posts/${postId}/admin`, {
        method: 'PUT',
        body: JSON.stringify({ action: 'delete' }),
    });
}

/**
 * 管理员删除评论
 */
export async function adminDeleteComment(commentId: string): Promise<void> {
    await requestJson(`/api/community/comments/${commentId}/admin`, {
        method: 'DELETE',
    });
}

/**
 * 管理员获取举报列表
 */
export async function adminGetReports(
    status?: ReportStatus,
    page: number = 1,
    pageSize: number = 20
): Promise<{ reports: CommunityReport[]; total: number }> {
    const query = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
    });
    if (status) query.set('status', status);

    const payload = await requestJson<{ reports: CommunityReport[]; total: number }>(`/api/community/reports?${query.toString()}`);
    return {
        reports: payload.reports || [],
        total: payload.total || 0,
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
    void adminId;

    await requestJson('/api/community/reports', {
        method: 'PUT',
        body: JSON.stringify({ reportId, status, notes }),
    });
}

/**
 * 检查用户是否是帖子作者
 */
export async function isPostAuthor(postId: string, userId: string): Promise<boolean> {
    const payload = await requestJson<{ authorId?: string | null }>(`/api/community/posts/${postId}?includeAuthor=1`);
    return payload.authorId === userId;
}

/**
 * 检查用户是否是评论作者
 */
export async function isCommentAuthor(commentId: string, userId: string): Promise<boolean> {
    const payload = await requestJson<{ authorId?: string | null }>(`/api/community/comments/${commentId}?includeAuthor=1`);
    return payload.authorId === userId;
}
