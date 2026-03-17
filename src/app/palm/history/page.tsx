/**
 * 手相历史记录页面
 *
 * 'use client' 标记说明：
 * - 使用 React hooks (useState, useEffect, useCallback)
 * - 使用 useRouter 进行客户端导航
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Calendar, Trash2, Search, Hand, BookOpenText } from 'lucide-react';
import { supabase } from '@/lib/auth';
import { AddToKnowledgeBaseModal } from '@/components/knowledge-base/AddToKnowledgeBaseModal';
import {
    applyHistoryRestorePayload,
    deleteHistorySummary,
    loadHistoryRestore,
    loadHistorySummaries,
} from '@/lib/history/client';
import type { HistorySummaryItem } from '@/lib/history/registry';

export default function PalmHistoryPage() {
    const router = useRouter();
    const [readings, setReadings] = useState<HistorySummaryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [kbModalOpen, setKbModalOpen] = useState(false);
    const [kbTarget, setKbTarget] = useState<HistorySummaryItem | null>(null);

    const loadReadings = useCallback(async () => {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
            router.push('/palm');
            return;
        }

        setReadings(await loadHistorySummaries('palm'));
        setLoading(false);
    }, [router]);

    useEffect(() => {
        const timer = setTimeout(() => {
            void loadReadings();
        }, 0);
        return () => clearTimeout(timer);
    }, [loadReadings]);

    const handleDelete = async (id: string) => {
        const success = await deleteHistorySummary('palm', id);
        if (success) {
            setReadings(prev => prev.filter(r => r.id !== id));
            window.dispatchEvent(new CustomEvent('mingai:data-index:invalidate', { detail: { types: ['palm_reading'] } }));
        }
        setDeleteConfirmId(null);
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
        return [r.title, ...(r.badges || [])]
            .join(' ')
            .toLowerCase()
            .includes(query);
    });

    const handleView = async (reading: HistorySummaryItem) => {
        const payload = await loadHistoryRestore('palm', reading.id);
        if (!payload) return;
        router.push(applyHistoryRestorePayload(payload, reading.id));
    };

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-4xl mx-auto px-4 sm:py-8 py-4">
                {/* 头部 - 仅桌面端显示 */}
                <div className="hidden md:flex items-center gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl font-bold">手相分析历史</h1>
                        <p className="text-foreground-secondary text-sm mt-1">
                            查看您的历史手相分析记录
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
                        placeholder="搜索分析类型..."
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-background-secondary border border-border focus:outline-none focus:ring-2 focus:ring-accent/30"
                    />
                </div>

                {/* 列表 */}
                {loading ? (
                    <div className="space-y-3">
                        {/* 骨架屏 - 模拟手相分析记录卡片 */}
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="bg-background-secondary rounded-xl p-4 border border-border">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="h-5 w-12 rounded-full bg-foreground/10 animate-pulse" />
                                            <div className="h-5 w-20 rounded-full bg-foreground/10 animate-pulse" />
                                            <div className="ml-auto flex items-center gap-2">
                                                <div className="h-4 w-28 rounded bg-foreground/5 animate-pulse" />
                                            </div>
                                        </div>
                                        <div className="h-5 w-32 rounded bg-foreground/10 animate-pulse" />
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <div className="w-8 h-8 rounded-lg bg-foreground/5 animate-pulse" />
                                        <div className="w-8 h-8 rounded-lg bg-foreground/5 animate-pulse" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filteredReadings.length === 0 ? (
                    <div className="text-center py-16">
                        <Hand className="w-12 h-12 mx-auto mb-4 text-foreground-tertiary" />
                        <p className="text-foreground-secondary">
                            {searchQuery ? '未找到匹配的记录' : '暂无历史记录'}
                        </p>
                        <Link
                            href="/palm"
                            className="inline-block mt-4 px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
                        >
                            开始手相分析
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredReadings.map(reading => {
                            return (
                                <div
                                    key={reading.id}
                                    className="bg-background-secondary rounded-xl p-4 border border-border hover:border-amber-500/30 transition-colors cursor-pointer"
                                    onClick={() => void handleView(reading)}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="px-2 py-0.5 text-xs rounded-full bg-amber-500/10 text-amber-500">
                                                    {reading.badges?.[0] || reading.title}
                                                </span>
                                                {reading.badges?.[1] && (
                                                    <span className="px-2 py-0.5 text-xs rounded-full bg-orange-500/10 text-orange-500">
                                                        {reading.badges[1]}
                                                    </span>
                                                )}
                                                <div className="flex items-center gap-2 ml-auto">
                                                    <span className="flex items-center gap-1 text-xs text-foreground-secondary">
                                                        <Calendar className="w-3 h-3" />
                                                        {formatDate(reading.createdAt)}
                                                    </span>
                                                    {reading.modelName && (
                                                        <span className="text-xs text-foreground-secondary px-2 py-0.5 rounded bg-background">
                                                            {reading.modelName}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <p className="text-sm font-medium">
                                                {[...(reading.badges || []), reading.title].filter(Boolean).join(' ')}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    setKbTarget(reading);
                                                    setKbModalOpen(true);
                                                }}
                                                className="p-2 rounded-lg hover:bg-emerald-500/10 text-foreground-secondary hover:text-emerald-500 transition-colors"
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
                                                className="p-2 rounded-lg hover:bg-red-500/10 text-foreground-secondary hover:text-red-500 transition-colors"
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setDeleteConfirmId(null)} />
                    <div className="relative bg-background rounded-xl border border-border shadow-xl p-6 max-w-sm w-full">
                        <h3 className="text-lg font-semibold mb-2">确认删除</h3>
                        <p className="text-foreground-secondary mb-6">
                            确定要删除这条手相分析记录吗？此操作无法撤销。
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

            {kbTarget && (
                <AddToKnowledgeBaseModal
                    open={kbModalOpen}
                    onClose={() => {
                        setKbModalOpen(false);
                        setKbTarget(null);
                    }}
                    sourceTitle={[...(kbTarget.badges || []), kbTarget.title].filter(Boolean).join(' ')}
                    sourceType="palm_reading"
                    sourceId={kbTarget.id}
                />
            )}
        </div>
    );
}
