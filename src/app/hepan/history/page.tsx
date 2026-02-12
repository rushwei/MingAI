/**
 * 合盘历史记录页面
 *
 * 'use client' 标记说明：
 * - 使用 React hooks (useState, useEffect, useCallback)
 * - 使用 useRouter 进行客户端导航
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Trash2, Search, MessageSquare, Heart, Briefcase, Users, Clock, BookOpenText } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { writeSessionJSON } from '@/lib/cache';
import { getModelName } from '@/lib/ai/ai-config';
import { AddToKnowledgeBaseModal } from '@/components/knowledge-base/AddToKnowledgeBaseModal';

interface HepanChart {
    id: string;
    type: 'love' | 'business' | 'family';
    person1_name: string;
    person1_birth: { year: number; month: number; day: number };
    person2_name: string;
    person2_birth: { year: number; month: number; day: number };
    compatibility_score: number | null;
    conversation_id?: string | null;
    conversation?: { source_data?: Record<string, unknown> } | null;
    result_data?: Record<string, unknown> | null;
    created_at: string;
}

const TYPE_CONFIG = {
    love: {
        label: '情侣合盘',
        icon: Heart,
        color: 'text-rose-500',
        bg: 'bg-rose-500',
        border: 'group-hover:border-rose-500/50',
        badge: 'bg-rose-500/10 text-rose-500'
    },
    business: {
        label: '商业合伙',
        icon: Briefcase,
        color: 'text-blue-500',
        bg: 'bg-blue-500',
        border: 'group-hover:border-blue-500/50',
        badge: 'bg-blue-500/10 text-blue-500'
    },
    family: {
        label: '亲子关系',
        icon: Users,
        color: 'text-emerald-500',
        bg: 'bg-emerald-500',
        border: 'group-hover:border-emerald-500/50',
        badge: 'bg-emerald-500/10 text-emerald-500'
    },
};

export default function HepanHistoryPage() {
    const router = useRouter();
    const [charts, setCharts] = useState<HepanChart[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [kbModalOpen, setKbModalOpen] = useState(false);
    const [kbTarget, setKbTarget] = useState<HepanChart | null>(null);

    const loadCharts = useCallback(async () => {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
            router.push('/hepan');
            return;
        }

        const { data, error } = await supabase
            .from('hepan_charts')
            .select('*, conversation:conversations(source_data)')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) {
            console.error('加载历史记录失败:', error);
        } else {
            setCharts(data || []);
        }
        setLoading(false);
    }, [router]);

    useEffect(() => {
        const timer = setTimeout(() => {
            void loadCharts();
        }, 0);
        return () => clearTimeout(timer);
    }, [loadCharts]);

    const handleDelete = async (id: string) => {
        const target = charts.find(c => c.id === id);
        const { error } = await supabase
            .from('hepan_charts')
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
            setCharts(prev => prev.filter(c => c.id !== id));
            window.dispatchEvent(new CustomEvent('mingai:data-index:invalidate', { detail: { types: ['hepan_chart'] } }));
        }
        setDeleteConfirmId(null);
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        });
    };

    const formatBirth = (birth: { year: number; month: number; day: number }) => {
        return `${birth.year}.${birth.month}.${birth.day}`;
    };

    const filteredCharts = charts.filter(c => {
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();
        return (
            c.person1_name.toLowerCase().includes(query) ||
            c.person2_name.toLowerCase().includes(query) ||
            TYPE_CONFIG[c.type].label.toLowerCase().includes(query)
        );
    });

    const handleView = async (chart: HepanChart) => {
        if (chart.result_data) {
            const resultWithId = {
                ...(chart.result_data as object),
                chartId: chart.id,
                conversationId: chart.conversation_id || null,
            };
            writeSessionJSON('hepan_result', resultWithId);
            router.push('/hepan/result');
            return;
        }

        const { analyzeCompatibility } = await import('@/lib/divination/hepan');
        const birth1 = chart.person1_birth as { year: number; month: number; day: number; hour: number };
        const birth2 = chart.person2_birth as { year: number; month: number; day: number; hour: number };
        const person1 = {
            name: chart.person1_name,
            ...birth1,
        };
        const person2 = {
            name: chart.person2_name,
            ...birth2,
        };
        const result = analyzeCompatibility(person1, person2, chart.type);
        const resultWithId = {
            ...result,
            chartId: chart.id,
            conversationId: chart.conversation_id || null,
        };
        writeSessionJSON('hepan_result', resultWithId);
        router.push('/hepan/result');
    };

    return (
        <div className="min-h-screen bg-background">
            {/* 背景装饰 */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]" />
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-rose-500/5 rounded-full blur-[100px] translate-x-1/2 -translate-y-1/2" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[100px] -translate-x-1/2 translate-y-1/2" />
            </div>

            <div className="max-w-4xl mx-auto px-4 sm:py-8 py-4 relative z-10 animate-fade-in">
                {/* 头部 - 仅桌面端显示 */}
                <div className="hidden md:flex items-center gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">合盘分析历史</h1>
                        <p className="text-foreground-secondary text-sm mt-1">
                            查看您的历史合盘记录
                        </p>
                    </div>
                </div>

                {/* 搜索框 */}
                <div className="relative mb-8 group">
                    <div className="absolute inset-0 bg-gradient-to-r from-rose-500/5 via-purple-500/5 to-indigo-500/5 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-secondary" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="搜索姓名或类型..."
                            className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10
                                text-foreground placeholder:text-foreground-secondary/40
                                focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                        />
                    </div>
                </div>

                {/* 列表 */}
                {loading ? (
                    <div className="grid gap-4">
                        {/* 骨架屏 - 模拟合盘记录卡片 */}
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="bg-white/5 backdrop-blur-md rounded-2xl p-5 border border-white/10">
                                <div className="flex items-start gap-5">
                                    {/* 图标骨架 */}
                                    <div className="w-12 h-12 rounded-2xl bg-foreground/10 animate-pulse shrink-0" />
                                    <div className="flex-1 min-w-0 pt-1">
                                        {/* 标题骨架 */}
                                        <div className="flex items-center justify-between gap-4 mb-2">
                                            <div className="h-6 w-40 rounded bg-foreground/10 animate-pulse" />
                                            <div className="h-6 w-20 rounded-full bg-foreground/10 animate-pulse" />
                                        </div>
                                        {/* 生日信息骨架 */}
                                        <div className="flex gap-4 mb-4">
                                            <div className="h-4 w-24 rounded bg-foreground/5 animate-pulse" />
                                            <div className="h-4 w-24 rounded bg-foreground/5 animate-pulse" />
                                        </div>
                                        {/* 底部信息骨架 */}
                                        <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                                            <div className="h-4 w-20 rounded bg-foreground/5 animate-pulse" />
                                            <div className="h-6 w-16 rounded bg-foreground/10 animate-pulse" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filteredCharts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 shadow-xl backdrop-blur-sm">
                            <MessageSquare className="w-10 h-10 text-foreground-tertiary" />
                        </div>
                        <h3 className="text-lg font-medium text-foreground mb-2">
                            {searchQuery ? '未找到匹配的记录' : '暂无历史记录'}
                        </h3>
                        <p className="text-foreground-secondary mb-8 max-w-xs mx-auto">
                            {searchQuery ? '换个关键词试试看吧' : '开始您的第一次合盘分析，探索人际关系的奥秘'}
                        </p>
                        {!searchQuery && (
                            <Link
                                href="/hepan"
                                className="px-8 py-3 bg-accent text-white rounded-xl font-medium hover:bg-accent/90 transition-all hover:scale-105 shadow-lg shadow-accent/20"
                            >
                                开始分析
                            </Link>
                        )}
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {filteredCharts.map(chart => {
                            const config = TYPE_CONFIG[chart.type];
                            const Icon = config.icon;
                            const sourceData = chart.conversation?.source_data;
                            const modelId = typeof sourceData?.model_id === 'string' ? sourceData.model_id : null;
                            const modelName = modelId ? getModelName(modelId) : null;

                            return (
                                <div
                                    key={chart.id}
                                    className={`group relative bg-white/5 backdrop-blur-md rounded-2xl p-5 border border-white/10
                                        hover:bg-white/10 hover:shadow-xl transition-all duration-300 cursor-pointer ${config.border}`}
                                    onClick={() => handleView(chart)}
                                >
                                    <div className="flex items-start gap-5">
                                        {/* 图标 */}
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0
                                            ${config.bg} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                                            <Icon className="w-6 h-6 text-white" />
                                        </div>

                                        <div className="flex-1 min-w-0 pt-1">
                                            <div className="flex items-center justify-between gap-4 mb-2">
                                                <h3 className="text-lg font-bold text-foreground truncate flex items-center gap-2">
                                                    {chart.person1_name}
                                                    <span className="text-foreground-secondary/40 text-sm font-normal">&</span>
                                                    {chart.person2_name}
                                                </h3>
                                                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${config.badge}`}>
                                                    {config.label}
                                                </span>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-foreground-secondary">
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-1 h-1 rounded-full bg-foreground-secondary/40" />
                                                    <span>{formatBirth(chart.person1_birth)}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-1 h-1 rounded-full bg-foreground-secondary/40" />
                                                    <span>{formatBirth(chart.person2_birth)}</span>
                                                </div>
                                            </div>

                                            <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
                                                <div className="flex items-center gap-3">
                                                    <span className="flex items-center gap-1.5 text-xs text-foreground-tertiary">
                                                        <Clock className="w-3.5 h-3.5" />
                                                        {formatDate(chart.created_at)}
                                                    </span>
                                                    {modelName && (
                                                        <span className="text-xs px-2 py-0.5 rounded-md bg-white/5 text-foreground-secondary border border-white/5">
                                                            {modelName}
                                                        </span>
                                                    )}
                                                </div>

                                                {chart.compatibility_score !== null && (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm text-foreground-secondary">契合度</span>
                                                        <span className={`text-lg font-bold ${config.color}`}>
                                                            {chart.compatibility_score}%
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                type="button"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    setKbTarget(chart);
                                                    setKbModalOpen(true);
                                                }}
                                                className="p-2 rounded-xl text-foreground-tertiary hover:text-emerald-500 hover:bg-emerald-500/10 transition-colors"
                                                title="加入知识库"
                                            >
                                                <BookOpenText className="w-4.5 h-4.5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    setDeleteConfirmId(chart.id);
                                                }}
                                                className="p-2 rounded-xl text-foreground-tertiary hover:text-red-500 hover:bg-red-500/10 transition-colors"
                                                title="删除记录"
                                            >
                                                <Trash2 className="w-4.5 h-4.5" />
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
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteConfirmId(null)} />
                    <div className="relative bg-background/95 backdrop-blur-xl rounded-2xl border border-border shadow-2xl p-6 max-w-sm w-full animate-in zoom-in-95">
                        <h3 className="text-lg font-bold text-foreground mb-2">确认删除</h3>
                        <p className="text-foreground-secondary mb-6">
                            确定要删除这条合盘记录吗？此操作无法撤销。
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="px-5 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-foreground-secondary transition-colors"
                            >
                                取消
                            </button>
                            <button
                                onClick={() => handleDelete(deleteConfirmId)}
                                className="px-5 py-2.5 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
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
                    sourceTitle={`${kbTarget.person1_name} × ${kbTarget.person2_name}`}
                    sourceType="hepan_chart"
                    sourceId={kbTarget.id}
                />
            )}
        </div>
    );
}
