/**
 * 我的命盘管理页面
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    Plus,
    Trash2,
    Eye,
    Loader2,
    Orbit,
    User as UserIcon,
    Calendar,
    Star,
    StarOff
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

interface BaziChart {
    id: string;
    name: string;
    gender: 'male' | 'female' | null;
    birth_date: string;
    birth_time: string | null;
    birth_place: string | null;
    created_at: string;
}

interface ZiweiChart {
    id: string;
    name: string;
    gender: 'male' | 'female' | null;
    birth_date: string;
    birth_time: string | null;
    birth_place: string | null;
    calendar_type: string | null;
    created_at: string;
}

interface DeleteTarget {
    kind: 'bazi' | 'ziwei';
    chartId: string;
    chartName: string;
}

export default function ChartsPage() {
    const router = useRouter();
    const [baziCharts, setBaziCharts] = useState<BaziChart[]>([]);
    const [ziweiCharts, setZiweiCharts] = useState<ZiweiChart[]>([]);
    const [loading, setLoading] = useState(true);
    const [deletingKey, setDeletingKey] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
    // Stores user id for default chart persistence.
    const [userId, setUserId] = useState<string | null>(null);

    // 默认命盘状态
    const [defaultBaziId, setDefaultBaziId] = useState<string | null>(null);
    const [defaultZiweiId, setDefaultZiweiId] = useState<string | null>(null);

    // 设置默认命盘（只能设置一个，设置任一类型时清除另一类型）
    const setDefaultChart = async (kind: 'bazi' | 'ziwei', chartId: string) => {
        if (!userId) return;
        const prevBaziId = defaultBaziId;
        const prevZiweiId = defaultZiweiId;
        const nextBaziId = kind === 'bazi' ? (defaultBaziId === chartId ? null : chartId) : null;
        const nextZiweiId = kind === 'ziwei' ? (defaultZiweiId === chartId ? null : chartId) : null;

        setDefaultBaziId(nextBaziId);
        setDefaultZiweiId(nextZiweiId);

        if (nextBaziId) {
            localStorage.setItem('defaultBaziChartId', nextBaziId);
        } else {
            localStorage.removeItem('defaultBaziChartId');
        }
        if (nextZiweiId) {
            localStorage.setItem('defaultZiweiChartId', nextZiweiId);
        } else {
            localStorage.removeItem('defaultZiweiChartId');
        }

        const { error } = await supabase
            .from('user_settings')
            .upsert({
                user_id: userId,
                default_bazi_chart_id: nextBaziId,
                default_ziwei_chart_id: nextZiweiId,
            }, { onConflict: 'user_id' });

        if (error) {
            console.error('更新默认命盘失败:', error);
            setDefaultBaziId(prevBaziId);
            setDefaultZiweiId(prevZiweiId);
            if (prevBaziId) {
                localStorage.setItem('defaultBaziChartId', prevBaziId);
            } else {
                localStorage.removeItem('defaultBaziChartId');
            }
            if (prevZiweiId) {
                localStorage.setItem('defaultZiweiChartId', prevZiweiId);
            } else {
                localStorage.removeItem('defaultZiweiChartId');
            }
        }
    };

    const fetchCharts = useCallback(async () => {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user) {
            router.push('/user');
            return;
        }
        setUserId(session.user.id);

        const [baziResult, ziweiResult, settingsResult] = await Promise.all([
            supabase
                .from('bazi_charts')
                .select('*')
                .eq('user_id', session.user.id)
                .order('created_at', { ascending: false }),
            supabase
                .from('ziwei_charts')
                .select('*')
                .eq('user_id', session.user.id)
                .order('created_at', { ascending: false }),
            supabase
                .from('user_settings')
                .select('default_bazi_chart_id, default_ziwei_chart_id')
                .eq('user_id', session.user.id)
                .maybeSingle(),
        ]);

        if (!baziResult.error && baziResult.data) {
            setBaziCharts(baziResult.data);
        }
        if (!ziweiResult.error && ziweiResult.data) {
            setZiweiCharts(ziweiResult.data);
        }
        if (!settingsResult.error) {
            const storedBaziId = localStorage.getItem('defaultBaziChartId');
            const storedZiweiId = localStorage.getItem('defaultZiweiChartId');
            const nextBaziId = settingsResult.data?.default_bazi_chart_id || storedBaziId || null;
            const nextZiweiId = settingsResult.data?.default_ziwei_chart_id || storedZiweiId || null;

            setDefaultBaziId(nextBaziId);
            setDefaultZiweiId(nextZiweiId);

            if (settingsResult.data?.default_bazi_chart_id) {
                localStorage.setItem('defaultBaziChartId', settingsResult.data.default_bazi_chart_id);
            } else if (!nextBaziId) {
                localStorage.removeItem('defaultBaziChartId');
            }

            if (settingsResult.data?.default_ziwei_chart_id) {
                localStorage.setItem('defaultZiweiChartId', settingsResult.data.default_ziwei_chart_id);
            } else if (!nextZiweiId) {
                localStorage.removeItem('defaultZiweiChartId');
            }

            if (!settingsResult.data && (storedBaziId || storedZiweiId)) {
                const { error } = await supabase
                    .from('user_settings')
                    .upsert({
                        user_id: session.user.id,
                        default_bazi_chart_id: storedBaziId,
                        default_ziwei_chart_id: storedZiweiId,
                    }, { onConflict: 'user_id' });
                if (error) {
                    console.error('迁移默认命盘失败:', error);
                }
            }
        }
        setLoading(false);
    }, [router]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchCharts();
    }, [fetchCharts]);

    const handleDeleteClick = (kind: 'bazi' | 'ziwei', chartId: string, chartName: string) => {
        setDeleteTarget({ kind, chartId, chartName });
    };

    const handleConfirmDelete = async () => {
        if (!deleteTarget) return;

        const { kind, chartId } = deleteTarget;
        const key = `${kind}:${chartId}`;
        setDeletingKey(key);

        const tableName = kind === 'bazi' ? 'bazi_charts' : 'ziwei_charts';
        const { error } = await supabase.from(tableName).delete().eq('id', chartId);

        if (!error) {
            if (kind === 'bazi') {
                setBaziCharts((prev) => prev.filter(c => c.id !== chartId));
                if (defaultBaziId === chartId) {
                    setDefaultBaziId(null);
                    localStorage.removeItem('defaultBaziChartId');
                    if (userId) {
                        await supabase
                            .from('user_settings')
                            .upsert({ user_id: userId, default_bazi_chart_id: null }, { onConflict: 'user_id' });
                    }
                }
            } else {
                setZiweiCharts((prev) => prev.filter(c => c.id !== chartId));
                if (defaultZiweiId === chartId) {
                    setDefaultZiweiId(null);
                    localStorage.removeItem('defaultZiweiChartId');
                    if (userId) {
                        await supabase
                            .from('user_settings')
                            .upsert({ user_id: userId, default_ziwei_chart_id: null }, { onConflict: 'user_id' });
                    }
                }
            }
        }
        setDeletingKey(null);
        setDeleteTarget(null);
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
                        onClick={() => router.push('/user')}
                        className="p-2 rounded-lg hover:bg-background-secondary transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="text-xl font-bold">我的命盘</h1>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => router.push('/bazi')}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-white font-medium hover:bg-accent/90 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        新建八字
                    </button>
                    <button
                        onClick={() => router.push('/ziwei')}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-foreground-secondary hover:text-foreground hover:border-accent/50 transition-colors"
                    >
                        <Star className="w-4 h-4" />
                        新建紫微
                    </button>
                </div>
            </div>

            {/* 命盘列表 */}
            {baziCharts.length === 0 && ziweiCharts.length === 0 ? (
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
                <div className="space-y-6">
                    {baziCharts.length > 0 && (
                        <div className="space-y-4">
                            <h2 className="text-sm font-medium text-foreground-secondary">八字命盘</h2>
                            {baziCharts.map((chart) => (
                                <div
                                    key={`bazi-${chart.id}`}
                                    className="bg-background-secondary rounded-xl p-4 border border-border"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                                                <Orbit className="w-6 h-6 text-accent" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-lg flex items-center gap-2">
                                                    {chart.name}
                                                    {defaultBaziId === chart.id && (
                                                        <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500">默认</span>
                                                    )}
                                                </h3>
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

                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => setDefaultChart('bazi', chart.id)}
                                                className={`p-2 rounded-lg transition-colors ${defaultBaziId === chart.id ? 'text-amber-500 hover:bg-amber-500/10' : 'text-foreground-secondary hover:bg-background'}`}
                                                title={defaultBaziId === chart.id ? '取消默认' : '设为默认'}
                                            >
                                                {defaultBaziId === chart.id ? <Star className="w-5 h-5 fill-current" /> : <StarOff className="w-5 h-5" />}
                                            </button>
                                            <button
                                                onClick={() => router.push(`/bazi/result?chart=${chart.id}`)}
                                                className="p-2 rounded-lg text-accent hover:bg-accent/10 transition-colors"
                                                title="查看详情"
                                            >
                                                <Eye className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteClick('bazi', chart.id, chart.name)}
                                                disabled={deletingKey === `bazi:${chart.id}`}
                                                className="p-2 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                                                title="删除"
                                            >
                                                {deletingKey === `bazi:${chart.id}` ? (
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

                    {ziweiCharts.length > 0 && (
                        <div className="space-y-4">
                            <h2 className="text-sm font-medium text-foreground-secondary">紫微命盘</h2>
                            {ziweiCharts.map((chart) => (
                                <div
                                    key={`ziwei-${chart.id}`}
                                    className="bg-background-secondary rounded-xl p-4 border border-border"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                                                <Star className="w-6 h-6 text-accent" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-lg flex items-center gap-2">
                                                    {chart.name}
                                                    {defaultZiweiId === chart.id && (
                                                        <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500">默认</span>
                                                    )}
                                                </h3>
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

                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => setDefaultChart('ziwei', chart.id)}
                                                className={`p-2 rounded-lg transition-colors ${defaultZiweiId === chart.id ? 'text-amber-500 hover:bg-amber-500/10' : 'text-foreground-secondary hover:bg-background'}`}
                                                title={defaultZiweiId === chart.id ? '取消默认' : '设为默认'}
                                            >
                                                {defaultZiweiId === chart.id ? <Star className="w-5 h-5 fill-current" /> : <StarOff className="w-5 h-5" />}
                                            </button>
                                            <button
                                                onClick={() => router.push(`/ziwei/result?chart=${chart.id}`)}
                                                className="p-2 rounded-lg text-accent hover:bg-accent/10 transition-colors"
                                                title="查看详情"
                                            >
                                                <Eye className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteClick('ziwei', chart.id, chart.name)}
                                                disabled={deletingKey === `ziwei:${chart.id}`}
                                                className="p-2 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                                                title="删除"
                                            >
                                                {deletingKey === `ziwei:${chart.id}` ? (
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
            )}

            {/* 删除确认弹窗 */}
            <ConfirmDialog
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleConfirmDelete}
                title="确认删除命盘"
                description={`确定要删除「${deleteTarget?.chartName || ''}」的${deleteTarget?.kind === 'bazi' ? '八字' : '紫微'}命盘吗？此操作无法撤销。`}
                confirmText="删除"
                cancelText="取消"
                variant="danger"
                loading={!!deletingKey}
            />
        </div>
    );
}
