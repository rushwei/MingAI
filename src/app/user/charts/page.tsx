'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, ScrollText, Star, MapPin, ChevronRight, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface ChartItem {
    id: string;
    type: 'bazi' | 'ziwei';
    name: string;
    gender: 'male' | 'female' | 'unknown';
    birth_date: string;
    birth_time: string | null;
    city: string | null;
    created_at: string;
    is_default: boolean;
}

export default function ChartsPage() {
    const router = useRouter();
    const [baziCharts, setBaziCharts] = useState<ChartItem[]>([]);
    const [ziweiCharts, setZiweiCharts] = useState<ChartItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        const fetchCharts = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/login');
                return;
            }
            setUserId(session.user.id);

            // Fetch Bazi Charts
            const { data: baziData } = await supabase
                .from('bazi_charts')
                .select('*')
                .eq('user_id', session.user.id);

            // Fetch Ziwei Charts
            const { data: ziweiData } = await supabase
                .from('ziwei_charts')
                .select('*')
                .eq('user_id', session.user.id);

            // Fetch Default Settings
            const { data: settings } = await supabase
                .from('user_settings')
                .select('default_bazi_chart_id, default_ziwei_chart_id')
                .eq('user_id', session.user.id)
                .single();

            const defaultBaziId = settings?.default_bazi_chart_id;
            const defaultZiweiId = settings?.default_ziwei_chart_id;

            const formatChart = (c: any, type: 'bazi' | 'ziwei', defaultId: string | undefined): ChartItem => ({
                id: c.id,
                type,
                name: c.name,
                gender: c.gender || 'unknown',
                birth_date: c.birth_date,
                birth_time: c.birth_time,
                city: c.birth_place,
                created_at: c.created_at,
                is_default: c.id === defaultId
            });

            const parsedBazi = (baziData || []).map(c => formatChart(c, 'bazi', defaultBaziId))
                .sort((a, b) => (a.is_default ? -1 : b.is_default ? 1 : new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));

            const parsedZiwei = (ziweiData || []).map(c => formatChart(c, 'ziwei', defaultZiweiId))
                .sort((a, b) => (a.is_default ? -1 : b.is_default ? 1 : new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));

            setBaziCharts(parsedBazi);
            setZiweiCharts(parsedZiwei);
            setLoading(false);
        };

        fetchCharts();
    }, [router, supabase]);

    const handleDelete = async (id: string, type: 'bazi' | 'ziwei', e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm('确定要删除这个命盘吗？')) return;

        const table = type === 'bazi' ? 'bazi_charts' : 'ziwei_charts';
        const { error } = await supabase
            .from(table)
            .delete()
            .eq('id', id);

        if (error) {
            console.error('删除命盘失败:', error);
            return;
        }

        if (type === 'bazi') {
            setBaziCharts(baziCharts.filter(c => c.id !== id));
        } else {
            setZiweiCharts(ziweiCharts.filter(c => c.id !== id));
        }
    };

    const handleSetDefault = async (id: string, type: 'bazi' | 'ziwei', e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!userId) return;

        // Optimistic update
        if (type === 'bazi') {
            setBaziCharts(baziCharts.map(c => ({ ...c, is_default: c.id === id })));
        } else {
            setZiweiCharts(ziweiCharts.map(c => ({ ...c, is_default: c.id === id })));
        }

        const field = type === 'bazi' ? 'default_bazi_chart_id' : 'default_ziwei_chart_id';
        const { error } = await supabase
            .from('user_settings')
            .update({ [field]: id })
            .eq('user_id', userId);

        if (error) {
            console.error('设置默认命盘失败:', error);
        }
    };

    const getChartIcon = (type: string) => {
        if (type === 'bazi') return <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border border-orange-100 dark:border-orange-900/30"><ScrollText className="w-5 h-5" /></div>;
        return <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-900/30"><Star className="w-5 h-5" /></div>;
    };

    const getGenderLabel = (gender: string) => {
        return gender === 'female' ? '女' : '男';
    };

    const ChartList = ({ title, list, type, onCreateLink, onCreateText }: { title: string, list: ChartItem[], type: 'bazi' | 'ziwei', onCreateLink: string, onCreateText: string }) => (
        <div className="mb-8">
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
                                        onClick={(e) => handleSetDefault(chart.id, chart.type, e)}
                                        className="p-2 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 text-foreground-secondary hover:text-amber-500 transition-colors"
                                        title="设为默认"
                                    >
                                        <Star className="w-4 h-4" />
                                    </button>
                                )}
                                <button
                                    onClick={(e) => handleDelete(chart.id, chart.type, e)}
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

    return (
        <div className="min-h-screen bg-background pb-20">
            <div className="max-w-2xl mx-auto px-4 py-6 animate-fade-in">
                {/* 头部 */}
                <div className="flex items-center justify-between mb-8 sticky top-0 bg-background/95 backdrop-blur-sm py-4 z-20 border-b border-transparent transition-all">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.push('/user')}
                            className="p-2 rounded-full hover:bg-slate-100 transition-colors -ml-2"
                        >
                            <ArrowLeft className="w-5 h-5 text-foreground" />
                        </button>
                        <h1 className="text-xl font-bold">我的命盘</h1>
                    </div>
                </div>

                {loading ? (
                    <div className="space-y-8">
                        {[1, 2].map(i => (
                            <div key={i} className="space-y-4">
                                <div className="h-6 w-24 bg-slate-100 rounded animate-pulse" />
                                <div className="h-32 bg-slate-50 rounded-2xl animate-pulse" />
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
                        />

                        <ChartList
                            title="紫微命盘"
                            list={ziweiCharts}
                            type="ziwei"
                            onCreateLink="/ziwei"
                            onCreateText="新建紫微"
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
