/**
 * 命盘管理页面
 *
 * 'use client' 标记说明：
 * - 使用 React hooks (useState, useEffect)
 * - 使用 useRouter 进行客户端导航
 */
'use client';

import { useState, useEffect, type MouseEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Trash2, ScrollText, Star, MapPin, ChevronRight, Calendar } from 'lucide-react';
import { supabase } from '@/lib/auth';
import { writeLocalCache } from '@/lib/cache';
import { FeatureGate } from '@/components/layout/FeatureGate';
import { deleteUserChart, getUserCharts, setDefaultUserChart } from '@/lib/user-charts';

type ChartType = 'bazi' | 'ziwei';

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

const getChartIcon = (type: ChartType) => {
    if (type === 'bazi') {
        return (
            <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border border-orange-100 dark:border-orange-900/30">
                <ScrollText className="w-5 h-5" />
            </div>
        );
    }
    return (
        <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-900/30">
            <Star className="w-5 h-5" />
        </div>
    );
};

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
    return (
        <div className="sm:mb-8 mb-4">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                    {type === 'bazi' ? <span className="w-1.5 h-6 rounded-full bg-orange-500 block" /> : <span className="w-1.5 h-6 rounded-full bg-purple-500 block" />}
                    {title}
                </h2>
                <Link href={onCreateLink} className="text-sm font-medium text-accent hover:underline flex items-center gap-1">
                    <Plus className="w-4 h-4" />
                    {onCreateText}
                </Link>
            </div>

            {list.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                    {list.map((chart) => (
                        <Link
                            key={`${chart.type}-${chart.id}`}
                            href={chart.type === 'bazi' ? `/bazi/result?chart=${chart.id}` : `/ziwei/result?chart=${chart.id}`}
                            className={`
                                group relative bg-background rounded-2xl p-5 border transition-all duration-300 min-h-[110px]
                                ${chart.is_default ? 'border-accent shadow-sm ring-1 ring-accent/10' : 'border-border hover:border-accent/30 hover:shadow-md'}
                            `}
                        >
                            {chart.is_default && (
                                <div className="absolute top-4 right-4 flex items-center gap-1 text-xs font-bold text-accent bg-accent/5 px-2 py-1 rounded-full border border-accent/10">
                                    <Star className="w-3 h-3 fill-current" />
                                    默认
                                </div>
                            )}

                            <div className="flex items-start gap-4">
                                {getChartIcon(chart.type)}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-bold text-base text-foreground truncate">{chart.name}</h3>
                                        <span className={`px-2 py-0.5 text-[10px] rounded-md font-medium border ${chart.gender === 'female' ? 'bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400 border-pink-100 dark:border-pink-900/30' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/30'}`}>
                                            {getGenderLabel(chart.gender)}
                                        </span>
                                    </div>
                                    <div className="text-xs text-foreground-secondary/80 space-y-1">
                                        <p className="flex items-center gap-1.5">
                                            <Calendar className="w-3 h-3 opacity-70" />
                                            {new Date(chart.birth_date).toLocaleDateString('zh-CN')} {chart.birth_time || '未知时辰'}
                                        </p>
                                        <p className="flex items-center gap-1.5">
                                            <MapPin className="w-3 h-3 opacity-70" />
                                            {chart.city || '未知地点'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons - Absolute positioned at bottom right */}
                            <div className="group-hover:opacity-100 transition-opacity absolute bottom-4 right-4 flex items-center gap-1 md:opacity-0">
                                {!chart.is_default && (
                                    <button
                                        onClick={(e) => onSetDefault(chart.id, chart.type, e)}
                                        className="p-2 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 text-foreground-secondary hover:text-amber-500 transition-colors"
                                        title="设为默认"
                                    >
                                        <Star className="w-4 h-4" />
                                    </button>
                                )}
                                <button
                                    onClick={(e) => onDelete(chart.id, chart.type, e)}
                                    className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-foreground-secondary hover:text-red-500 transition-colors"
                                    title="删除"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                                <div className="p-2 text-accent">
                                    <ChevronRight className="w-4 h-4" />
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            ) : (
                <div className="bg-background-secondary/50 rounded-2xl border border-dashed border-border text-center py-10">
                    <p className="text-sm text-foreground-secondary mb-4">暂无{title}</p>
                    <Link
                        href={onCreateLink}
                        className="inline-flex items-center gap-1 text-sm font-medium text-white bg-foreground/80 px-4 py-2 rounded-lg hover:bg-foreground transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        新建{title}
                    </Link>
                </div>
            )}
        </div>
    );
}

export default function ChartsPage() {
    const router = useRouter();
    const [baziCharts, setBaziCharts] = useState<ChartItem[]>([]);
    const [ziweiCharts, setZiweiCharts] = useState<ChartItem[]>([]);
    const [loading, setLoading] = useState(true);

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

    const handleDelete = async (id: string, type: ChartType, e: MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm('确定要删除这个命盘吗？')) return;

        try {
            await deleteUserChart(type, id);
        } catch (error) {
            console.error('删除命盘失败:', error);
            return;
        }

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

    return (
        <FeatureGate featureId="charts">
        <div className="md:min-h-screen bg-background">
            <div className="max-w-2xl mx-auto px-4 py-4 md:py-6 animate-fade-in">
                {/* 桌面端头部 */}
                <div className="hidden md:flex items-center justify-between mb-8 sticky top-0 bg-background/95 backdrop-blur-sm py-4 z-20 border-b border-transparent transition-all">
                    <div className="flex items-center gap-3">
                        <h1 className="text-xl font-bold">我的命盘</h1>
                    </div>
                </div>

                {loading ? (
                    <div className="space-y-8">
                        {[1, 2].map(i => (
                            <div key={i} className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="h-6 w-24 rounded bg-foreground/10 animate-pulse" />
                                    <div className="h-5 w-20 rounded bg-foreground/5 animate-pulse" />
                                </div>
                                <div className="bg-background rounded-2xl p-5 border border-border">
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-lg bg-foreground/10 animate-pulse" />
                                        <div className="flex-1 space-y-2">
                                            <div className="h-5 w-32 rounded bg-foreground/10 animate-pulse" />
                                            <div className="h-4 w-48 rounded bg-foreground/5 animate-pulse" />
                                            <div className="h-4 w-36 rounded bg-foreground/5 animate-pulse" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div>
                        <ChartList
                            title="八字命盘"
                            list={baziCharts}
                            type="bazi"
                            onCreateLink="/bazi"
                            onCreateText="新建八字"
                            onDelete={handleDelete}
                            onSetDefault={handleSetDefault}
                        />

                        <ChartList
                            title="紫微命盘"
                            list={ziweiCharts}
                            type="ziwei"
                            onCreateLink="/ziwei"
                            onCreateText="新建紫微"
                            onDelete={handleDelete}
                            onSetDefault={handleSetDefault}
                        />
                    </div>
                )}
            </div>
        </div>
        </FeatureGate>
    );
}
