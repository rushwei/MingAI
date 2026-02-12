/**
 * 面相历史记录页面
 *
 * 'use client' 标记说明：
 * - 使用 React hooks (useState, useEffect, useCallback)
 * - 使用 useRouter 进行客户端导航
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Calendar, Trash2, Search, ScanFace, BookOpenText } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { writeSessionJSON } from '@/lib/cache';
import { FACE_ANALYSIS_TYPES } from '@/lib/divination/face';
import { getModelName } from '@/lib/ai/ai-config';
import { AddToKnowledgeBaseModal } from '@/components/knowledge-base/AddToKnowledgeBaseModal';

interface FaceReading {
    id: string;
    analysis_type: string;
    conversation_id?: string | null;
    conversation?: { source_data?: Record<string, unknown> } | null;
    created_at: string;
}

export default function FaceHistoryPage() {
    const router = useRouter();
    const [readings, setReadings] = useState<FaceReading[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [kbModalOpen, setKbModalOpen] = useState(false);
    const [kbTarget, setKbTarget] = useState<FaceReading | null>(null);

    const loadReadings = useCallback(async () => {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
            router.push('/face');
            return;
        }

        const { data, error } = await supabase
            .from('face_readings')
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
            .from('face_readings')
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
            window.dispatchEvent(new CustomEvent('mingai:data-index:invalidate', { detail: { types: ['face_reading'] } }));
        }
        setDeleteConfirmId(null);
    };

    const getAnalysisTypeName = (typeId: string): string => {
        const type = FACE_ANALYSIS_TYPES.find(t => t.id === typeId);
        return type?.name || typeId;
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
        return getAnalysisTypeName(r.analysis_type).toLowerCase().includes(query);
    });

    const handleView = (reading: FaceReading) => {
        const sessionData = {
            readingId: reading.id,
            analysisType: reading.analysis_type,
            createdAt: reading.created_at,
            conversationId: reading.conversation_id || null,
        };

        writeSessionJSON('face_result', sessionData);
        router.push('/face/result');
    };

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-4xl mx-auto px-4 sm:py-8 py-4">
                {/* 头部 - 仅桌面端显示 */}
                <div className="hidden md:flex items-center gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl font-bold">面相分析历史</h1>
                        <p className="text-foreground-secondary text-sm mt-1">
                            查看您的历史面相分析记录
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
                        {/* 骨架屏 - 模拟面相分析记录卡片 */}
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="bg-background-secondary rounded-xl p-4 border border-border">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-2">
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
                        <ScanFace className="w-12 h-12 mx-auto mb-4 text-foreground-tertiary" />
                        <p className="text-foreground-secondary">
                            {searchQuery ? '未找到匹配的记录' : '暂无历史记录'}
                        </p>
                        <Link
                            href="/face"
                            className="inline-block mt-4 px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                        >
                            开始面相分析
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredReadings.map(reading => {
                            const sourceData = reading.conversation?.source_data;
                            const modelId = typeof sourceData?.model_id === 'string' ? sourceData.model_id : null;
                            const modelName = modelId ? getModelName(modelId) : null;
                            return (
                                <div
                                    key={reading.id}
                                    className="bg-background-secondary rounded-xl p-4 border border-border hover:border-purple-500/30 transition-colors cursor-pointer"
                                    onClick={() => handleView(reading)}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="px-2 py-0.5 text-xs rounded-full bg-purple-500/10 text-purple-500">
                                                    {getAnalysisTypeName(reading.analysis_type)}
                                                </span>
                                                <div className="flex items-center gap-2 ml-auto">
                                                    <span className="flex items-center gap-1 text-xs text-foreground-secondary">
                                                        <Calendar className="w-3 h-3" />
                                                        {formatDate(reading.created_at)}
                                                    </span>
                                                    {modelName && (
                                                        <span className="text-xs text-foreground-secondary px-2 py-0.5 rounded bg-background">
                                                            {modelName}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <p className="text-sm font-medium">
                                                {getAnalysisTypeName(reading.analysis_type)}
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
                            确定要删除这条面相分析记录吗？此操作无法撤销。
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
                    sourceTitle={getAnalysisTypeName(kbTarget.analysis_type)}
                    sourceType="face_reading"
                    sourceId={kbTarget.id}
                />
            )}
        </div>
    );
}
