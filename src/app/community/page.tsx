'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    Plus,
    Search,
    MessageCircle,
    ThumbsUp,
    ThumbsDown,
    Eye,
    Pin,
    Star,
    Filter,
    AlertCircle,
    Aperture
} from 'lucide-react';
import { CommunityPost, PostCategory, POST_CATEGORIES } from '@/lib/community';
import { supabase } from '@/lib/supabase';

// =====================================================
// 匿名提示组件
// =====================================================
function AnonymityNotice() {
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        const dismissed = localStorage.getItem('community-anonymity-dismissed');
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (dismissed) setDismissed(true);
    }, []);

    const handleDismiss = () => {
        localStorage.setItem('community-anonymity-dismissed', 'true');
        setDismissed(true);
    };

    if (dismissed) return null;

    return (
        <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                    <h3 className="font-medium text-purple-300">匿名社区</h3>
                    <p className="text-sm text-foreground-secondary mt-1">
                        本社区采用完全匿名机制。你的发言不会显示真实身份，可以自由讨论命理相关话题。
                        请遵守社区规范，文明交流。
                    </p>
                </div>
                <button
                    onClick={handleDismiss}
                    className="text-foreground-secondary hover:text-foreground text-sm"
                >
                    知道了
                </button>
            </div>
        </div>
    );
}

// =====================================================
// 帖子卡片组件
// =====================================================
function PostCard({ post }: { post: CommunityPost }) {
    const categoryInfo = POST_CATEGORIES.find(c => c.value === post.category);

    return (
        <Link href={`/community/${post.id}`}>
            <div className="bg-background-secondary rounded-lg p-4 border border-border hover:border-accent/30 transition-colors cursor-pointer">
                <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
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
                            <span className="text-xs text-foreground-secondary">{categoryInfo?.icon} {categoryInfo?.label}</span>
                        </div>
                        <h3 className="font-medium text-foreground">{post.title}</h3>
                        <p className="text-sm text-foreground-secondary mt-1 line-clamp-2">{post.content}</p>
                        <div className="flex items-center gap-4 mt-3 text-xs text-foreground-secondary">
                            <span className="flex items-center gap-1">
                                <Eye className="w-3 h-3" />
                                {post.view_count}
                            </span>
                            <span className="flex items-center gap-1">
                                <ThumbsUp className="w-3 h-3" />
                                {post.upvote_count}
                            </span>
                            <span className="flex items-center gap-1">
                                <ThumbsDown className="w-3 h-3" />
                                {post.downvote_count}
                            </span>
                            <span className="flex items-center gap-1">
                                <MessageCircle className="w-3 h-3" />
                                {post.comment_count}
                            </span>
                            <span className="text-foreground-tertiary">
                                {post.anonymous_name} · {new Date(post.created_at).toLocaleDateString()}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
}

// =====================================================
// 主页面组件
// =====================================================
export default function CommunityPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [posts, setPosts] = useState<CommunityPost[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState<PostCategory | ''>('');
    const [sortBy, setSortBy] = useState<'latest' | 'popular' | 'hot'>('latest');
    const [user, setUser] = useState<{ id: string } | null>(null);

    const pageSize = 20;

    // 检查登录状态
    useEffect(() => {
        const checkAuth = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
        };
        checkAuth();
    }, []);

    // 加载帖子
    const loadPosts = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: String(page),
                pageSize: String(pageSize),
                sortBy,
            });
            if (search) params.set('search', search);
            if (category) params.set('category', category);

            const response = await fetch(`/api/community/posts?${params}`);
            if (response.ok) {
                const data = await response.json();
                setPosts(data.posts);
                setTotal(data.total);
            }
        } finally {
            setLoading(false);
        }
    }, [page, search, category, sortBy]);

    useEffect(() => {
        loadPosts();
    }, [loadPosts]);

    const totalPages = Math.ceil(total / pageSize);

    return (
        <div className="min-h-screen bg-background text-foreground">
            <div className="max-w-4xl mx-auto p-4 md:p-6">
                {/* 标题 */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <Aperture className="w-8 h-8 text-purple-400" />
                        <div>
                            <h1 className="text-2xl font-bold">命理社区</h1>
                            <p className="text-sm text-foreground-secondary">匿名交流命理心得</p>
                        </div>
                    </div>
                    {user && (
                        <button
                            onClick={() => router.push('/community/new')}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            发帖
                        </button>
                    )}
                </div>

                {/* 匿名提示 */}
                <AnonymityNotice />

                {/* 搜索和筛选 */}
                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-secondary" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            placeholder="搜索帖子..."
                            className="w-full bg-background-secondary border border-border rounded-lg pl-10 pr-4 py-2 text-foreground focus:outline-none focus:border-accent"
                        />
                    </div>
                    <div className="flex gap-2">
                        <div className="relative">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-secondary" />
                            <select
                                value={category}
                                onChange={(e) => { setCategory(e.target.value as PostCategory | ''); setPage(1); }}
                                className="bg-background-secondary border border-border rounded-lg pl-10 pr-8 py-2 text-foreground focus:outline-none focus:border-accent appearance-none"
                            >
                                <option value="">全部分类</option>
                                {POST_CATEGORIES.map(cat => (
                                    <option key={cat.value} value={cat.value}>
                                        {cat.icon} {cat.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <select
                            value={sortBy}
                            onChange={(e) => { setSortBy(e.target.value as 'latest' | 'popular' | 'hot'); setPage(1); }}
                            className="bg-background-secondary border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-accent"
                        >
                            <option value="latest">最新</option>
                            <option value="popular">最热</option>
                            <option value="hot">热议</option>
                        </select>
                    </div>
                </div>

                {/* 帖子列表 */}
                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-accent"></div>
                    </div>
                ) : posts.length === 0 ? (
                    <div className="text-center py-12 text-foreground-secondary">
                        <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>暂无帖子</p>
                        {user && (
                            <button
                                onClick={() => router.push('/community/new')}
                                className="mt-4 text-purple-400 hover:text-purple-300"
                            >
                                发表第一个帖子
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="space-y-3">
                            {posts.map(post => (
                                <PostCard key={post.id} post={post} />
                            ))}
                        </div>

                        {/* 分页 */}
                        {totalPages > 1 && (
                            <div className="flex justify-center gap-2 mt-6">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="px-3 py-1 bg-background-secondary border border-border rounded disabled:opacity-50"
                                >
                                    上一页
                                </button>
                                <span className="px-3 py-1 text-foreground-secondary">
                                    {page} / {totalPages}
                                </span>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="px-3 py-1 bg-background-secondary border border-border rounded disabled:opacity-50"
                                >
                                    下一页
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
