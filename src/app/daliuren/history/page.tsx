/**
 * 大六壬历史记录页面
 * 需要 useState + useEffect + useRouter
 */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Calendar, Trash2, BookOpen, MessageSquare } from 'lucide-react';
import { supabase } from '@/lib/auth';
import {
    applyHistoryRestorePayload,
    deleteHistorySummary,
    loadHistoryRestore,
    loadHistorySummaries,
} from '@/lib/history/client';
import type { HistorySummaryItem } from '@/lib/history/registry';

function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function DaliurenHistoryPage() {
    const router = useRouter();
    const [records, setRecords] = useState<HistorySummaryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const defaultTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai';

    useEffect(() => {
        let cancelled = false;

        async function loadRecords() {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) {
                router.push('/daliuren');
                return;
            }
            const history = await loadHistorySummaries('daliuren');
            if (cancelled) return;
            setRecords(history);
            setLoading(false);
        }

        void loadRecords();

        return () => {
            cancelled = true;
        };
    }, [router]);

    const handleView = async (record: HistorySummaryItem) => {
        const payload = await loadHistoryRestore('daliuren', record.id, defaultTimeZone);
        if (!payload) return;
        router.push(applyHistoryRestorePayload(payload, record.id));
    };

    const handleDelete = async (id: string) => {
        const success = await deleteHistorySummary('daliuren', id);
        if (success) {
            setRecords(prev => prev.filter(r => r.id !== id));
        }
        setDeleteConfirmId(null);
    };

    return (
        <div className="min-h-screen bg-background pb-20">
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border/50 px-4 py-3">
                <div className="max-w-lg mx-auto flex items-center justify-between">
                    <Link href="/daliuren" className="text-foreground-secondary hover:text-foreground">
                        <BookOpen className="w-5 h-5" />
                    </Link>
                    <h1 className="text-sm font-bold text-foreground">六壬历史</h1>
                    <div className="w-5" />
                </div>
            </div>

            <div className="max-w-lg mx-auto px-4 py-4 space-y-3">
                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="w-6 h-6 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
                    </div>
                ) : records.length === 0 ? (
                    <div className="text-center py-12 text-foreground-secondary text-sm">暂无历史记录</div>
                ) : records.map(record => {
                    return (
                        <div
                            key={record.id}
                            className="bg-background-secondary/50 rounded-xl p-4 border border-border/30 cursor-pointer hover:border-cyan-500/30 transition-colors"
                            onClick={() => void handleView(record)}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-foreground truncate">{record.title}</div>
                                    {record.question && (
                                        <div className="text-xs text-foreground-secondary mt-0.5 truncate flex items-center gap-1">
                                            <MessageSquare className="w-3 h-3 flex-shrink-0" />
                                            {record.question}
                                        </div>
                                    )}
                                    <div className="text-xs text-foreground-tertiary mt-1 flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        {formatDate(record.createdAt)}
                                    </div>
                                </div>
                                <button
                                    onClick={e => { e.stopPropagation(); setDeleteConfirmId(record.id); }}
                                    className="text-foreground-tertiary hover:text-red-500 transition-colors p-1"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                            {deleteConfirmId === record.id && (
                                <div className="mt-3 flex gap-2" onClick={e => e.stopPropagation()}>
                                    <button
                                        onClick={() => handleDelete(record.id)}
                                        className="flex-1 py-1.5 rounded-lg bg-red-500 text-white text-xs font-medium"
                                    >
                                        确认删除
                                    </button>
                                    <button
                                        onClick={() => setDeleteConfirmId(null)}
                                        className="flex-1 py-1.5 rounded-lg bg-background-secondary text-foreground-secondary text-xs"
                                    >
                                        取消
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
