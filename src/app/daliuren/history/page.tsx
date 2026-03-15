/**
 * 大六壬历史记录页面
 * 需要 useState + useEffect + useRouter
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Calendar, Trash2, BookOpen, MessageSquare } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { writeSessionJSON } from '@/lib/cache';

interface DaliurenRecord {
    id: string;
    question: string | null;
    solar_date: string;
    day_ganzhi: string;
    hour_ganzhi: string;
    result_data: Record<string, unknown>;
    settings: Record<string, unknown> | null;
    conversation_id: string | null;
    created_at: string;
}

function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function DaliurenHistoryPage() {
    const router = useRouter();
    const [records, setRecords] = useState<DaliurenRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    const loadRecords = useCallback(async () => {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
            router.push('/daliuren');
            return;
        }
        const { data, error } = await supabase
            .from('daliuren_divinations')
            .select('id, question, solar_date, day_ganzhi, hour_ganzhi, result_data, settings, conversation_id, created_at')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false })
            .limit(50);
        if (error) console.error('[daliuren history] 加载失败:', error.message);
        setRecords((data as DaliurenRecord[]) || []);
        setLoading(false);
    }, [router]);

    useEffect(() => { loadRecords(); }, [loadRecords]);

    const handleView = (record: DaliurenRecord) => {
        const settings = record.settings || {};
        writeSessionJSON('daliuren_params', {
            date: record.solar_date,
            hour: settings.hour ?? 0,
            minute: settings.minute ?? 0,
            question: record.question || undefined,
            divinationId: record.id,
        });
        router.push(`/daliuren/result?from=history&t=${Date.now()}`);
    };

    const handleDelete = async (id: string) => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const { error } = await supabase.from('daliuren_divinations').delete().eq('id', id).eq('user_id', session.user.id);
        if (!error) {
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
                    const keName = record.result_data?.keName as string | undefined;
                    const title = keName || `${record.day_ganzhi}日`;
                    return (
                        <div
                            key={record.id}
                            className="bg-background-secondary/50 rounded-xl p-4 border border-border/30 cursor-pointer hover:border-cyan-500/30 transition-colors"
                            onClick={() => handleView(record)}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-foreground truncate">{title}</div>
                                    {record.question && (
                                        <div className="text-xs text-foreground-secondary mt-0.5 truncate flex items-center gap-1">
                                            <MessageSquare className="w-3 h-3 flex-shrink-0" />
                                            {record.question}
                                        </div>
                                    )}
                                    <div className="text-xs text-foreground-tertiary mt-1 flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        {formatDate(record.created_at)}
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
