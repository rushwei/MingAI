/**
 * 我的命盘页面
 *
 * 对齐 Notion 风格：极简列表、柔和边框、线性图标
 */
'use client';

import { useState, useEffect, type MouseEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Trash2, ScrollText, Star, MapPin, ChevronRight, Calendar } from 'lucide-react';
import { supabase } from '@/lib/auth';
import { writeLocalCache } from '@/lib/cache';
import { FeatureGate } from '@/components/layout/FeatureGate';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { deleteUserChart, getUserCharts, setDefaultUserChart } from '@/lib/user-charts';
import { getNavItemById } from '@/lib/navigation/registry';

type ChartType = 'bazi' | 'ziwei';

const CHART_NAV_ICONS = {
    bazi: getNavItemById('bazi')?.icon ?? ScrollText,
    ziwei: getNavItemById('ziwei')?.icon ?? Star,
} as const;

interface ChartItem {
    id: string;
    type: ChartType;
    name: string;
    gender: 'male' | 'female' | 'unknown';
    birth_date: string;
    birth_time: string | null;
    city: string | null;
    created_at: string;
    is_default: boolean;
}

const getGenderLabel = (gender: ChartItem['gender']) => {
    return gender === 'female' ? '女' : '男';
};

interface ChartListProps {
    title: string;
    list: ChartItem[];
    type: ChartType;
    onCreateLink: string;
    onCreateText: string;
    onDelete: (id: string, type: ChartType, e: MouseEvent<HTMLButtonElement>) => void;
    onSetDefault: (id: string, type: ChartType, e: MouseEvent<HTMLButtonElement>) => void;
}

function ChartList({
    title,
    list,
    type,
    onCreateLink,
    onCreateText,
    onDelete,
    onSetDefault,
}: ChartListProps) {
    const ChartIcon = CHART_NAV_ICONS[type];

    return (
        <section className="space-y-4">
            <div className="flex items-center justify-between px-1">
                <h2 className="text-[11px] font-semibold text-foreground/40 uppercase tracking-widest">
                    {title}
                </h2>
                <Link href={onCreateLink} className="text-xs font-medium text-[#2eaadc] hover:underline flex items-center gap-1">
                    <Plus className="w-3 h-3" />
                    {onCreateText}
                </Link>
            </div>

            {list.length > 0 ? (
                <div className="bg-background border border-gray-200 rounded-md overflow-hidden divide-y divide-gray-100">
                    {list.map((chart) => (
                        <Link
                            key={`${chart.type}-${chart.id}`}
                            href={chart.type === 'bazi' ? `/bazi/result?chart=${chart.id}` : `/ziwei/result?chart=${chart.id}`}
                            className="group flex items-center gap-4 p-4 transition-colors hover:bg-[#efedea]"
                        >
                            <div className="p-2 rounded shrink-0 text-foreground/60">
                                <ChartIcon className="w-5 h-5" />
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <h3 className="text-sm font-medium text-foreground truncate">{chart.name}</h3>
                                    <span className={`text-[10px] font-bold px-1 rounded uppercase tracking-wider ${chart.gender === 'female' ? 'text-pink-500/60' : 'text-blue-500/60'}`}>
                                        {getGenderLabel(chart.gender)}
                                    </span>
                                    {chart.is_default && (
                                        <span className="text-[10px] font-bold text-[#dfab01] bg-[#dfab01]/5 px-1.5 py-0.5 rounded border border-[#dfab01]/10 uppercase tracking-widest flex items-center gap-1">
                                            <Star className="w-2.5 h-2.5 fill-current" />
                                            DEFAULT
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-4 text-[11px] text-foreground/40">
                                    <span className="flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        {new Date(chart.birth_date).toLocaleDateString('zh-CN')} {chart.birth_time || ''}
                                    </span>
                                    {chart.city && (
                                        <span className="flex items-center gap-1">
                                            <MapPin className="w-3 h-3" />
                                            {chart.city}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {!chart.is_default && (
                                    <button
                                        onClick={(e) => onSetDefault(chart.id, chart.type, e)}
                                        className="p-1.5 rounded hover:bg-[#dfab01]/10 text-foreground/30 hover:text-[#dfab01] transition-colors"
                                        title="设为默认"
                                    >
                                        <Star className="w-3.5 h-3.5" />
                                    </button>
                                )}
                                <button
                                    onClick={(e) => onDelete(chart.id, chart.type, e)}
                                    className="p-1.5 rounded hover:bg-[#eb5757]/10 text-foreground/30 hover:text-[#eb5757] transition-colors"
                                    title="删除"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                                <ChevronRight className="w-4 h-4 text-foreground/20" />
                            </div>
                        </Link>
                    ))}
                </div>
            ) : (
                <div className="bg-background border border-dashed border-gray-200 rounded-md py-12 text-center">
                    <p className="text-sm text-foreground/40 mb-4">暂无{title}</p>
                    <Link
                        href={onCreateLink}
                        className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#2383e2] text-white text-xs font-medium rounded-md hover:bg-[#2383e2]/90 transition-colors"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        新建{title}
                    </Link>
                </div>
            )}
        </section>
    );
}

export default function ChartsPage() {
    return (
        <FeatureGate featureId="charts">
            <ChartsContent />
        </FeatureGate>
    );
}

function ChartsContent() {
    const router = useRouter();
    const [baziCharts, setBaziCharts] = useState<ChartItem[]>([]);
    const [ziweiCharts, setZiweiCharts] = useState<ChartItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [pendingDelete, setPendingDelete] = useState<{ id: string; type: ChartType } | null>(null);
    const { showToast } = useToast();

    useEffect(() => {
        const fetchCharts = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/login');
                return;
            }

            const { baziCharts: baziData, ziweiCharts: ziweiData, defaultChartIds } = await getUserCharts();

            const formatChart = (c: typeof baziData[number], type: ChartType, defaultId: string | null): ChartItem => ({
                id: c.id,
                type,
                name: c.name,
                gender: c.gender === 'male' || c.gender === 'female' ? c.gender : 'unknown',
                birth_date: c.birth_date,
                birth_time: c.birth_time,
                city: c.birth_place,
                created_at: c.created_at,
                is_default: c.id === defaultId
            });

            const parsedBazi = (baziData || []).map(c => formatChart(c, 'bazi', defaultChartIds.bazi))
                .sort((a, b) => (a.is_default ? -1 : b.is_default ? 1 : new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));

            const parsedZiwei = (ziweiData || []).map(c => formatChart(c, 'ziwei', defaultChartIds.ziwei))
                .sort((a, b) => (a.is_default ? -1 : b.is_default ? 1 : new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));

            setBaziCharts(parsedBazi);
            setZiweiCharts(parsedZiwei);
            setLoading(false);
        };

        fetchCharts();
    }, [router]);

    const handleDelete = async (id: string, type: ChartType) => {
        try {
            await deleteUserChart(type, id);
        } catch (error) {
            console.error('删除命盘失败:', error);
            showToast('error', '删除命盘失败');
            return;
        }

        setPendingDelete(null);

        if (type === 'bazi') {
            setBaziCharts(baziCharts.filter(c => c.id !== id));
        } else {
            setZiweiCharts(ziweiCharts.filter(c => c.id !== id));
        }
    };

    const handleSetDefault = async (id: string, type: ChartType, e: MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();

        // Optimistic update
        if (type === 'bazi') {
            setBaziCharts(baziCharts.map(c => ({ ...c, is_default: c.id === id })));
        } else {
            setZiweiCharts(ziweiCharts.map(c => ({ ...c, is_default: c.id === id })));
        }

        try {
            await setDefaultUserChart(type, id);
            if (type === 'bazi') {
                writeLocalCache('mingai.pref.defaultBaziChartId', id);
            }
        } catch (error) {
            console.error('设置默认命盘失败:', error);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background text-foreground pb-20 lg:pb-8">
                <div className="max-w-3xl mx-auto px-4 py-8 space-y-10">
                    <div className="space-y-2">
                        <div className="h-7 w-24 rounded bg-foreground/10 animate-pulse" />
                        <div className="h-4 w-40 rounded bg-foreground/5 animate-pulse" />
                    </div>
                    <div className="space-y-8">
                        {[1, 2].map(i => (
                            <div key={i} className="space-y-4">
                                <div className="h-4 w-20 rounded bg-foreground/10 animate-pulse mb-2" />
                                <div className="bg-background border border-gray-200 rounded-md overflow-hidden divide-y divide-gray-100">
                                    {[1, 2].map(j => (
                                        <div key={j} className="p-4 flex gap-4 animate-pulse">
                                            <div className="w-8 h-8 rounded bg-foreground/10" />
                                            <div className="flex-1 space-y-2">
                                                <div className="h-4 w-32 rounded bg-foreground/10" />
                                                <div className="h-3 w-48 rounded bg-foreground/5" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground pb-20 lg:pb-8">
            <div className="max-w-3xl mx-auto px-4 py-8 animate-fade-in space-y-10">
                {/* 标题 */}
                <header className="space-y-1">
                    <h1 className="text-2xl font-bold">我的命盘</h1>
                </header>

                <div className="space-y-12">
                    <ChartList
                        title="八字命盘"
                        list={baziCharts}
                        type="bazi"
                        onCreateLink="/bazi"
                        onCreateText="新建八字"
                        onDelete={(id, type, e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setPendingDelete({ id, type });
                        }}
                        onSetDefault={handleSetDefault}
                    />

                    <ChartList
                        title="紫微命盘"
                        list={ziweiCharts}
                        type="ziwei"
                        onCreateLink="/ziwei"
                        onCreateText="新建紫微"
                        onDelete={(id, type, e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setPendingDelete({ id, type });
                        }}
                        onSetDefault={handleSetDefault}
                    />
                </div>
            </div>

            <ConfirmDialog
                isOpen={!!pendingDelete}
                onClose={() => setPendingDelete(null)}
                onConfirm={() => pendingDelete
                    ? handleDelete(pendingDelete.id, pendingDelete.type)
                    : undefined}
                title="确认删除"
                description="确定要删除这个命盘吗？此操作无法撤销。"
                confirmText="确认删除"
                variant="danger"
            />
        </div>
    );
}
