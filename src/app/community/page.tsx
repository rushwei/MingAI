/**
 * 社区列表页面
 *
 * 'use client' 标记说明：
 * - 使用 React hooks (useState, useEffect, useCallback)
 * - 使用 useRouter 进行客户端导航
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    Plus,
    Search,
    MessageCircle,
    Eye,
    Pin,
    Star,
    Filter,
    Aperture,
    Sparkles,
    Clock,
    MessageSquare,
    Heart,
    type LucideIcon,
    type LucideProps
} from 'lucide-react';
import { CommunityPost, PostCategory, POST_CATEGORIES } from '@/lib/community';
import { supabase } from '@/lib/supabase';
import { readLocalCache, writeLocalCache } from '@/lib/cache';
import { FeatureGate } from '@/components/layout/FeatureGate';

// =====================================================
// 匿名提示组件
// =====================================================
function AnonymityNotice() {
    const [dismissed, setDismissed] = useState(() => {
        if (typeof window === 'undefined') return false;
        const cached = readLocalCache<boolean>('mingai.pref.communityAnonymityDismissed', Number.POSITIVE_INFINITY);
        if (cached) return true;
        const legacy = localStorage.getItem('community-anonymity-dismissed');
        if (legacy) {
            writeLocalCache('mingai.pref.communityAnonymityDismissed', true);
            return true;
        }
        return false;
    });

    const handleDismiss = () => {
        writeLocalCache('mingai.pref.communityAnonymityDismissed', true);
        setDismissed(true);
    };

    if (dismissed) return null;

    return (
        <div className="relative overflow-hidden bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 mb-6 backdrop-blur-sm group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <div className="flex items-start gap-4 relative z-10">
                <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400 group-hover:scale-110 transition-transform duration-300">
                    <Sparkles className="w-5 h-5" />
                </div>
                <div className="flex-1">
                    <h3 className="font-bold text-foreground mb-1">开启你的匿名探索之旅</h3>
                    <p className="text-sm text-foreground-secondary/90 leading-relaxed">
                        在这里，所有互动均采用随机匿名代号。你可以放下顾虑，自由探讨命理玄学，分享真实感悟。请在这个温暖的社区里保持友善，共创和谐氛围。
                    </p>
                </div>
                <button
                    onClick={handleDismiss}
                    className="p-1.5 text-foreground-secondary hover:text-foreground hover:bg-background-secondary rounded-lg transition-all"
                    title="不再显示"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
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
            <div className="group bg-background-secondary/40 hover:bg-background-secondary/60 border border-border/50 hover:border-purple-500/30 rounded-xl p-5 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/5 backdrop-blur-sm relative overflow-hidden">
                {/* 装饰背景 */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                <div className="relative z-10">
                    <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                            {post.is_pinned && (
                                <span className="text-[10px] uppercase font-bold bg-yellow-500/10 text-yellow-500 px-2 py-1 rounded-md border border-yellow-500/20 flex items-center gap-1">
                                    <Pin className="w-3 h-3" /> 置顶
                                </span>
                            )}
                            {post.is_featured && (
                                <span className="text-[10px] uppercase font-bold bg-purple-500/10 text-purple-500 px-2 py-1 rounded-md border border-purple-500/20 flex items-center gap-1">
                                    <Star className="w-3 h-3" /> 精华
                                </span>
                            )}
                            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-background border border-border/50 text-xs text-foreground-secondary">
                                {categoryInfo?.icon && <span className="text-sm">{categoryInfo.icon}</span>}
                                <span>{categoryInfo?.label}</span>
                            </span>
                        </div>
                        <span className="text-xs text-foreground-secondary/70 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(post.created_at).toLocaleDateString()}
                        </span>
                    </div>

                    <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-purple-400 transition-colors line-clamp-1">
                        {post.title}
                    </h3>

                    <p className="text-sm text-foreground-secondary/80 mb-4 line-clamp-2 leading-relaxed">
                        {post.content}
                    </p>

                    <div className="flex items-center justify-between border-t border-border/40 pt-3 mt-auto">
                        <div className="flex items-center gap-2 text-xs font-medium text-foreground-secondary/70">
                            <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-purple-400 to-indigo-400 flex items-center justify-center text-[10px] text-white">
                                {post.anonymous_name ? post.anonymous_name.charAt(0) : '匿'}
                            </div>
                            <span>{post.anonymous_name}</span>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-foreground-secondary">
                            <span className="flex items-center gap-1.5 hover:text-purple-400 transition-colors">
                                <Eye className="w-3.5 h-3.5" />
                                {post.view_count}
                            </span>
                            <span className="flex items-center gap-1.5 hover:text-purple-400 transition-colors">
                                <PropsIconWrapper icon={Heart} className="w-3.5 h-3.5" />
                                {post.upvote_count}
                            </span>
                            <span className="flex items-center gap-1.5 hover:text-purple-400 transition-colors">
                                <MessageSquare className="w-3.5 h-3.5" />
                                {post.comment_count}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
}

// 辅助组件：用于处理 Lucide 图标 props 可能不匹配的问题 (仅为示例，实际可直接使用)
const PropsIconWrapper = ({ icon: Icon, ...props }: { icon: LucideIcon } & LucideProps) => (
    <Icon {...props} />
);

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
        <FeatureGate featureId="community">
        <div className="md:min-h-screen bg-background text-foreground">
            {/* Hero Section - 移动端隐藏 */}
            <div className="hidden md:block relative overflow-hidden border-b border-border/50 pb-12 pt-20 mb-8">
                <div className="absolute inset-0 bg-grid-pattern opacity-[0.03] pointer-events-none" />


                <div className="max-w-4xl mx-auto px-4 relative z-10">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="text-center md:text-left">
                            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-600 dark:from-purple-400 dark:to-indigo-400 mb-4 tracking-tight flex items-center justify-center md:justify-start gap-3">
                                <Aperture className="w-10 h-10 text-purple-500" />
                                命理社区
                            </h1>
                            <p className="text-lg text-foreground-secondary/80 max-w-lg">
                                匿名交流命理心得，探讨玄学奥秘，在这里找到你的同路人。
                            </p>
                        </div>
                        {user && (
                            <button
                                onClick={() => router.push('/community/new')}
                                className="group flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white rounded-xl shadow-lg shadow-purple-500/20 transition-all hover:scale-105 active:scale-95"
                            >
                                <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                                <span className="font-medium">发起讨论</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* 移动端操作栏 */}
            {user && (
                <div className="md:hidden flex justify-end px-4 py-3">
                    <button
                        onClick={() => router.push('/community/new')}
                        className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-sm rounded-lg shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        <span>发起讨论</span>
                    </button>
                </div>
            )}

            <div className="max-w-4xl mx-auto px-4 space-y-6">
                {/* 匿名提示 */}
                <AnonymityNotice />

                {/* 搜索和筛选 */}
                <div className="sticky top-4 z-30 bg-background/80 backdrop-blur-md rounded-2xl border border-border shadow-sm p-2 flex flex-col sm:flex-row gap-2 transition-all">
                    <div className="flex-1 relative group">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-secondary group-focus-within:text-purple-500 transition-colors" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            placeholder="搜索感兴趣的话题..."
                            className="w-full bg-transparent hover:bg-background-secondary/50 focus:bg-background border-none rounded-xl pl-10 pr-4 py-2.5 text-foreground placeholder:text-foreground-secondary/50 focus:ring-2 focus:ring-purple-500/20 transition-all outline-none"
                        />
                    </div>
                    <div className="w-px h-8 bg-border hidden sm:block self-center" />
                    <div className="flex gap-2 min-w-[280px]">
                        <div className="relative flex-1">
                            <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-secondary pointer-events-none" />
                            <select
                                value={category}
                                onChange={(e) => { setCategory(e.target.value as PostCategory | ''); setPage(1); }}
                                className="w-full bg-transparent hover:bg-background-secondary/50 focus:bg-background border-none rounded-xl pl-10 pr-8 py-2.5 text-foreground focus:ring-2 focus:ring-purple-500/20 transition-all outline-none appearance-none cursor-pointer"
                            >
                                <option value="">全部分类</option>
                                {POST_CATEGORIES.map(cat => (
                                    <option key={cat.value} value={cat.value}>
                                        {cat.label}
                                    </option>
                                ))}
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-foreground-secondary">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </div>
                        </div>
                        <div className="relative flex-1">
                            <select
                                value={sortBy}
                                onChange={(e) => { setSortBy(e.target.value as 'latest' | 'popular' | 'hot'); setPage(1); }}
                                className="w-full bg-transparent hover:bg-background-secondary/50 focus:bg-background border-none rounded-xl px-4 py-2.5 text-foreground focus:ring-2 focus:ring-purple-500/20 transition-all outline-none appearance-none cursor-pointer text-center"
                            >
                                <option value="latest">最新发布</option>
                                <option value="popular">最多点赞</option>
                                <option value="hot">近期热议</option>
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-foreground-secondary">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 帖子列表 */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 space-y-4">
                        <div className="relative w-12 h-12">
                            <div className="absolute inset-0 border-4 border-purple-100 dark:border-purple-900 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-purple-500 rounded-full border-t-transparent animate-spin"></div>
                        </div>
                        <p className="text-foreground-secondary animate-pulse">加载讨论中...</p>
                    </div>
                ) : posts.length === 0 ? (
                    <div className="text-center py-20 bg-background-secondary/30 rounded-3xl border border-border/50">
                        <div className="w-20 h-20 bg-background-secondary rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                            <MessageCircle className="w-10 h-10 text-foreground-secondary/50" />
                        </div>
                        <h3 className="text-lg font-medium text-foreground mb-2">暂无帖子</h3>
                        <p className="text-foreground-secondary mb-6">这里还很安静，来发布第一个讨论吧</p>
                        {user && (
                            <button
                                onClick={() => router.push('/community/new')}
                                className="px-6 py-2.5 bg-background border border-border hover:border-purple-500/50 hover:text-purple-500 rounded-xl transition-all shadow-sm hover:shadow-md"
                            >
                                发起讨论
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="grid gap-4">
                            {posts.map(post => (
                                <PostCard key={post.id} post={post} />
                            ))}
                        </div>

                        {/* 分页 */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-3 pt-8 pb-4">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="p-2 rounded-lg hover:bg-background-secondary disabled:opacity-50 disabled:hover:bg-transparent transition-colors text-foreground-secondary"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                </button>
                                <span className="text-sm font-medium text-foreground px-4 py-1.5 bg-background-secondary rounded-lg">
                                    {page} / {totalPages}
                                </span>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="p-2 rounded-lg hover:bg-background-secondary disabled:opacity-50 disabled:hover:bg-transparent transition-colors text-foreground-secondary"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
        </FeatureGate>
    );
}
