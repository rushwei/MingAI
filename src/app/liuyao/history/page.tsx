'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Calendar, Trash2, Loader2, Search, MessageSquare, BookOpenText, Dices, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { writeSessionJSON } from '@/lib/cache';
import { findHexagram } from '@/lib/liuyao';
import { getModelName } from '@/lib/ai-config';
import { AddToKnowledgeBaseModal } from '@/components/knowledge-base/AddToKnowledgeBaseModal';

interface LiuyaoDivination {
    id: string;
    question: string;
    hexagram_code: string;
    changed_hexagram_code: string | null;
    changed_lines: number[] | null;
    conversation_id?: string | null;
    conversation?: { source_data?: Record<string, unknown> } | null;
    created_at: string;
}

export default function LiuyaoHistoryPage() {
    const router = useRouter();
    const [divinations, setDivinations] = useState<LiuyaoDivination[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [kbModalOpen, setKbModalOpen] = useState(false);
    const [kbTarget, setKbTarget] = useState<LiuyaoDivination | null>(null);

    const loadDivinations = useCallback(async () => {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
            router.push('/liuyao');
            return;
        }

        const { data, error } = await supabase
            .from('liuyao_divinations')
            .select('*, conversation:conversations(source_data)')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) {
            console.error('加载历史记录失败:', error);
        } else {
            setDivinations(data || []);
        }
        setLoading(false);
    }, [router]);

    useEffect(() => {
        const timer = setTimeout(() => {
            void loadDivinations();
        }, 0);
        return () => clearTimeout(timer);
    }, [loadDivinations]);

    const handleDelete = async (id: string) => {
        const target = divinations.find(d => d.id === id);
        const { error } = await supabase
            .from('liuyao_divinations')
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
            setDivinations(prev => prev.filter(d => d.id !== id));
            window.dispatchEvent(new CustomEvent('mingai:data-index:invalidate', { detail: { types: ['liuyao_divination'] } }));
        }
        setDeleteConfirmId(null);
    };

    const getHexagramName = (code: string): string => {
        try {
            const hexagram = findHexagram(code);
            return hexagram?.name || code;
        } catch {
            return code;
        }
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

    const filteredDivinations = divinations.filter(d => {
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();
        return (
            d.question.toLowerCase().includes(query) ||
            getHexagramName(d.hexagram_code).toLowerCase().includes(query)
        );
    });

    const handleView = (div: LiuyaoDivination) => {
        const hexagramCode = div.hexagram_code || '';
        const changedLines = div.changed_lines || [];
        const yaos = hexagramCode.split('').map((char, idx) => ({
            type: parseInt(char, 10) as 0 | 1,
            change: changedLines.includes(idx + 1) ? 'changing' : 'stable' as const,
            position: idx + 1,
        }));

        const hexagram = findHexagram(hexagramCode);
        const changedHexagram = div.changed_hexagram_code
            ? findHexagram(div.changed_hexagram_code)
            : undefined;

        const sessionData = {
            question: div.question,
            yaos,
            hexagram,
            changedHexagram,
            changedLines,
            divinationId: div.id,
            createdAt: div.created_at,
            conversationId: div.conversation_id || null,
        };

        writeSessionJSON('liuyao_result', sessionData);
        router.push('/liuyao/result');
    };

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-6xl mx-auto px-4 py-8">
                {/* 头部 */}
                <div className="flex items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/liuyao"
                            className="p-2 rounded-xl hover:bg-background-secondary transition-colors border border-transparent hover:border-border"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold flex items-center gap-2">
                                <Dices className="w-6 h-6 text-emerald-500" />
                                六爻起卦历史
                            </h1>
                            <p className="text-foreground-secondary text-sm mt-1">
                                易经六十四卦，指引人生方向
                            </p>
                        </div>
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
                            placeholder="搜索问题或卦名..."
                            className="w-full pl-9 pr-4 py-2 rounded-xl bg-background border-none focus:outline-none focus:ring-2 focus:ring-accent/20 text-sm placeholder:text-foreground-tertiary"
                        />
                    </div>
                </div>

                {/* 列表 */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-accent" />
                        <span className="text-foreground-secondary">加载中...</span>
                    </div>
                ) : filteredDivinations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-background-secondary/30 rounded-3xl border border-border border-dashed">
                        <div className="w-16 h-16 rounded-full bg-background-secondary flex items-center justify-center mb-4">
                            <MessageSquare className="w-8 h-8 text-foreground-tertiary" />
                        </div>
                        <h3 className="text-lg font-medium mb-1">
                            {searchQuery ? '未找到匹配的记录' : '暂无历史记录'}
                        </h3>
                        <p className="text-sm text-foreground-secondary mb-6 text-center max-w-xs">
                            {searchQuery ? '换个关键词试试看' : '每一次起卦都是与天地的感应，现在的空白也许是为了更好的开始'}
                        </p>
                        <Link
                            href="/liuyao"
                            className="px-6 py-2.5 bg-accent text-white rounded-xl hover:bg-accent/90 transition-all shadow-lg shadow-accent/20 font-medium text-sm"
                        >
                            开始起卦
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredDivinations.map(div => {
                            const sourceData = div.conversation?.source_data;
                            const modelId = typeof sourceData?.model_id === 'string' ? sourceData.model_id : null;
                            const modelName = modelId ? getModelName(modelId) : null;
                            return (
                                <div
                                    key={div.id}
                                    className="group relative bg-background-secondary rounded-2xl p-5 border border-border hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300 cursor-pointer flex flex-col"
                                    onClick={() => handleView(div)}
                                >
                                    {/* 顶部标签 */}
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <span className="px-2.5 py-1 text-xs font-medium rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/10">
                                                {getHexagramName(div.hexagram_code)}
                                            </span>
                                            {div.changed_hexagram_code && (
                                                <>
                                                    <ArrowRight className="w-3 h-3 text-foreground-tertiary" />
                                                    <span className="px-2.5 py-1 text-xs font-medium rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/10">
                                                        {getHexagramName(div.changed_hexagram_code)}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                        <span className="text-xs text-foreground-tertiary font-mono">
                                            {formatDate(div.created_at)}
                                        </span>
                                    </div>

                                    {/* 问题 */}
                                    <h3 className="text-base font-semibold mb-3 line-clamp-2 group-hover:text-emerald-500 transition-colors">
                                        {div.question || '无特定问题'}
                                    </h3>

                                    {/* 底部信息 */}
                                    <div className="flex-1">
                                        {div.changed_lines && div.changed_lines.length > 0 && (
                                            <p className="text-xs text-foreground-secondary bg-background/50 px-2 py-1 rounded-md inline-block">
                                                变爻：{div.changed_lines.map(l => `第${l}爻`).join('、')}
                                            </p>
                                        )}
                                        {modelName && (
                                            <div className="mt-2">
                                                <span className="text-[10px] text-foreground-secondary px-2 py-0.5 rounded-md bg-background border border-border inline-block">
                                                    {modelName}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* 底部操作栏 - 默认隐藏，hover显示 */}
                                    <div className="pt-3 mt-4 border-t border-border flex items-center justify-between opacity-60 group-hover:opacity-100 transition-opacity">
                                        <div className="text-xs text-foreground-secondary flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            查看详情
                                        </div>
                                        
                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    setKbTarget(div);
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
                                                    setDeleteConfirmId(div.id);
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
                            确定要删除这条起卦记录吗？此操作无法撤销。
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
                    sourceTitle={kbTarget.question || '六爻占卜'}
                    sourceType="liuyao_divination"
                    sourceId={kbTarget.id}
                />
            )}
        </div>
    );
}
