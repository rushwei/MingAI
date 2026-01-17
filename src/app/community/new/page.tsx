'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { PostCategory, POST_CATEGORIES } from '@/lib/community';
import { supabase } from '@/lib/supabase';

export default function NewPostPage() {
    const router = useRouter();
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [category, setCategory] = useState<PostCategory>('general');
    const [anonymousName, setAnonymousName] = useState('匿名用户');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [user, setUser] = useState<{ id: string } | null>(null);

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/community');
                return;
            }
            setUser(user);
        };
        checkAuth();
    }, [router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!title.trim() || !content.trim()) {
            setError('标题和内容不能为空');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/community/posts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title,
                    content,
                    category,
                    anonymous_name: anonymousName,
                }),
            });

            if (response.ok) {
                const post = await response.json();
                router.push(`/community/${post.id}`);
            } else {
                const data = await response.json();
                setError(data.error || '发帖失败');
            }
        } catch {
            setError('发帖失败，请重试');
        } finally {
            setLoading(false);
        }
    };

    if (!user) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-accent"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground">
            <div className="max-w-2xl mx-auto p-4 md:p-6">
                {/* 返回按钮 */}
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-foreground-secondary hover:text-foreground mb-6 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    返回社区
                </button>

                <h1 className="text-2xl font-bold mb-6">发布新帖子</h1>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="text-red-400 text-sm bg-red-900/20 p-3 rounded-lg">{error}</div>
                    )}

                    <div>
                        <label className="block text-sm text-foreground-secondary mb-1">匿名昵称</label>
                        <input
                            type="text"
                            value={anonymousName}
                            onChange={(e) => setAnonymousName(e.target.value)}
                            className="w-full bg-background-secondary border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-accent"
                            placeholder="自定义你的匿名昵称"
                            maxLength={20}
                        />
                        <p className="text-xs text-foreground-secondary mt-1">此昵称将在帖子和评论中显示</p>
                    </div>

                    <div>
                        <label className="block text-sm text-foreground-secondary mb-1">分类</label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value as PostCategory)}
                            className="w-full bg-background-secondary border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-accent"
                        >
                            {POST_CATEGORIES.map(cat => (
                                <option key={cat.value} value={cat.value}>
                                    {cat.icon} {cat.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm text-foreground-secondary mb-1">标题 *</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full bg-background-secondary border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-accent"
                            placeholder="输入帖子标题"
                            maxLength={100}
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-foreground-secondary mb-1">内容 *</label>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            rows={10}
                            className="w-full bg-background-secondary border border-border rounded-lg px-4 py-2 text-foreground focus:outline-none focus:border-accent resize-none"
                            placeholder="分享你的想法..."
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="flex-1 px-4 py-2 text-foreground-secondary hover:text-foreground transition-colors"
                        >
                            取消
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !title.trim() || !content.trim()}
                            className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                        >
                            {loading ? '发布中...' : '发布帖子'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
