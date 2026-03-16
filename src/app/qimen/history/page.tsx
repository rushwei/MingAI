/**
 * 奇门遁甲历史记录页面
 *
 * 'use client' 标记说明：
 * - 使用 React hooks (useState, useEffect, useCallback)
 * - 使用 useRouter 进行客户端导航
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Calendar, Trash2, Search, MessageSquare, BookOpenText, Compass } from 'lucide-react';
import { supabase } from '@/lib/auth';
import { writeSessionJSON } from '@/lib/cache';
import { getModelName } from '@/lib/ai/ai-config';
import { AddToKnowledgeBaseModal } from '@/components/knowledge-base/AddToKnowledgeBaseModal';

interface QimenChart {
    id: string;
    question: string | null;
    dun_type: 'yang' | 'yin';
    ju_number: number;
    chart_data: Record<string, unknown>;
    conversation_id?: string | null;
    conversation?: { source_data?: Record<string, unknown> } | null;
    created_at: string;
}

function getDunLabel(dunType: string, juNumber: number): string {
    const dunText = dunType === 'yang' ? '阳遁' : '阴遁';
    const juMap: Record<number, string> = { 1:'一',2:'二',3:'三',4:'四',5:'五',6:'六',7:'七',8:'八',9:'九' };
    return `${dunText}${juMap[juNumber] || juNumber}局`;
}

function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
    });
}

export default function QimenHistoryPage() {
    const router = useRouter();
    const [charts, setCharts] = useState<QimenChart[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [kbModalOpen, setKbModalOpen] = useState(false);
    const [kbTarget, setKbTarget] = useState<QimenChart | null>(null);

    const loadCharts = useCallback(async () => {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) { router.push('/qimen'); return; }

        const response = await fetch('/api/qimen', { credentials: 'include' });
        const payload = await response.json().catch(() => null) as {
            data?: { charts?: QimenChart[] };
            error?: string;
        } | null;

        if (!response.ok) console.error('加载历史记录失败:', payload?.error || 'unknown');
        else setCharts(payload?.data?.charts || []);
        setLoading(false);
    }, [router]);

    useEffect(() => {
        const timer = setTimeout(() => { void loadCharts(); }, 0);
        return () => clearTimeout(timer);
    }, [loadCharts]);

    const handleDelete = async (id: string) => {
        const response = await fetch(`/api/qimen?id=${encodeURIComponent(id)}`, {
            method: 'DELETE',
            credentials: 'include',
        });
        if (response.ok) {
            setCharts(prev => prev.filter(c => c.id !== id));
            window.dispatchEvent(new CustomEvent('mingai:data-index:invalidate', { detail: { types: ['qimen_chart'] } }));
        }
        setDeleteConfirmId(null);
    };

    const filteredCharts = charts.filter(c => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (c.question?.toLowerCase().includes(q) || getDunLabel(c.dun_type, c.ju_number).includes(q));
    });

    const handleView = (chart: QimenChart) => {
        writeSessionJSON('qimen_result', {
            ...(chart.chart_data as object),
            question: chart.question,
            createdAt: chart.created_at,
            chartId: chart.id,
            conversationId: chart.conversation_id || null,
        });
        router.push('/qimen/result');
    };

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-6xl mx-auto px-4 py-4 md:py-8">
                {/* 头部 - 仅桌面端显示 */}
                <div className="hidden md:flex items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <Compass className="w-6 h-6 text-indigo-500" />
                            奇门遁甲历史
                        </h1>
                        <p className="text-foreground-secondary text-sm mt-1">三式之首，洞察天时地利</p>
                    </div>
                </div>

                {/* 搜索框 */}
                <div className="flex items-center gap-3 mb-6 bg-background-secondary/50 p-2 rounded-2xl border border-border">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-secondary" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="搜索占事..."
                            className="w-full pl-9 pr-4 py-2 rounded-xl bg-background border-none focus:outline-none focus:ring-2 focus:ring-accent/20 text-sm placeholder:text-foreground-tertiary"
                        />
                    </div>
                </div>

                {/* 列表 */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[1,2,3,4,5,6].map(i => (
                            <div key={i} className="bg-background-secondary rounded-2xl p-5 border border-border">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="h-6 w-20 rounded-lg bg-foreground/10 animate-pulse" />
                                    <div className="h-4 w-24 rounded bg-foreground/5 animate-pulse" />
                                </div>
                                <div className="h-3 w-full rounded bg-foreground/5 animate-pulse mb-2" />
                                <div className="h-3 w-2/3 rounded bg-foreground/5 animate-pulse" />
                                <div className="pt-3 mt-4 border-t border-border flex justify-between">
                                    <div className="h-3 w-16 rounded bg-foreground/5 animate-pulse" />
                                    <div className="flex gap-1">
                                        <div className="w-7 h-7 rounded-lg bg-foreground/5 animate-pulse" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filteredCharts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-background-secondary/30 rounded-3xl border border-border border-dashed">
                        <div className="w-16 h-16 rounded-full bg-background-secondary flex items-center justify-center mb-4">
                            <MessageSquare className="w-8 h-8 text-foreground-tertiary" />
                        </div>
                        <h3 className="text-lg font-medium mb-1">{searchQuery ? '未找到匹配的记录' : '暂无历史记录'}</h3>
                        <p className="text-sm text-foreground-secondary mb-6 text-center max-w-xs">
                            {searchQuery ? '换个关键词试试看' : '每一次起课都是与天地的感应'}
                        </p>
                        <Link href="/qimen" className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20 font-medium text-sm">
                            开始起课
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredCharts.map(chart => {
                            const sourceData = chart.conversation?.source_data;
                            const modelId = typeof sourceData?.model_id === 'string' ? sourceData.model_id : null;
                            const modelName = modelId ? getModelName(modelId) : null;
                            return (
                                <div
                                    key={chart.id}
                                    className="group relative bg-background-secondary rounded-2xl p-5 border border-border hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-300 cursor-pointer flex flex-col"
                                    onClick={() => handleView(chart)}
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="px-2.5 py-1 text-xs font-medium rounded-lg bg-indigo-500/10 text-indigo-500 border border-indigo-500/10">
                                            {getDunLabel(chart.dun_type, chart.ju_number)}
                                        </span>
                                        <span className="text-xs text-foreground-tertiary font-mono">{formatDate(chart.created_at)}</span>
                                    </div>
                                    {modelName && (
                                        <div className="mb-3">
                                            <span className="text-[10px] text-foreground-secondary px-2 py-0.5 rounded-md bg-background border border-border inline-block">
                                                {modelName}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex-1">
                                        {chart.question && (
                                            <p className="text-xs text-foreground-secondary line-clamp-2">{chart.question}</p>
                                        )}
                                    </div>
                                    <div className="pt-3 mt-4 border-t border-border flex items-center justify-between opacity-60 group-hover:opacity-100 transition-opacity">
                                        <div className="text-xs text-foreground-secondary flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            查看详情
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button type="button" onClick={e => { e.stopPropagation(); setKbTarget(chart); setKbModalOpen(true); }}
                                                className="p-1.5 rounded-lg hover:bg-indigo-500/10 text-foreground-secondary hover:text-indigo-500 transition-colors" title="加入知识库">
                                                <BookOpenText className="w-4 h-4" />
                                            </button>
                                            <button type="button" onClick={e => { e.stopPropagation(); setDeleteConfirmId(chart.id); }}
                                                className="p-1.5 rounded-lg hover:bg-red-500/10 text-foreground-secondary hover:text-red-500 transition-colors" title="删除">
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
                        <p className="text-foreground-secondary mb-6 text-center text-sm">确定要删除这条排盘记录吗？此操作无法撤销。</p>
                        <div className="flex gap-3 justify-center">
                            <button onClick={() => setDeleteConfirmId(null)} className="px-5 py-2.5 rounded-xl border border-border hover:bg-background-secondary transition-colors text-sm font-medium">取消</button>
                            <button onClick={() => handleDelete(deleteConfirmId)} className="px-5 py-2.5 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors text-sm font-medium shadow-lg shadow-red-500/20">确认删除</button>
                        </div>
                    </div>
                </div>
            )}

            {kbTarget && (
                <AddToKnowledgeBaseModal
                    open={kbModalOpen}
                    onClose={() => { setKbModalOpen(false); setKbTarget(null); }}
                    sourceTitle={kbTarget.question || '奇门遁甲排盘'}
                    sourceType="qimen_chart"
                    sourceId={kbTarget.id}
                />
            )}
        </div>
    );
}
