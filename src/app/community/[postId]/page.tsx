'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
    ArrowLeft,
    ThumbsUp,
    ThumbsDown,
    MessageCircle,
    Flag,
    Edit2,
    Trash2,
    Pin,
    Star,
    Send,
    MoreVertical
} from 'lucide-react';
import {
    CommunityPost,
    CommunityComment,
    VoteType,
    REPORT_REASONS
} from '@/lib/community';
import { supabase } from '@/lib/supabase';

// =====================================================
// 投票按钮组件
// =====================================================
function VoteButtons({
    targetType: _targetType,
    targetId: _targetId,
    upvotes,
    downvotes,
    userVote,
    onVote
}: {
    targetType: 'post' | 'comment';
    targetId: string;
    upvotes: number;
    downvotes: number;
    userVote: VoteType | null;
    onVote: (type: VoteType) => void;
}) {
    return (
        <div className="flex items-center gap-2">
            <button
                onClick={() => onVote('up')}
                className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${userVote === 'up'
                    ? 'bg-green-500/20 text-green-400'
                    : 'text-foreground-secondary hover:text-green-400'
                    }`}
            >
                <ThumbsUp className="w-4 h-4" />
                <span className="text-sm">{upvotes}</span>
            </button>
            <button
                onClick={() => onVote('down')}
                className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${userVote === 'down'
                    ? 'bg-red-500/20 text-red-400'
                    : 'text-foreground-secondary hover:text-red-400'
                    }`}
            >
                <ThumbsDown className="w-4 h-4" />
                <span className="text-sm">{downvotes}</span>
            </button>
        </div>
    );
}

// =====================================================
// 举报模态框
// =====================================================
function ReportModal({
    targetType,
    targetId,
    onClose
}: {
    targetType: 'post' | 'comment';
    targetId: string;
    onClose: () => void;
}) {
    const [reason, setReason] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reason) return;

        setLoading(true);
        try {
            const response = await fetch('/api/community/reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetType, targetId, reason, description }),
            });

            if (response.ok) {
                setSuccess(true);
                setTimeout(onClose, 1500);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-background rounded-xl w-full max-w-md border border-border">
                <div className="p-4 border-b border-border">
                    <h2 className="text-lg font-medium text-foreground">举报{targetType === 'post' ? '帖子' : '评论'}</h2>
                </div>
                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    {success ? (
                        <div className="text-green-400 text-center py-4">
                            ✓ 举报已提交，感谢您的反馈
                        </div>
                    ) : (
                        <>
                            <div>
                                <label className="block text-sm text-foreground-secondary mb-2">举报原因 *</label>
                                <div className="space-y-2">
                                    {REPORT_REASONS.map(r => (
                                        <label key={r.value} className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="reason"
                                                value={r.value}
                                                checked={reason === r.value}
                                                onChange={(e) => setReason(e.target.value)}
                                                className="text-purple-600"
                                            />
                                            <span className="text-foreground">{r.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm text-foreground-secondary mb-1">补充说明</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={3}
                                    className="w-full bg-background-secondary border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-accent resize-none"
                                    placeholder="可选"
                                />
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 px-4 py-2 text-foreground-secondary hover:text-foreground transition-colors"
                                >
                                    取消
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading || !reason}
                                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                                >
                                    {loading ? '提交中...' : '提交举报'}
                                </button>
                            </div>
                        </>
                    )}
                </form>
            </div>
        </div>
    );
}

// =====================================================
// 评论项组件
// =====================================================
function CommentItem({
    comment,
    postId,
    userId,
    isAdmin,
    userVotes,
    onVote,
    onReply,
    onDelete,
    onReport
}: {
    comment: CommunityComment & { isAuthor?: boolean };
    postId: string;
    userId: string | null;
    isAdmin: boolean;
    userVotes: Map<string, VoteType>;
    onVote: (commentId: string, voteType: VoteType) => void;
    onReply: (parentId: string) => void;
    onDelete: (commentId: string) => void;
    onReport: (commentId: string) => void;
}) {
    // 使用 API 返回的 isAuthor 字段（保护匿名性，不暴露 user_id）
    const isAuthor = comment.isAuthor === true;
    const [showMenu, setShowMenu] = useState(false);

    return (
        <div className="py-3 border-b border-border last:border-0">
            <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-background-tertiary flex items-center justify-center text-sm text-foreground">
                    {comment.anonymous_name?.charAt(0) || '匿'}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium text-foreground">{comment.anonymous_name}</span>
                        <span className="text-foreground-secondary">
                            {new Date(comment.created_at).toLocaleString()}
                        </span>
                    </div>
                    <p className="text-foreground-secondary mt-1 whitespace-pre-wrap">{comment.content}</p>
                    <div className="flex items-center gap-3 mt-2">
                        <VoteButtons
                            targetType="comment"
                            targetId={comment.id}
                            upvotes={comment.upvote_count}
                            downvotes={comment.downvote_count}
                            userVote={userVotes.get(comment.id) || null}
                            onVote={(type) => onVote(comment.id, type)}
                        />
                        {userId && (
                            <button
                                onClick={() => onReply(comment.id)}
                                className="text-foreground-secondary hover:text-foreground text-sm flex items-center gap-1"
                            >
                                <MessageCircle className="w-4 h-4" />
                                回复
                            </button>
                        )}
                        <div className="relative">
                            <button
                                onClick={() => setShowMenu(!showMenu)}
                                className="text-foreground-secondary hover:text-foreground p-1"
                            >
                                <MoreVertical className="w-4 h-4" />
                            </button>
                            {showMenu && (
                                <div className="absolute right-0 top-full mt-1 bg-background-secondary rounded-lg shadow-lg py-1 z-10 min-w-[100px] border border-border">
                                    {userId && (
                                        <button
                                            onClick={() => { onReport(comment.id); setShowMenu(false); }}
                                            className="w-full px-3 py-2 text-left text-sm text-foreground-secondary hover:bg-background flex items-center gap-2"
                                        >
                                            <Flag className="w-4 h-4" /> 举报
                                        </button>
                                    )}
                                    {(isAuthor || isAdmin) && (
                                        <button
                                            onClick={() => { onDelete(comment.id); setShowMenu(false); }}
                                            className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-background flex items-center gap-2"
                                        >
                                            <Trash2 className="w-4 h-4" /> 删除
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 子回复 */}
                    {comment.replies && comment.replies.length > 0 && (
                        <div className="ml-4 mt-3 border-l-2 border-border pl-4">
                            {comment.replies.map(reply => (
                                <CommentItem
                                    key={reply.id}
                                    comment={reply}
                                    postId={postId}
                                    userId={userId}
                                    isAdmin={isAdmin}
                                    userVotes={userVotes}
                                    onVote={onVote}
                                    onReply={onReply}
                                    onDelete={onDelete}
                                    onReport={onReport}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// =====================================================
// 主页面组件
// =====================================================
export default function PostDetailPage() {
    const router = useRouter();
    const params = useParams();
    const postId = params.postId as string;

    const [loading, setLoading] = useState(true);
    const [post, setPost] = useState<CommunityPost | null>(null);
    const [comments, setComments] = useState<CommunityComment[]>([]);
    const [isAuthor, setIsAuthor] = useState(false);
    const [user, setUser] = useState<{ id: string } | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [userVotes, setUserVotes] = useState<Map<string, VoteType>>(new Map());
    const [postVote, setPostVote] = useState<VoteType | null>(null);
    const [commentContent, setCommentContent] = useState('');
    const [replyTo, setReplyTo] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [reportTarget, setReportTarget] = useState<{ type: 'post' | 'comment'; id: string } | null>(null);

    // 加载用户信息
    useEffect(() => {
        const checkAuth = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
            if (user) {
                const { data } = await supabase.from('users').select('is_admin').eq('id', user.id).single();
                setIsAdmin(data?.is_admin || false);
            }
        };
        checkAuth();
    }, []);

    // 加载帖子
    const loadPost = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/community/posts/${postId}`);
            if (response.ok) {
                const data = await response.json();
                setPost(data.post);
                setComments(data.comments);
                setIsAuthor(data.isAuthor);
            } else {
                router.push('/community');
            }
        } finally {
            setLoading(false);
        }
    }, [postId, router]);

    // 加载投票状态
    const loadVotes = useCallback(async () => {
        if (!user) return;

        // 加载帖子投票
        const postVoteRes = await fetch(`/api/community/votes?targetType=post&targetId=${postId}`);
        if (postVoteRes.ok) {
            const data = await postVoteRes.json();
            setPostVote(data.vote);
        }
    }, [user, postId]);

    useEffect(() => {
        loadPost();
    }, [loadPost]);

    useEffect(() => {
        loadVotes();
    }, [loadVotes]);

    // 投票
    const handleVote = async (targetType: 'post' | 'comment', targetId: string, voteType: VoteType) => {
        if (!user) {
            alert('请先登录');
            return;
        }

        const response = await fetch('/api/community/votes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetType, targetId, voteType }),
        });

        if (response.ok) {
            const data = await response.json();
            if (targetType === 'post') {
                setPostVote(data.vote);
                loadPost(); // 刷新帖子数据
            } else {
                setUserVotes(prev => {
                    const newMap = new Map(prev);
                    if (data.vote) {
                        newMap.set(targetId, data.vote);
                    } else {
                        newMap.delete(targetId);
                    }
                    return newMap;
                });
                loadPost();
            }
        }
    };

    // 发表评论
    const handleComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!commentContent.trim() || !user) return;

        setSubmitting(true);
        try {
            const response = await fetch('/api/community/comments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    post_id: postId,
                    content: commentContent,
                    parent_id: replyTo,
                }),
            });

            if (response.ok) {
                setCommentContent('');
                setReplyTo(null);
                loadPost();
            }
        } finally {
            setSubmitting(false);
        }
    };

    // 删除评论
    const handleDeleteComment = async (commentId: string) => {
        if (!confirm('确定要删除这条评论吗？')) return;
        await fetch(`/api/community/comments/${commentId}`, { method: 'DELETE' });
        loadPost();
    };

    // 删除帖子
    const handleDeletePost = async () => {
        if (!confirm('确定要删除这个帖子吗？')) return;
        await fetch(`/api/community/posts/${postId}`, { method: 'DELETE' });
        router.push('/community');
    };

    // 管理员操作
    const handleAdminAction = async (action: 'pin' | 'feature' | 'delete', value?: boolean) => {
        await fetch(`/api/community/posts/${postId}/admin`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, value }),
        });
        loadPost();
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-accent"></div>
            </div>
        );
    }

    if (!post) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <p className="text-foreground-secondary">帖子不存在</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground">
            <div className="max-w-3xl mx-auto p-4 md:p-6">
                {/* 返回按钮 */}
                <button
                    onClick={() => router.push('/community')}
                    className="flex items-center gap-2 text-foreground-secondary hover:text-foreground mb-6 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    返回社区
                </button>

                {/* 帖子内容 */}
                <article className="bg-background-secondary rounded-lg p-6 border border-border">
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                        {post.is_pinned && (
                            <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded flex items-center gap-1">
                                <Pin className="w-3 h-3" /> 置顶
                            </span>
                        )}
                        {post.is_featured && (
                            <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded flex items-center gap-1">
                                <Star className="w-3 h-3" /> 精华
                            </span>
                        )}
                    </div>

                    <h1 className="text-2xl font-bold mb-2">{post.title}</h1>

                    <div className="flex items-center gap-3 text-sm text-foreground-secondary mb-4">
                        <span>{post.anonymous_name}</span>
                        <span>·</span>
                        <span>{new Date(post.created_at).toLocaleString()}</span>
                        <span>·</span>
                        <span>{post.view_count} 浏览</span>
                    </div>

                    <div className="prose prose-invert max-w-none">
                        <p className="whitespace-pre-wrap text-foreground-secondary">{post.content}</p>
                    </div>

                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
                        <VoteButtons
                            targetType="post"
                            targetId={post.id}
                            upvotes={post.upvote_count}
                            downvotes={post.downvote_count}
                            userVote={postVote}
                            onVote={(type) => handleVote('post', post.id, type)}
                        />

                        <div className="flex items-center gap-2">
                            {user && (
                                <button
                                    onClick={() => setReportTarget({ type: 'post', id: post.id })}
                                    className="p-2 text-foreground-secondary hover:text-foreground"
                                    title="举报"
                                >
                                    <Flag className="w-4 h-4" />
                                </button>
                            )}
                            {isAuthor && (
                                <>
                                    <button
                                        onClick={() => router.push(`/community/${post.id}/edit`)}
                                        className="p-2 text-foreground-secondary hover:text-accent"
                                        title="编辑"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={handleDeletePost}
                                        className="p-2 text-foreground-secondary hover:text-red-400"
                                        title="删除"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </>
                            )}
                            {isAdmin && (
                                <>
                                    <button
                                        onClick={() => handleAdminAction('pin', !post.is_pinned)}
                                        className={`p-2 ${post.is_pinned ? 'text-yellow-400' : 'text-foreground-secondary hover:text-yellow-400'}`}
                                        title={post.is_pinned ? '取消置顶' : '置顶'}
                                    >
                                        <Pin className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleAdminAction('feature', !post.is_featured)}
                                        className={`p-2 ${post.is_featured ? 'text-purple-400' : 'text-foreground-secondary hover:text-purple-400'}`}
                                        title={post.is_featured ? '取消精华' : '设为精华'}
                                    >
                                        <Star className="w-4 h-4" />
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </article>

                {/* 评论区 */}
                <div className="mt-6">
                    <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
                        <MessageCircle className="w-5 h-5" />
                        评论 ({post.comment_count})
                    </h2>

                    {/* 评论输入框 */}
                    {user ? (
                        <form onSubmit={handleComment} className="mb-6">
                            {replyTo && (
                                <div className="text-sm text-foreground-secondary mb-2 flex items-center gap-2">
                                    回复评论
                                    <button
                                        type="button"
                                        onClick={() => setReplyTo(null)}
                                        className="text-red-400 hover:text-red-300"
                                    >
                                        取消
                                    </button>
                                </div>
                            )}
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={commentContent}
                                    onChange={(e) => setCommentContent(e.target.value)}
                                    placeholder="发表你的评论..."
                                    className="flex-1 bg-background-secondary border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-accent"
                                />
                                <button
                                    type="submit"
                                    disabled={submitting || !commentContent.trim()}
                                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                                >
                                    <Send className="w-4 h-4" />
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="text-foreground-secondary text-center py-4 mb-6 bg-background-secondary rounded-lg border border-border">
                            请登录后发表评论
                        </div>
                    )}

                    {/* 评论列表 */}
                    {comments.length === 0 ? (
                        <div className="text-foreground-secondary text-center py-8">
                            暂无评论，来发表第一条评论吧
                        </div>
                    ) : (
                        <div className="bg-background-secondary rounded-lg border border-border">
                            <div className="p-4">
                                {comments.map(comment => (
                                    <CommentItem
                                        key={comment.id}
                                        comment={comment}
                                        postId={postId}
                                        userId={user?.id || null}
                                        isAdmin={isAdmin}
                                        userVotes={userVotes}
                                        onVote={(commentId, voteType) => handleVote('comment', commentId, voteType)}
                                        onReply={setReplyTo}
                                        onDelete={handleDeleteComment}
                                        onReport={(id) => setReportTarget({ type: 'comment', id })}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* 举报模态框 */}
                {reportTarget && (
                    <ReportModal
                        targetType={reportTarget.type}
                        targetId={reportTarget.id}
                        onClose={() => setReportTarget(null)}
                    />
                )}
            </div>
        </div>
    );
}
