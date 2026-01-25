'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Calendar, Trash2, Loader2, Search, MessageSquare, BookOpenText, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { TAROT_SPREADS, type DrawnCard } from '@/lib/tarot';
import { getModelName } from '@/lib/ai-config';
import { AddToKnowledgeBaseModal } from '@/components/knowledge-base/AddToKnowledgeBaseModal';

interface TarotReading {
    id: string;
    spread_id: string;
    question: string | null;
    cards: DrawnCard[];
    conversation_id?: string | null;
    conversation?: { source_data?: Record<string, unknown> } | null;
    created_at: string;
}

export default function TarotHistoryPage() {
    const router = useRouter();
    const [readings, setReadings] = useState<TarotReading[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [kbModalOpen, setKbModalOpen] = useState(false);
    const [kbTarget, setKbTarget] = useState<TarotReading | null>(null);

    const loadReadings = useCallback(async () => {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
            router.push('/tarot');
            return;
        }

        const { data, error } = await supabase
            .from('tarot_readings')
            .select('*, conversation:conversations(source_data)')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) {
            console.error('加载历史记录失败:', error);
        } else {
            setReadings(data || []);
        }
        setLoading(false);
    }, [router]);

    useEffect(() => {
        const timer = setTimeout(() => {
            void loadReadings();
        }, 0);
        return () => clearTimeout(timer);
    }, [loadReadings]);

    const handleDelete = async (id: string) => {
        const target = readings.find(r => r.id === id);
        const { error } = await supabase
            .from('tarot_readings')
            .delete()
            .eq('id', id);

        if (!error) {
            if (target?.conversation_id) {
                const { error: conversationError } = await supabase
                    .from('conversations')
                    .delete()
                    .eq('id', target.conversation_id);
                if (conversationError) {
                    console.error('删除对话记录失败:', conversationError);
                }
            }
            setReadings(prev => prev.filter(r => r.id !== id));
            window.dispatchEvent(new CustomEvent('mingai:data-index:invalidate', { detail: { types: ['tarot_reading'] } }));
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

    const handleView = (reading: TarotReading) => {
        const spread = TAROT_SPREADS.find(s => s.id === reading.spread_id);
        const sessionData = {
            spread,
            spreadId: reading.spread_id,
            cards: reading.cards,
            question: reading.question || '',
            readingId: reading.id,
            createdAt: reading.created_at,
            conversationId: reading.conversation_id || null,
        };
        sessionStorage.setItem('tarot_result', JSON.stringify(sessionData));
        router.push(`/tarot/result?from=history&t=${reading.id}`);
    };

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-6xl mx-auto px-4 py-8">
                {/* 头部 */}
                <div className="flex items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/tarot"
                            className="p-2 rounded-xl hover:bg-background-secondary transition-colors border border-transparent hover:border-border"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold flex items-center gap-2">
                                <Sparkles className="w-6 h-6 text-purple-500" />
                                塔罗占卜历史
                            </h1>
                            <p className="text-foreground-secondary text-sm mt-1">
                                回顾你的心灵指引记录
                            </p>
                        </div>
                    </div>
                </div>

                {/* 搜索与过滤 */}
                <div className="flex items-center gap-3 mb-6 bg-background-secondary/50 p-2 rounded-2xl border border-border">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-secondary" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="搜索问题或牌阵..."
                            className="w-full pl-9 pr-4 py-2 rounded-xl bg-background border-none focus:outline-none focus:ring-2 focus:ring-accent/20 text-sm placeholder:text-foreground-tertiary"
                        />
                    </div>
                    {/* 可以添加筛选下拉菜单等 */}
                </div>

                {/* 列表 */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-accent" />
                        <span className="text-foreground-secondary">加载记录中...</span>
                    </div>
                ) : filteredReadings.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-background-secondary/30 rounded-3xl border border-border border-dashed">
                        <div className="w-16 h-16 rounded-full bg-background-secondary flex items-center justify-center mb-4">
                            <MessageSquare className="w-8 h-8 text-foreground-tertiary" />
                        </div>
                        <h3 className="text-lg font-medium mb-1">
                            {searchQuery ? '未找到匹配的记录' : '暂无历史记录'}
                        </h3>
                        <p className="text-sm text-foreground-secondary mb-6 text-center max-w-xs">
                            {searchQuery ? '换个关键词试试看' : '每一次占卜都是与潜意识的对话，现在的空白也许是为了更好的开始'}
                        </p>
                        <Link
                            href="/tarot"
                            className="px-6 py-2.5 bg-accent text-white rounded-xl hover:bg-accent/90 transition-all shadow-lg shadow-accent/20 font-medium text-sm"
                        >
                            开始新的占卜
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredReadings.map(reading => {
                            const sourceData = reading.conversation?.source_data;
                            const modelId = typeof sourceData?.model_id === 'string' ? sourceData.model_id : null;
                            const modelName = modelId ? getModelName(modelId) : null;
                            const spreadName = getSpreadName(reading.spread_id);
                            
                            return (
                                <div
                                    key={reading.id}
                                    className="group relative bg-background-secondary rounded-2xl p-5 border border-border hover:border-purple-500/30 hover:shadow-lg hover:shadow-purple-500/5 transition-all duration-300 cursor-pointer flex flex-col"
                                    onClick={() => handleView(reading)}
                                >
                                    {/* 顶部标签 */}
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <span className="px-2.5 py-1 text-xs font-medium rounded-lg bg-purple-500/10 text-purple-500 border border-purple-500/10">
                                                {spreadName}
                                            </span>
                                            {modelName && (
                                                <span className="px-2 py-0.5 text-[10px] rounded-md bg-background text-foreground-secondary border border-border">
                                                    {modelName}
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-xs text-foreground-tertiary font-mono">
                                            {formatDate(reading.created_at)}
                                        </span>
                                    </div>

                                    {/* 问题 */}
                                    <h3 className="text-base font-semibold mb-3 line-clamp-2 group-hover:text-purple-500 transition-colors">
                                        {reading.question || '无特定问题'}
                                    </h3>

                                    {/* 牌面预览 */}
                                    <div className="flex-1">
                                        <div className="flex flex-wrap gap-1.5 mb-4">
                                            {reading.cards.slice(0, 3).map((card, i) => (
                                                <div
                                                    key={i}
                                                    className={`px-2 py-1 text-xs rounded-md border ${
                                                        card.orientation === 'reversed'
                                                            ? 'bg-rose-500/5 border-rose-500/20 text-rose-500'
                                                            : 'bg-emerald-500/5 border-emerald-500/20 text-emerald-500'
                                                    }`}
                                                >
                                                    {card.card.nameChinese}
                                                    {card.orientation === 'reversed' && ' (逆)'}
                                                </div>
                                            ))}
                                            {reading.cards.length > 3 && (
                                                <span className="px-2 py-1 text-xs rounded-md bg-background border border-border text-foreground-secondary">
                                                    +{reading.cards.length - 3}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* 底部操作栏 - 默认隐藏，hover显示 */}
                                    <div className="pt-3 mt-auto border-t border-border flex items-center justify-between opacity-60 group-hover:opacity-100 transition-opacity">
                                        <div className="text-xs text-foreground-secondary flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            查看详情
                                        </div>
                                        
                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    setKbTarget(reading);
                                                    setKbModalOpen(true);
                                                }}
                                                className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-foreground-secondary hover:text-emerald-500 transition-colors"
                                                title="加入知识库"
                                            >
                                                <BookOpenText className="w-4 h-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    setDeleteConfirmId(reading.id);
                                                }}
                                                className="p-1.5 rounded-lg hover:bg-red-500/10 text-foreground-secondary hover:text-red-500 transition-colors"
                                                title="删除"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* 删除确认弹窗 */}
            {deleteConfirmId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDeleteConfirmId(null)} />
                    <div className="relative bg-background rounded-2xl border border-border shadow-2xl p-6 max-w-sm w-full animate-in zoom-in-95 duration-200">
                        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4 mx-auto text-red-500">
                            <Trash2 className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2 text-center">确认删除</h3>
                        <p className="text-foreground-secondary mb-6 text-center text-sm">
                            确定要删除这条占卜记录吗？此操作无法撤销。
                        </p>
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="px-5 py-2.5 rounded-xl border border-border hover:bg-background-secondary transition-colors text-sm font-medium"
                            >
                                取消
                            </button>
                            <button
                                onClick={() => handleDelete(deleteConfirmId)}
                                className="px-5 py-2.5 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors text-sm font-medium shadow-lg shadow-red-500/20"
                            >
                                确认删除
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {kbTarget && (
                <AddToKnowledgeBaseModal
                    open={kbModalOpen}
                    onClose={() => {
                        setKbModalOpen(false);
                        setKbTarget(null);
                    }}
                    sourceTitle={kbTarget.question || `塔罗 - ${getSpreadName(kbTarget.spread_id)}`}
                    sourceType="tarot_reading"
                    sourceId={kbTarget.id}
                />
            )}
        </div>
    );
}