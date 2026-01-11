'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Calendar, Trash2, Loader2, Search, MessageSquare } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { TAROT_SPREADS, type DrawnCard } from '@/lib/tarot';

interface TarotReading {
    id: string;
    spread_id: string;
    question: string | null;
    cards: DrawnCard[];
    created_at: string;
}

export default function TarotHistoryPage() {
    const router = useRouter();
    const [readings, setReadings] = useState<TarotReading[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    useEffect(() => {
        loadReadings();
    }, []);

    const loadReadings = async () => {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
            router.push('/tarot');
            return;
        }

        const { data, error } = await supabase
            .from('tarot_readings')
            .select('*')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) {
            console.error('加载历史记录失败:', error);
        } else {
            setReadings(data || []);
        }
        setLoading(false);
    };

    const handleDelete = async (id: string) => {
        const { error } = await supabase
            .from('tarot_readings')
            .delete()
            .eq('id', id);

        if (!error) {
            setReadings(prev => prev.filter(r => r.id !== id));
        }
        setDeleteConfirmId(null);
    };

    const getSpreadName = (spreadId: string): string => {
        const spread = TAROT_SPREADS.find(s => s.id === spreadId);
        return spread?.name || spreadId;
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const filteredReadings = readings.filter(r => {
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();
        return (
            (r.question?.toLowerCase().includes(query)) ||
            getSpreadName(r.spread_id).toLowerCase().includes(query)
        );
    });

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-4xl mx-auto px-4 py-8">
                {/* 头部 */}
                <div className="flex items-center gap-4 mb-8">
                    <Link
                        href="/tarot"
                        className="p-2 rounded-lg hover:bg-background-secondary transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold">塔罗占卜历史</h1>
                        <p className="text-foreground-secondary text-sm mt-1">
                            查看您的历史抽牌记录
                        </p>
                    </div>
                </div>

                {/* 搜索框 */}
                <div className="relative mb-6">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-secondary" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="搜索问题或牌阵..."
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-background-secondary border border-border focus:outline-none focus:ring-2 focus:ring-accent/30"
                    />
                </div>

                {/* 列表 */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-accent" />
                        <span className="text-foreground-secondary">加载中...</span>
                    </div>
                ) : filteredReadings.length === 0 ? (
                    <div className="text-center py-16">
                        <MessageSquare className="w-12 h-12 mx-auto mb-4 text-foreground-tertiary" />
                        <p className="text-foreground-secondary">
                            {searchQuery ? '未找到匹配的记录' : '暂无历史记录'}
                        </p>
                        <Link
                            href="/tarot"
                            className="inline-block mt-4 px-6 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
                        >
                            开始占卜
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredReadings.map(reading => (
                            <div
                                key={reading.id}
                                className="bg-background-secondary rounded-xl p-4 border border-border hover:border-accent/30 transition-colors"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="px-2 py-0.5 text-xs rounded-full bg-purple-500/10 text-purple-500">
                                                {getSpreadName(reading.spread_id)}
                                            </span>
                                            <span className="flex items-center gap-1 text-xs text-foreground-secondary">
                                                <Calendar className="w-3 h-3" />
                                                {formatDate(reading.created_at)}
                                            </span>
                                        </div>
                                        <p className="text-sm font-medium truncate">
                                            {reading.question || '无特定问题'}
                                        </p>
                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                            {reading.cards.slice(0, 5).map((card, i) => (
                                                <span
                                                    key={i}
                                                    className={`px-2 py-0.5 text-xs rounded ${card.orientation === 'reversed'
                                                        ? 'bg-rose-500/10 text-rose-500'
                                                        : 'bg-emerald-500/10 text-emerald-500'
                                                        }`}
                                                >
                                                    {card.card.nameChinese}
                                                    {card.orientation === 'reversed' ? ' ↓' : ''}
                                                </span>
                                            ))}
                                            {reading.cards.length > 5 && (
                                                <span className="px-2 py-0.5 text-xs rounded bg-background text-foreground-secondary">
                                                    +{reading.cards.length - 5}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setDeleteConfirmId(reading.id)}
                                        className="p-2 rounded-lg hover:bg-red-500/10 text-foreground-secondary hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* 删除确认弹窗 */}
            {deleteConfirmId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setDeleteConfirmId(null)} />
                    <div className="relative bg-background rounded-xl border border-border shadow-xl p-6 max-w-sm w-full">
                        <h3 className="text-lg font-semibold mb-2">确认删除</h3>
                        <p className="text-foreground-secondary mb-6">
                            确定要删除这条占卜记录吗？此操作无法撤销。
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="px-4 py-2 rounded-lg border border-border hover:bg-background-secondary transition-colors"
                            >
                                取消
                            </button>
                            <button
                                onClick={() => handleDelete(deleteConfirmId)}
                                className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
                            >
                                删除
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
