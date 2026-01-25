'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Calendar, Trash2, Loader2, Search, MessageSquare, BookOpenText } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PERSONALITY_BASICS, type MBTIType } from '@/lib/mbti';
import { getModelName } from '@/lib/ai-config';
import { AddToKnowledgeBaseModal } from '@/components/knowledge-base/AddToKnowledgeBaseModal';

interface MBTIReading {
    id: string;
    mbti_type: MBTIType;
    scores: Record<string, number>;
    percentages: {
        EI: { E: number; I: number };
        SN: { S: number; N: number };
        TF: { T: number; F: number };
        JP: { J: number; P: number };
    };
    conversation_id?: string | null;
    conversation?: { source_data?: Record<string, unknown> } | null;
    created_at: string;
}

export default function MBTIHistoryPage() {
    const router = useRouter();
    const [readings, setReadings] = useState<MBTIReading[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [kbModalOpen, setKbModalOpen] = useState(false);
    const [kbTarget, setKbTarget] = useState<MBTIReading | null>(null);

    const loadReadings = useCallback(async () => {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
            router.push('/mbti');
            return;
        }

        try {
            const response = await fetch('/api/mbti/history', {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                },
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || '加载历史记录失败');
            }
            setReadings(data.data || []);
        } catch (error) {
            console.error('加载历史记录失败:', error);
        } finally {
            setLoading(false);
        }
    }, [router]);

    useEffect(() => {
        loadReadings();
    }, [loadReadings]);

    const handleDelete = async (id: string) => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
            router.push('/mbti');
            return;
        }

        try {
            const response = await fetch('/api/mbti/history', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ id }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || '删除失败');
            }
            setReadings(prev => prev.filter(r => r.id !== id));
            window.dispatchEvent(new CustomEvent('mingai:data-index:invalidate', { detail: { types: ['mbti_reading'] } }));
        } catch (error) {
            console.error('删除历史记录失败:', error);
        } finally {
            setDeleteConfirmId(null);
        }
    };

    const getPersonalityInfo = (type: MBTIType) => {
        return PERSONALITY_BASICS[type] || { title: type, description: '' };
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
        const info = getPersonalityInfo(r.mbti_type);
        return (
            r.mbti_type.toLowerCase().includes(query) ||
            info.title.toLowerCase().includes(query)
        );
    });

    const handleView = (reading: MBTIReading) => {
        const sessionData = {
            type: reading.mbti_type,
            scores: reading.scores,
            percentages: reading.percentages,
            readingId: reading.id,
            conversationId: reading.conversation_id || null,
        };
        sessionStorage.setItem('mbti_result', JSON.stringify(sessionData));
        router.push('/mbti/result');
    };

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-4xl mx-auto px-4 py-8">
                {/* 头部 */}
                <div className="flex items-center gap-4 mb-8">
                    <Link
                        href="/mbti"
                        className="p-2 rounded-lg hover:bg-background-secondary transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold">MBTI 测试历史</h1>
                        <p className="text-foreground-secondary text-sm mt-1">
                            查看您的历史测试结果
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
                        placeholder="搜索人格类型..."
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
                            href="/mbti"
                            className="inline-block mt-4 px-6 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
                        >
                            开始测试
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredReadings.map(reading => {
                            const info = getPersonalityInfo(reading.mbti_type);
                            const sourceData = reading.conversation?.source_data;
                            const modelId = typeof sourceData?.model_id === 'string' ? sourceData.model_id : null;
                            const modelName = modelId ? getModelName(modelId) : null;
                            return (
                                <div
                                    key={reading.id}
                                    className="bg-background-secondary rounded-xl p-4 border border-border hover:border-accent/30 transition-colors cursor-pointer"
                                    onClick={() => handleView(reading)}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="px-3 py-1 text-sm font-bold rounded-lg bg-pink-500/10 text-pink-500">
                                                    {reading.mbti_type}
                                                </span>
                                                <span className="text-sm font-medium">
                                                    {info.title}
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
                                            {reading.percentages && (
                                                <div className="flex flex-wrap gap-2 mt-2">
                                                    <span className="text-xs px-2 py-0.5 rounded bg-background">
                                                        E{reading.percentages.EI.E}% / I{reading.percentages.EI.I}%
                                                    </span>
                                                    <span className="text-xs px-2 py-0.5 rounded bg-background">
                                                        S{reading.percentages.SN.S}% / N{reading.percentages.SN.N}%
                                                    </span>
                                                    <span className="text-xs px-2 py-0.5 rounded bg-background">
                                                        T{reading.percentages.TF.T}% / F{reading.percentages.TF.F}%
                                                    </span>
                                                    <span className="text-xs px-2 py-0.5 rounded bg-background">
                                                        J{reading.percentages.JP.J}% / P{reading.percentages.JP.P}%
                                                    </span>
                                                </div>
                                            )}
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
                            确定要删除这条测试记录吗？此操作无法撤销。
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
                    sourceTitle={`MBTI - ${kbTarget.mbti_type}`}
                    sourceType="mbti_reading"
                    sourceId={kbTarget.id}
                />
            )}
        </div>
    );
}
