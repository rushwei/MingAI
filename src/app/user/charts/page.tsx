/**
 * 我的命盘管理页面
 */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    Plus,
    Trash2,
    Eye,
    Loader2,
    Orbit,
    User as UserIcon,
    Calendar
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface BaziChart {
    id: string;
    name: string;
    gender: 'male' | 'female' | null;
    birth_date: string;
    birth_time: string | null;
    birth_place: string | null;
    created_at: string;
}

export default function ChartsPage() {
    const router = useRouter();
    const [charts, setCharts] = useState<BaziChart[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState<string | null>(null);

    useEffect(() => {
        fetchCharts();
    }, []);

    const fetchCharts = async () => {
        // 使用 getSession 从本地缓存读取
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user) {
            router.push('/user');
            return;
        }

        const { data, error } = await supabase
            .from('bazi_charts')
            .select('*')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false });

        if (!error && data) {
            setCharts(data);
        }
        setLoading(false);
    };

    const handleDelete = async (chartId: string) => {
        if (!confirm('确定要删除这个命盘吗？此操作无法撤销。')) {
            return;
        }

        setDeleting(chartId);

        const { error } = await supabase
            .from('bazi_charts')
            .delete()
            .eq('id', chartId);

        if (!error) {
            setCharts(charts.filter(c => c.id !== chartId));
        }
        setDeleting(null);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('zh-CN');
    };

    const getGenderLabel = (gender: string | null) => {
        if (gender === 'male') return '男';
        if (gender === 'female') return '女';
        return '未知';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto px-4 py-8 animate-fade-in">
            {/* 头部 */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.back()}
                        className="p-2 rounded-lg hover:bg-background-secondary transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="text-xl font-bold">我的命盘</h1>
                </div>
                <button
                    onClick={() => router.push('/bazi')}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-white font-medium hover:bg-accent/90 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    新建命盘
                </button>
            </div>

            {/* 命盘列表 */}
            {charts.length === 0 ? (
                <div className="text-center py-16">
                    <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                        <Orbit className="w-8 h-8 text-accent" />
                    </div>
                    <p className="text-foreground-secondary mb-4">暂无保存的命盘</p>
                    <button
                        onClick={() => router.push('/bazi')}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-accent text-white font-medium hover:bg-accent/90 transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                        创建第一个命盘
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {charts.map((chart) => (
                        <div
                            key={chart.id}
                            className="bg-background-secondary rounded-xl p-4 border border-border"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                                        <Orbit className="w-6 h-6 text-accent" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg">{chart.name}</h3>
                                        <div className="flex items-center gap-3 text-sm text-foreground-secondary mt-1">
                                            <span className="flex items-center gap-1">
                                                <UserIcon className="w-3 h-3" />
                                                {getGenderLabel(chart.gender)}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {formatDate(chart.birth_date)}
                                                {chart.birth_time && ` ${chart.birth_time}`}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => router.push(`/bazi/result?chart=${chart.id}`)}
                                        className="p-2 rounded-lg text-accent hover:bg-accent/10 transition-colors"
                                        title="查看详情"
                                    >
                                        <Eye className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(chart.id)}
                                        disabled={deleting === chart.id}
                                        className="p-2 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                                        title="删除"
                                    >
                                        {deleting === chart.id ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <Trash2 className="w-5 h-5" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {chart.birth_place && (
                                <div className="mt-3 pt-3 border-t border-border text-sm text-foreground-secondary">
                                    出生地: {chart.birth_place}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
