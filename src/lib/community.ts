/**
 * 命理社区服务
 *
 * 浏览器侧统一通过社区 API 访问数据。
 */

import { requestBrowserData } from '@/lib/browser-api';

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
    author_name: string;
    author_avatar_url: string | null;
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
    parent_id: string | null;
    content: string;
    upvote_count: number;
    downvote_count: number;
    is_deleted: boolean;
    created_at: string;
    updated_at: string;
    author_name: string;
    author_avatar_url: string | null;
    replies?: CommunityComment[];
}

export interface CommunityViewerState {
    isAuthenticated: boolean;
    isAuthor: boolean;
    canEdit: boolean;
    canDelete: boolean;
}

export interface CommunityPostDetail {
    post: CommunityPost;
    comments: CommunityComment[];
    isAuthor: boolean;
    viewer: CommunityViewerState;
    viewerVotes: {
        post: VoteType | null;
        comments: Record<string, VoteType>;
    };
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

type PostWriteMode = 'create' | 'update';

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isPostCategory(value: string): value is PostCategory {
    return POST_CATEGORIES.some((item) => item.value === value);
}

function hasOwn(obj: Record<string, unknown>, key: string): boolean {
    return Object.prototype.hasOwnProperty.call(obj, key);
}

function normalizeTags(value: unknown): string[] | { error: string } {
    if (!Array.isArray(value)) {
        return { error: 'tags 必须是字符串数组' };
    }

    const tags: string[] = [];
    for (const entry of value) {
        if (typeof entry !== 'string') {
            return { error: 'tags 必须是字符串数组' };
        }
        const trimmed = entry.trim();
        if (trimmed) {
            tags.push(trimmed);
        }
    }

    return Array.from(new Set(tags));
}

export function normalizePostInput(
    input: unknown,
    mode: PostWriteMode,
): { data: Partial<PostInput> } | { error: string } {
    if (!isPlainObject(input)) {
        return { error: '请求体不是合法对象' };
    }

    const data: Partial<PostInput> = {};

    if (mode === 'create' || hasOwn(input, 'title')) {
        if (typeof input.title !== 'string' || !input.title.trim()) {
            return { error: '标题和内容不能为空' };
        }
        data.title = input.title.trim();
    }

    if (mode === 'create' || hasOwn(input, 'content')) {
        if (typeof input.content !== 'string' || !input.content.trim()) {
            return { error: '标题和内容不能为空' };
        }
        data.content = input.content.trim();
    }

    if (mode === 'create' || hasOwn(input, 'category')) {
        if (input.category == null || input.category === '') {
            data.category = 'general';
        } else if (typeof input.category === 'string' && isPostCategory(input.category)) {
            data.category = input.category;
        } else {
            return { error: '帖子分类无效' };
        }
    }

    if (mode === 'create' || hasOwn(input, 'tags')) {
        if (input.tags == null) {
            data.tags = [];
        } else {
            const tags = normalizeTags(input.tags);
            if (typeof tags === 'object' && !Array.isArray(tags)) {
                return tags;
            }
            data.tags = tags;
        }
    }

    if (mode === 'update' && Object.keys(data).length === 0) {
        return { error: '没有可更新的帖子字段' };
    }

    return { data };
}

async function requestCommunityJson<T>(
    input: string,
    init: RequestInit | undefined,
    fallbackMessage: string,
): Promise<T>;
async function requestCommunityJson<T>(
    input: string,
    init: RequestInit | undefined,
    fallbackMessage: string,
    options: { allowNotFound: true },
): Promise<T | null>;
async function requestCommunityJson<T>(
    input: string,
    init: RequestInit | undefined,
    fallbackMessage: string,
    options: { allowNotFound?: boolean } = {},
): Promise<T | null> {
    return await requestBrowserData<T>(input, init, {
        fallbackMessage,
        allowNotFound: options.allowNotFound,
    });
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

    const payload = await requestCommunityJson<{ posts?: CommunityPost[]; total?: number }>(
        `/api/community/posts?${query.toString()}`,
        { method: 'GET' },
        '获取帖子失败',
    );
    return {
        posts: payload.posts || [],
        total: payload.total || 0,
    };
}

/**
 * 获取帖子详情
 */
export async function getPost(postId: string): Promise<CommunityPost | null> {
    const payload = await requestCommunityJson<{ post?: CommunityPost | null }>(
        `/api/community/posts/${postId}`,
        { method: 'GET' },
        '获取帖子失败',
        { allowNotFound: true },
    );
    return (payload?.post ?? null) as CommunityPost | null;
}

export async function getPostDetail(postId: string): Promise<CommunityPostDetail | null> {
    const payload = await requestCommunityJson<{
        post?: CommunityPost | null;
        comments?: CommunityComment[];
        isAuthor?: boolean;
        viewer?: CommunityViewerState | null;
        viewerVotes?: {
            post?: VoteType | null;
            comments?: Record<string, VoteType> | null;
        } | null;
    }>(
        `/api/community/posts/${postId}`,
        { method: 'GET' },
        '获取帖子失败',
        { allowNotFound: true },
    );

    if (!payload?.post) {
        return null;
    }

    return {
        post: payload.post,
        comments: payload.comments ?? [],
        isAuthor: payload.isAuthor === true,
        viewer: payload.viewer ?? {
            isAuthenticated: false,
            isAuthor: false,
            canEdit: false,
            canDelete: false,
        },
        viewerVotes: {
            post: payload.viewerVotes?.post ?? null,
            comments: payload.viewerVotes?.comments ?? {},
        },
    };
}

/**
 * 创建帖子
 */
export async function createPost(input: PostInput): Promise<CommunityPost> {
    const payload = await requestCommunityJson<CommunityPost>(
        '/api/community/posts',
        {
            method: 'POST',
            body: JSON.stringify({
                title: input.title,
                content: input.content,
                category: input.category || 'general',
                tags: input.tags || [],
            }),
        },
        '创建帖子失败',
    );
    return payload as CommunityPost;
}

/**
 * 更新帖子
 */
export async function updatePost(postId: string, input: Partial<PostInput>): Promise<CommunityPost> {
    const payload = await requestCommunityJson<CommunityPost>(
        `/api/community/posts/${postId}`,
        {
            method: 'PUT',
            body: JSON.stringify(input),
        },
        '更新帖子失败',
    );
    return payload as CommunityPost;
}

/**
 * 删除帖子（软删除）
 */
export async function deletePost(postId: string): Promise<void> {
    await requestCommunityJson(
        `/api/community/posts/${postId}`,
        { method: 'DELETE' },
        '删除帖子失败',
    );
}

// =====================================================
// 评论 CRUD 操作
// =====================================================

/**
 * 获取帖子评论
 */
export async function getComments(postId: string): Promise<CommunityComment[]> {
    const payload = await requestCommunityJson<{ comments?: CommunityComment[] }>(
        `/api/community/posts/${postId}`,
        { method: 'GET' },
        '获取评论失败',
    );
    return payload.comments ?? [];
}

/**
 * 创建评论
 */
export async function createComment(input: CommentInput): Promise<CommunityComment> {
    const payload = await requestCommunityJson<CommunityComment>(
        '/api/community/comments',
        {
            method: 'POST',
            body: JSON.stringify({
                post_id: input.post_id,
                content: input.content,
                parent_id: input.parent_id || null,
            }),
        },
        '创建评论失败',
    );
    return payload as CommunityComment;
}

/**
 * 更新评论
 */
export async function updateComment(commentId: string, content: string): Promise<CommunityComment> {
    return await requestCommunityJson<CommunityComment>(
        `/api/community/comments/${commentId}`,
        {
            method: 'PUT',
            body: JSON.stringify({ content }),
        },
        '更新评论失败',
    ) as CommunityComment;
}

/**
 * 删除评论（软删除）
 */
export async function deleteComment(commentId: string): Promise<void> {
    await requestCommunityJson(
        `/api/community/comments/${commentId}`,
        { method: 'DELETE' },
        '删除评论失败',
    );
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
    const payload = await requestCommunityJson<{ vote: VoteType | null }>(
        `/api/community/votes?${query.toString()}`,
        { method: 'GET' },
        '获取投票状态失败',
    );
    return payload.vote || null;
}

/**
 * 投票（切换）
 */
export async function vote(
    targetType: TargetType,
    targetId: string,
    voteType: VoteType
): Promise<VoteType | null> {
    const payload = await requestCommunityJson<{ vote: VoteType | null }>(
        '/api/community/votes',
        {
            method: 'POST',
            body: JSON.stringify({ targetType, targetId, voteType }),
        },
        '投票失败',
    );
    return payload.vote || null;
}

// =====================================================
// 举报功能
// =====================================================

/**
 * 提交举报
 */
export async function createReport(
    targetType: TargetType,
    targetId: string,
    reason: ReportReason,
    description?: string
): Promise<CommunityReport> {
    return await requestCommunityJson<CommunityReport>(
        '/api/community/reports',
        {
            method: 'POST',
            body: JSON.stringify({ targetType, targetId, reason, description }),
        },
        '提交举报失败',
    ) as CommunityReport;
}

// =====================================================
// 管理员功能
// =====================================================

/**
 * 管理员置顶帖子
 */
export async function adminPinPost(postId: string, isPinned: boolean): Promise<void> {
    await requestCommunityJson(
        `/api/community/posts/${postId}/admin`,
        {
            method: 'PUT',
            body: JSON.stringify({ action: 'pin', value: isPinned }),
        },
        '置顶帖子失败',
    );
}

/**
 * 管理员设置精华帖子
 */
export async function adminFeaturePost(postId: string, isFeatured: boolean): Promise<void> {
    await requestCommunityJson(
        `/api/community/posts/${postId}/admin`,
        {
            method: 'PUT',
            body: JSON.stringify({ action: 'feature', value: isFeatured }),
        },
        '设置精华失败',
    );
}

/**
 * 管理员删除帖子
 */
export async function adminDeletePost(postId: string): Promise<void> {
    await requestCommunityJson(
        `/api/community/posts/${postId}/admin`,
        {
            method: 'PUT',
            body: JSON.stringify({ action: 'delete' }),
        },
        '删除帖子失败',
    );
}

/**
 * 管理员删除评论
 */
export async function adminDeleteComment(commentId: string): Promise<void> {
    await requestCommunityJson(
        `/api/community/comments/${commentId}/admin`,
        { method: 'DELETE' },
        '删除评论失败',
    );
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

    const payload = await requestCommunityJson<{ reports?: CommunityReport[]; total?: number }>(
        `/api/community/reports?${query.toString()}`,
        { method: 'GET' },
        '获取举报列表失败',
    );
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

    await requestCommunityJson(
        '/api/community/reports',
        {
            method: 'PUT',
            body: JSON.stringify({ reportId, status, notes }),
        },
        '处理举报失败',
    );
}

/**
 * 检查用户是否是帖子作者
 */
export async function isPostAuthor(postId: string, userId: string): Promise<boolean> {
    void userId;

    const payload = await requestCommunityJson<{ viewer?: { isAuthor?: boolean | null } }>(
        `/api/community/posts/${postId}`,
        { method: 'GET' },
        '获取作者信息失败',
    );
    return payload.viewer?.isAuthor === true;
}

/**
 * 检查用户是否是评论作者
 */
export async function isCommentAuthor(commentId: string, userId: string): Promise<boolean> {
    void userId;

    const payload = await requestCommunityJson<{ viewer?: { isAuthor?: boolean | null } }>(
        `/api/community/comments/${commentId}`,
        { method: 'GET' },
        '获取作者信息失败',
    );
    return payload.viewer?.isAuthor === true;
}
