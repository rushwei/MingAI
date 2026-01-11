'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Calendar, Trash2, Loader2, Search, MessageSquare, Heart, Briefcase, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface HepanChart {
    id: string;
    type: 'love' | 'business' | 'family';
    person1_name: string;
    person1_birth: { year: number; month: number; day: number };
    person2_name: string;
    person2_birth: { year: number; month: number; day: number };
    compatibility_score: number | null;
    conversation_id?: string | null;
    created_at: string;
}

const TYPE_CONFIG = {
    love: { label: '情侣合盘', icon: Heart, color: 'text-rose-500', bg: 'bg-rose-500/10' },
    business: { label: '商业合伙', icon: Briefcase, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    family: { label: '亲子关系', icon: Users, color: 'text-amber-500', bg: 'bg-amber-500/10' },
};

export default function HepanHistoryPage() {
    const router = useRouter();
    const [charts, setCharts] = useState<HepanChart[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    useEffect(() => {
        loadCharts();
    }, []);

    const loadCharts = async () => {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
            router.push('/hepan');
            return;
        }

        const { data, error } = await supabase
            .from('hepan_charts')
            .select('*')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) {
            console.error('加载历史记录失败:', error);
        } else {
            setCharts(data || []);
        }
        setLoading(false);
    };

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

    const formatBirth = (birth: { year: number; month: number; day: number }) => {
        return `${birth.year}年${birth.month}月${birth.day}日`;
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

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-4xl mx-auto px-4 py-8">
                {/* 头部 */}
                <div className="flex items-center gap-4 mb-8">
                    <Link
                        href="/hepan"
                        className="p-2 rounded-lg hover:bg-background-secondary transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold">合盘分析历史</h1>
                        <p className="text-foreground-secondary text-sm mt-1">
                            查看您的历史合盘记录
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
                        placeholder="搜索姓名或类型..."
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-background-secondary border border-border focus:outline-none focus:ring-2 focus:ring-accent/30"
                    />
                </div>

                {/* 列表 */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-accent" />
                        <span className="text-foreground-secondary">加载中...</span>
                    </div>
                ) : filteredCharts.length === 0 ? (
                    <div className="text-center py-16">
                        <MessageSquare className="w-12 h-12 mx-auto mb-4 text-foreground-tertiary" />
                        <p className="text-foreground-secondary">
                            {searchQuery ? '未找到匹配的记录' : '暂无历史记录'}
                        </p>
                        <Link
                            href="/hepan"
                            className="inline-block mt-4 px-6 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
                        >
                            开始分析
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredCharts.map(chart => {
                            const config = TYPE_CONFIG[chart.type];
                            const Icon = config.icon;
                            return (
                                <div
                                    key={chart.id}
                                    className="bg-background-secondary rounded-xl p-4 border border-border hover:border-accent/30 transition-colors"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className={`flex items-center gap-1 px-2 py-0.5 text-xs rounded-full ${config.bg} ${config.color}`}>
                                                    <Icon className="w-3 h-3" />
                                                    {config.label}
                                                </span>
                                                {chart.compatibility_score !== null && (
                                                    <span className="px-2 py-0.5 text-xs rounded-full bg-accent/10 text-accent font-medium">
                                                        契合度 {chart.compatibility_score}%
                                                    </span>
                                                )}
                                                <span className="flex items-center gap-1 text-xs text-foreground-secondary ml-auto">
                                                    <Calendar className="w-3 h-3" />
                                                    {formatDate(chart.created_at)}
                                                </span>
                                            </div>
                                            <p className="text-sm font-medium">
                                                {chart.person1_name} & {chart.person2_name}
                                            </p>
                                            <div className="flex flex-wrap gap-2 mt-1 text-xs text-foreground-secondary">
                                                <span>{chart.person1_name}: {formatBirth(chart.person1_birth)}</span>
                                                <span>|</span>
                                                <span>{chart.person2_name}: {formatBirth(chart.person2_birth)}</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setDeleteConfirmId(chart.id)}
                                            className="p-2 rounded-lg hover:bg-red-500/10 text-foreground-secondary hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
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
                            确定要删除这条合盘记录吗？此操作无法撤销。
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
