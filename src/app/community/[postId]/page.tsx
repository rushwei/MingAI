/**
 * 帖子详情页面
 *
 * 'use client' 标记说明：
 * - 使用 React hooks (useState, useEffect, useCallback)
 * - 使用 useRouter, useParams 进行客户端导航
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { CommunityPost, CommunityComment, VoteType } from '@/lib/community';
import { getCurrentUserProfileBundle, supabase } from '@/lib/auth';
import { useToast } from '@/components/ui/Toast';
import { SoundWaveLoader } from '@/components/ui/SoundWaveLoader';
import { PostNavBar, ReportModal, EditPostModal } from '@/components/community/PostActions';
import { PostDetail } from '@/components/community/PostDetail';
import { CommentSection } from '@/components/community/CommentSection';

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

export default function PostDetailPage() {
    const router = useRouter();
    const params = useParams();
    const postId = params.postId as string;
    const { showToast } = useToast();

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
    const [showEditModal, setShowEditModal] = useState(false);

    // 加载用户信息
    useEffect(() => {
        const checkAuth = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
            if (user) {
                const bundle = await getCurrentUserProfileBundle();
                setIsAdmin(bundle?.profile?.is_admin || false);
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

        try {
            const postVoteRes = await fetchWithRetry(`/api/community/votes?targetType=post&targetId=${postId}`);
            if (postVoteRes.ok) {
                const data = await postVoteRes.json();
                setPostVote(data.vote);
            }
        } catch { /* ignore network errors */ }

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
            showToast('warning', '请先登录');
            return;
        }

        const currentVote = targetType === 'post' ? postVote : userVotes.get(targetId) || null;

        const calculateVoteChange = (current: VoteType | null, newVote: VoteType) => {
            let upChange = 0;
            let downChange = 0;

            if (current === newVote) {
                if (newVote === 'up') upChange = -1;
                else downChange = -1;
                return { upChange, downChange, resultVote: null };
            } else if (current === null) {
                if (newVote === 'up') upChange = 1;
                else downChange = 1;
                return { upChange, downChange, resultVote: newVote };
            } else {
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
            setUserVotes(prev => {
                const newMap = new Map(prev);
                if (resultVote) {
                    newMap.set(targetId, resultVote);
                } else {
                    newMap.delete(targetId);
                }
                return newMap;
            });
            setComments(prev => updateCommentVotes(prev, targetId, upChange, downChange));
        }

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
            // 回滚
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

    const updateCommentVotes = (
        commentList: CommunityComment[],
        targetId: string,
        upChange: number,
        downChange: number
    ): CommunityComment[] => {
        return commentList.map(comment => {
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
                const newComment = await response.json();
                setCommentContent('');

                if (replyTo) {
                    setComments(prev => addReplyToComment(prev, replyTo, newComment));
                } else {
                    setComments(prev => [...prev, { ...newComment, replies: [] }]);
                }

                setPost(prev => prev ? { ...prev, comment_count: prev.comment_count + 1 } : null);
                setReplyTo(null);
            } else {
                const data = await response.json().catch(() => null) as { error?: string } | null;
                throw new Error(data?.error || '发表评论失败');
            }
        } catch (err) {
            showToast('error', err instanceof Error ? err.message : '发表评论失败，请重试');
        } finally {
            setSubmitting(false);
        }
    };

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

    const handleDeleteComment = async (commentId: string) => {
        if (!confirm('确定要删除这条评论吗？')) return;

        const response = await fetch(`/api/community/comments/${commentId}`, { method: 'DELETE' });
        if (response.ok) {
            setComments(prev => removeCommentFromList(prev, commentId));
            setPost(prev => prev ? { ...prev, comment_count: Math.max(0, prev.comment_count - 1) } : null);
        }
    };

    const removeCommentFromList = (commentList: CommunityComment[], commentId: string): CommunityComment[] => {
        return commentList.filter(comment => {
            if (comment.id === commentId) return false;
            if (comment.replies && comment.replies.length > 0) {
                comment.replies = removeCommentFromList(comment.replies, commentId);
            }
            return true;
        });
    };

    const handleDeletePost = async () => {
        if (!confirm('确定要删除这个帖子吗？')) return;
        await fetch(`/api/community/posts/${postId}`, { method: 'DELETE' });
        router.push('/community');
    };

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
                <SoundWaveLoader variant="block" />
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
        <div className="min-h-screen bg-background text-foreground">
            <PostNavBar
                isAuthor={isAuthor}
                isAdmin={isAdmin}
                post={post}
                onBack={() => router.push('/community')}
                onEdit={() => setShowEditModal(true)}
                onDelete={handleDeletePost}
                onAdminAction={handleAdminAction}
            />

            <main className="max-w-3xl mx-auto px-4 py-8">
                <PostDetail
                    post={post}
                    postVote={postVote}
                    onVote={(type) => handleVote('post', post.id, type)}
                    onReport={() => setReportTarget({ type: 'post', id: post.id })}
                />

                <CommentSection
                    postId={postId}
                    comments={comments}
                    userId={user?.id || null}
                    isAdmin={isAdmin}
                    userVotes={userVotes}
                    replyTo={replyTo}
                    commentContent={commentContent}
                    submitting={submitting}
                    onCommentContentChange={setCommentContent}
                    onReplyToChange={setReplyTo}
                    onSubmitComment={handleComment}
                    onVote={(id, type) => handleVote('comment', id, type)}
                    onDeleteComment={handleDeleteComment}
                    onReportComment={(id) => setReportTarget({ type: 'comment', id })}
                />
            </main>

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
