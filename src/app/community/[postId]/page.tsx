'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
    ArrowLeft,
    ThumbsUp,
    ThumbsDown,
    MessageCircle,
    MessageSquare,
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

// 客户端 fetch 重试工具
async function fetchWithRetry(
    url: string,
    options?: RequestInit,
    retries = 3,
    delay = 500
): Promise<Response> {
    let lastError: unknown;
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, options);
            return response;
        } catch (err) {
            lastError = err;
            if (i < retries - 1) {
                await new Promise(r => setTimeout(r, delay * (i + 1)));
            }
        }
    }
    throw lastError;
}

// =====================================================
// 投票按钮组件
// =====================================================
function VoteButtons({
    upvotes,
    downvotes,
    userVote,
    onVote
}: {
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
// 编辑帖子弹窗
// =====================================================
function EditPostModal({
    post,
    onClose,
    onSave
}: {
    post: CommunityPost;
    onClose: () => void;
    onSave: (updatedPost: CommunityPost) => void;
}) {
    const [title, setTitle] = useState(post.title);
    const [content, setContent] = useState(post.content);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !content.trim()) return;

        setLoading(true);
        try {
            const response = await fetch(`/api/community/posts/${post.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, content }),
            });

            if (response.ok) {
                const updatedPost = await response.json();
                onSave({ ...post, ...updatedPost, title, content });
                onClose();
            } else {
                alert('更新失败，请重试');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-background/95 backdrop-blur-xl rounded-2xl w-full max-w-2xl border border-white/10 max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="p-5 border-b border-border/50 flex-shrink-0 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500 shadow-inner">
                        <Edit2 className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-foreground">编辑讨论</h2>
                        <p className="text-xs text-foreground-secondary">完善你的观点，让讨论更精彩</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
                    <div>
                        <label className="block text-sm font-medium text-foreground-secondary mb-1.5 ml-1">标题</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full bg-background-secondary/50 border border-border/50 hover:border-purple-500/50 rounded-xl px-4 py-3 text-foreground font-medium focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 transition-all"
                            placeholder="请输入精炼的标题"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-foreground-secondary mb-1.5 ml-1">内容</label>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            rows={10}
                            className="w-full bg-background-secondary/50 border border-border/50 hover:border-purple-500/50 rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 transition-all resize-none leading-relaxed"
                            placeholder="请输入详细内容"
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 rounded-xl border border-border hover:bg-background-secondary/80 text-foreground-secondary hover:text-foreground transition-all"
                        >
                            取消
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !title.trim() || !content.trim()}
                            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium rounded-xl shadow-lg shadow-purple-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100"
                        >
                            {loading ? '保存中...' : '保存修改'}
                        </button>
                    </div>
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
    comment: CommunityComment & { isAuthor?: boolean; isPostAuthor?: boolean };
    postId: string;
    userId: string | null;
    isAdmin: boolean;
    userVotes: Map<string, VoteType>;
    onVote: (commentId: string, voteType: VoteType) => void;
    onReply: (parentId: string) => void;
    onDelete: (commentId: string) => void;
    onReport: (commentId: string) => void;
}) {
    const isAuthor = comment.isAuthor === true;
    const [showMenu, setShowMenu] = useState(false);

    return (
        <div className="group/comment relative">
            <div className="flex gap-3">
                <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium shadow-sm z-10 ${isAuthor ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-background-tertiary text-foreground-secondary'}`}>
                        {comment.anonymous_name?.charAt(0) || '匿'}
                    </div>
                    {comment.replies && comment.replies.length > 0 && (
                        <div className="w-px h-full bg-border/50 my-1" />
                    )}
                </div>

                <div className="flex-1 min-w-0 pb-6">
                    <div className="bg-background-secondary/30 rounded-xl p-4 border border-border/50 hover:border-border transition-colors">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <span className={`text-sm font-medium ${comment.isPostAuthor ? 'text-purple-600 dark:text-purple-400' : 'text-foreground'}`}>
                                    {comment.anonymous_name}
                                </span>
                                {comment.isPostAuthor && (
                                    <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full">
                                        楼主
                                    </span>
                                )}
                                <span className="text-xs text-foreground-secondary/70">
                                    {new Date(comment.created_at).toLocaleString()}
                                </span>
                            </div>
                            <div className="relative">
                                <button
                                    onClick={() => setShowMenu(!showMenu)}
                                    className="opacity-0 group-hover/comment:opacity-100 p-1 text-foreground-secondary hover:text-foreground transition-all"
                                >
                                    <MoreVertical className="w-4 h-4" />
                                </button>
                                {showMenu && (
                                    <div className="absolute right-0 top-full mt-1 bg-background rounded-xl shadow-lg border border-border py-1 z-20 min-w-[120px] animate-in fade-in zoom-in-95 duration-200">
                                        {userId && (
                                            <button
                                                onClick={() => { onReport(comment.id); setShowMenu(false); }}
                                                className="w-full px-4 py-2 text-left text-sm text-foreground-secondary hover:bg-background-secondary hover:text-foreground flex items-center gap-2 transition-colors"
                                            >
                                                <Flag className="w-4 h-4" /> 举报
                                            </button>
                                        )}
                                        {(isAuthor || isAdmin) && (
                                            <button
                                                onClick={() => { onDelete(comment.id); setShowMenu(false); }}
                                                className="w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 flex items-center gap-2 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" /> 删除
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <p className="text-foreground/90 text-sm leading-relaxed whitespace-pre-wrap mb-3">
                            {comment.content}
                        </p>

                        <div className="flex items-center gap-4">
                            <VoteButtons
                                upvotes={comment.upvote_count}
                                downvotes={comment.downvote_count}
                                userVote={userVotes.get(comment.id) || null}
                                onVote={(type) => onVote(comment.id, type)}
                            />
                            {userId && (
                                <button
                                    onClick={() => onReply(comment.id)}
                                    className="text-foreground-secondary hover:text-purple-500 text-xs flex items-center gap-1 transition-colors"
                                >
                                    <MessageCircle className="w-3.5 h-3.5" />
                                    回复
                                </button>
                            )}
                        </div>
                    </div>

                    {/* 子回复 */}
                    {comment.replies && comment.replies.length > 0 && (
                        <div className="mt-4 pl-2">
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
    const [anonymousName, setAnonymousName] = useState('匿名用户');
    const [replyTo, setReplyTo] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [reportTarget, setReportTarget] = useState<{ type: 'post' | 'comment'; id: string } | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);

    // 加载用户信息
    useEffect(() => {
        const checkAuth = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
            if (user) {
                const { data } = await supabase.from('users').select('is_admin').eq('id', user.id).single();
                setIsAdmin(data?.is_admin || false);
                const { data: settings } = await supabase
                    .from('user_settings')
                    .select('community_anonymous_name')
                    .eq('user_id', user.id)
                    .maybeSingle();
                const savedName = typeof settings?.community_anonymous_name === 'string'
                    ? settings.community_anonymous_name.trim()
                    : '';
                if (savedName) {
                    setAnonymousName(savedName);
                }
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
        try {
            const postVoteRes = await fetchWithRetry(`/api/community/votes?targetType=post&targetId=${postId}`);
            if (postVoteRes.ok) {
                const data = await postVoteRes.json();
                setPostVote(data.vote);
            }
        } catch { /* ignore network errors */ }

        // 加载所有评论的投票状态
        const loadCommentVotes = async (commentList: CommunityComment[]) => {
            const newVotes = new Map<string, VoteType>();
            const processComments = async (list: CommunityComment[]) => {
                for (const comment of list) {
                    try {
                        const res = await fetchWithRetry(`/api/community/votes?targetType=comment&targetId=${comment.id}`);
                        if (res.ok) {
                            const data = await res.json();
                            if (data.vote) {
                                newVotes.set(comment.id, data.vote);
                            }
                        }
                    } catch { /* ignore */ }
                    if (comment.replies?.length) {
                        await processComments(comment.replies);
                    }
                }
            };
            await processComments(commentList);
            return newVotes;
        };

        if (comments.length > 0) {
            const commentVotes = await loadCommentVotes(comments);
            setUserVotes(commentVotes);
        }
    }, [user, postId, comments]);

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

        // 获取当前投票状态（用于乐观更新）
        const currentVote = targetType === 'post' ? postVote : userVotes.get(targetId) || null;

        // 计算投票变化
        const calculateVoteChange = (current: VoteType | null, newVote: VoteType) => {
            let upChange = 0;
            let downChange = 0;

            if (current === newVote) {
                // 取消投票
                if (newVote === 'up') upChange = -1;
                else downChange = -1;
                return { upChange, downChange, resultVote: null };
            } else if (current === null) {
                // 新增投票
                if (newVote === 'up') upChange = 1;
                else downChange = 1;
                return { upChange, downChange, resultVote: newVote };
            } else {
                // 切换投票
                if (newVote === 'up') {
                    upChange = 1;
                    downChange = -1;
                } else {
                    upChange = -1;
                    downChange = 1;
                }
                return { upChange, downChange, resultVote: newVote };
            }
        };

        const { upChange, downChange, resultVote } = calculateVoteChange(currentVote, voteType);

        // 乐观更新 UI
        if (targetType === 'post' && post) {
            setPostVote(resultVote);
            setPost(prev => prev ? {
                ...prev,
                upvote_count: prev.upvote_count + upChange,
                downvote_count: prev.downvote_count + downChange,
            } : null);
        } else {
            // 更新评论投票状态
            setUserVotes(prev => {
                const newMap = new Map(prev);
                if (resultVote) {
                    newMap.set(targetId, resultVote);
                } else {
                    newMap.delete(targetId);
                }
                return newMap;
            });
            // 更新评论的投票计数
            setComments(prev => updateCommentVotes(prev, targetId, upChange, downChange));
        }

        // 发送请求到服务器
        try {
            const response = await fetch('/api/community/votes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetType, targetId, voteType }),
            });

            if (!response.ok) {
                throw new Error('Vote failed');
            }
        } catch {
            // 请求失败，回滚状态
            if (targetType === 'post' && post) {
                setPostVote(currentVote);
                setPost(prev => prev ? {
                    ...prev,
                    upvote_count: prev.upvote_count - upChange,
                    downvote_count: prev.downvote_count - downChange,
                } : null);
            } else {
                setUserVotes(prev => {
                    const newMap = new Map(prev);
                    if (currentVote) {
                        newMap.set(targetId, currentVote);
                    } else {
                        newMap.delete(targetId);
                    }
                    return newMap;
                });
                setComments(prev => updateCommentVotes(prev, targetId, -upChange, -downChange));
            }
        }
    };

    // 辅助函数：递归更新评论的投票计数
    const updateCommentVotes = (
        comments: CommunityComment[],
        targetId: string,
        upChange: number,
        downChange: number
    ): CommunityComment[] => {
        return comments.map(comment => {
            if (comment.id === targetId) {
                return {
                    ...comment,
                    upvote_count: comment.upvote_count + upChange,
                    downvote_count: comment.downvote_count + downChange,
                };
            }
            if (comment.replies && comment.replies.length > 0) {
                return {
                    ...comment,
                    replies: updateCommentVotes(comment.replies, targetId, upChange, downChange),
                };
            }
            return comment;
        });
    };

    // 发表评论
    const handleComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!commentContent.trim() || !user) return;

        setSubmitting(true);
        try {
            await supabase
                .from('user_settings')
                .upsert({
                    user_id: user.id,
                    community_anonymous_name: anonymousName.trim() || '匿名用户',
                }, { onConflict: 'user_id' });
            const { data: { session } } = await supabase.auth.getSession();
            const accessToken = session?.access_token;
            const response = await fetch('/api/community/comments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
                },
                body: JSON.stringify({
                    post_id: postId,
                    content: commentContent,
                    parent_id: replyTo,
                }),
            });

            if (response.ok) {
                const newComment = await response.json();
                setCommentContent('');

                if (replyTo) {
                    // 添加到父评论的 replies 中
                    setComments(prev => addReplyToComment(prev, replyTo, newComment));
                } else {
                    // 添加到顶层评论
                    setComments(prev => [...prev, { ...newComment, replies: [] }]);
                }

                // 更新帖子评论数
                setPost(prev => prev ? { ...prev, comment_count: prev.comment_count + 1 } : null);
                setReplyTo(null);
            }
        } finally {
            setSubmitting(false);
        }
    };

    // 辅助函数：添加回复到评论树
    const addReplyToComment = (
        commentList: CommunityComment[],
        parentId: string,
        newReply: CommunityComment
    ): CommunityComment[] => {
        return commentList.map(comment => {
            if (comment.id === parentId) {
                return {
                    ...comment,
                    replies: [...(comment.replies || []), { ...newReply, replies: [] }],
                };
            }
            if (comment.replies && comment.replies.length > 0) {
                return {
                    ...comment,
                    replies: addReplyToComment(comment.replies, parentId, newReply),
                };
            }
            return comment;
        });
    };

    // 删除评论
    const handleDeleteComment = async (commentId: string) => {
        if (!confirm('确定要删除这条评论吗？')) return;

        const response = await fetch(`/api/community/comments/${commentId}`, { method: 'DELETE' });
        if (response.ok) {
            // 本地删除评论
            setComments(prev => removeCommentFromList(prev, commentId));
            setPost(prev => prev ? { ...prev, comment_count: Math.max(0, prev.comment_count - 1) } : null);
        }
    };

    // 辅助函数：从评论列表中删除评论
    const removeCommentFromList = (commentList: CommunityComment[], commentId: string): CommunityComment[] => {
        return commentList.filter(comment => {
            if (comment.id === commentId) return false;
            if (comment.replies && comment.replies.length > 0) {
                comment.replies = removeCommentFromList(comment.replies, commentId);
            }
            return true;
        });
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
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
            </div>
        );
    }

    if (!post) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <p className="text-foreground-secondary mb-4">帖子不存在或已被删除</p>
                    <button
                        onClick={() => router.push('/community')}
                        className="px-4 py-2 bg-background-secondary rounded-lg hover:bg-background-tertiary transition-colors"
                    >
                        返回社区
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground pb-20">
            {/* 顶部导航 */}
            <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border/50">
                <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
                    <button
                        onClick={() => router.push('/community')}
                        className="flex items-center gap-2 text-foreground-secondary hover:text-foreground transition-colors p-2 -ml-2 rounded-lg hover:bg-background-secondary/50"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        <span className="font-medium">返回</span>
                    </button>

                    {(isAuthor || isAdmin) && (
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setShowEditModal(true)}
                                className="p-2 text-foreground-secondary hover:text-purple-500 hover:bg-purple-500/10 rounded-lg transition-colors"
                                title="编辑"
                            >
                                <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                                onClick={handleDeletePost}
                                className="p-2 text-foreground-secondary hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                title="删除"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                    {isAdmin && (
                        <div className="flex items-center gap-1 ml-1 border-l border-border pl-1">
                            <button
                                onClick={() => handleAdminAction('pin', !post?.is_pinned)}
                                className={`p-2 rounded-lg transition-colors ${post?.is_pinned ? 'text-yellow-500 bg-yellow-500/10' : 'text-foreground-secondary hover:text-yellow-500 hover:bg-yellow-500/10'}`}
                                title={post?.is_pinned ? '取消置顶' : '置顶'}
                            >
                                <Pin className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => handleAdminAction('feature', !post?.is_featured)}
                                className={`p-2 rounded-lg transition-colors ${post?.is_featured ? 'text-purple-500 bg-purple-500/10' : 'text-foreground-secondary hover:text-purple-500 hover:bg-purple-500/10'}`}
                                title={post?.is_featured ? '取消精华' : '设为精华'}
                            >
                                <Star className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                </div>
            </div>

            <main className="max-w-3xl mx-auto px-4 py-8">
                {/* 帖子文章 */}
                <article className="mb-12 animate-fade-in-up">
                    <header className="mb-8">
                        <div className="flex items-center gap-3 mb-4">
                            {post.is_pinned && (
                                <span className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 px-2.5 py-0.5 rounded-full text-xs font-medium border border-yellow-500/20 flex items-center gap-1">
                                    <Pin className="w-3 h-3" /> 置顶
                                </span>
                            )}
                            {post.is_featured && (
                                <span className="bg-purple-500/10 text-purple-600 dark:text-purple-400 px-2.5 py-0.5 rounded-full text-xs font-medium border border-purple-500/20 flex items-center gap-1">
                                    <Star className="w-3 h-3" /> 精华
                                </span>
                            )}
                            <span className="text-xs text-foreground-secondary bg-background-secondary px-2 py-0.5 rounded-full">
                                {new Date(post.created_at).toLocaleDateString()}
                            </span>
                        </div>

                        <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/80 mb-6 leading-tight">
                            {post.title}
                        </h1>

                        <div className="flex items-center justify-between border-b border-border/50 pb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white text-lg font-medium shadow-md">
                                    {post.anonymous_name?.charAt(0) || '匿'}
                                </div>
                                <div>
                                    <div className="font-medium text-foreground">{post.anonymous_name}</div>
                                    <div className="text-xs text-foreground-secondary">楼主</div>
                                </div>
                            </div>
                        </div>
                    </header>

                    <div className="prose prose-purple dark:prose-invert max-w-none text-foreground/90 leading-loose text-lg whitespace-pre-wrap">
                        {post.content}
                    </div>

                    <div className="flex items-center gap-6 mt-12 pt-6 border-t border-border/50">
                        <VoteButtons
                            upvotes={post.upvote_count}
                            downvotes={post.downvote_count}
                            userVote={postVote}
                            onVote={(type) => handleVote('post', post.id, type)}
                        />
                        <button
                            onClick={() => setReportTarget({ type: 'post', id: post.id })}
                            className="text-foreground-secondary hover:text-foreground text-sm flex items-center gap-1.5 transition-colors ml-auto"
                        >
                            <Flag className="w-4 h-4" /> 举报
                        </button>
                    </div>
                </article>

                {/* 评论区 */}
                <section>
                    <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-purple-500" />
                        全部评论 ({comments.length})
                    </h3>

                    {/* 评论输入框 */}
                    <div className="bg-background-secondary/30 rounded-2xl p-4 mb-8 border border-border/50">
                        {user ? (
                            <form onSubmit={handleComment}>
                                <div className="flex items-center gap-3 mb-3">
                                    <label className="text-xs text-foreground-secondary">匿名昵称</label>
                                    <input
                                        value={anonymousName}
                                        onChange={(e) => setAnonymousName(e.target.value)}
                                        className="flex-1 bg-background border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500/30"
                                        placeholder="设置通用匿名昵称"
                                        maxLength={20}
                                    />
                                </div>
                                {replyTo && (
                                    <div className="flex items-center justify-between bg-purple-500/10 px-3 py-2 rounded-lg mb-3 border border-purple-500/20">
                                        <span className="text-sm text-purple-600 dark:text-purple-400 font-medium">
                                            正在回复...
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setReplyTo(null)}
                                            className="text-purple-400 hover:text-purple-600"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </div>
                                )}
                                <div className="relative">
                                    <textarea
                                        value={commentContent}
                                        onChange={(e) => setCommentContent(e.target.value)}
                                        rows={3}
                                        className="w-full bg-background border border-border/50 rounded-xl p-4 text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500/30 transition-all resize-none shadow-sm"
                                        placeholder={replyTo ? "写下你的回复..." : "分享你的看法..."}
                                    />
                                    <button
                                        type="submit"
                                        disabled={submitting || !commentContent.trim()}
                                        className="absolute right-3 bottom-3 p-2 bg-purple-600 text-white rounded-lg shadow-md hover:bg-purple-700 disabled:opacity-50 disabled:shadow-none transition-all hover:scale-105 active:scale-95"
                                    >
                                        {submitting ? (
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <Send className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="text-center py-6 text-foreground-secondary bg-background/50 rounded-xl border border-dashed border-border">
                                <p>登录后参与讨论</p>
                            </div>
                        )}
                    </div>

                    {/* 评论列表 */}
                    <div className="space-y-6">
                        {comments.length === 0 ? (
                            <div className="text-center py-12 text-foreground-secondary/60">
                                <p>暂无评论，来坐沙发吧~</p>
                            </div>
                        ) : (
                            comments.map(comment => (
                                <CommentItem
                                    key={comment.id}
                                    comment={comment}
                                    postId={postId}
                                    userId={user?.id || null}
                                    isAdmin={isAdmin}
                                    userVotes={userVotes}
                                    onVote={(id, type) => handleVote('comment', id, type)}
                                    onReply={(id) => setReplyTo(id)}
                                    onDelete={handleDeleteComment}
                                    onReport={(id) => setReportTarget({ type: 'comment', id })}
                                />
                            ))
                        )}
                    </div>
                </section>
            </main>

            {/* 模态框 */}
            {reportTarget && (
                <ReportModal
                    targetType={reportTarget.type}
                    targetId={reportTarget.id}
                    onClose={() => setReportTarget(null)}
                />
            )}
            {showEditModal && post && (
                <EditPostModal
                    post={post}
                    onClose={() => setShowEditModal(false)}
                    onSave={(updatedPost) => setPost(updatedPost)}
                />
            )}
        </div>
    );
}
