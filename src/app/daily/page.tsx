/**
 * 每日运势页面
 * 
 * 支持个性化运势（基于用户八字命盘）和通用运势
 */
'use client';

import { useState, useMemo, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';

import {
    Briefcase,
    Heart,
    Wallet,
    Activity,
    Star,
    Loader2,
    Sparkles,
    User,
    Compass,
    X,
    Share2,
} from 'lucide-react';

import { ChartSelectorModal } from '@/components/ChartSelectorModal';
import { CalendarAlmanac } from '@/components/daily/CalendarAlmanac';
import { DailyAIChat } from '@/components/daily/DailyAIChat';
import { ShareCard } from '@/components/fortune/ShareCard';
import { FortuneTrendChart, type FortuneTrendDataPoint } from '@/components/fortune/FortuneTrendChart';
import { InterpretationModeToggle, type InterpretationMode } from '@/components/fortune/InterpretationModeToggle';
import { supabase } from '@/lib/supabase';
import { readLocalCache, writeLocalCache } from '@/lib/cache';
import { calculateDailyFortune, calculateGenericDailyFortune, calculateWeeklyTrend, type DailyFortune } from '@/lib/fortune';
import { generateFortuneInterpretation } from '@/lib/fortune-interpretations';
import { getCalendarAlmanac } from '@/lib/calendar';

import type { BaziChart } from '@/types';
import { AuthModal } from '@/components/auth/AuthModal';

const scoreItems = [
    { key: 'overall', label: '综合运势', icon: Star, color: 'text-amber-500' },
    { key: 'career', label: '事业运', icon: Briefcase, color: 'text-blue-500' },
    { key: 'love', label: '感情运', icon: Heart, color: 'text-pink-500' },
    { key: 'wealth', label: '财运', icon: Wallet, color: 'text-green-500' },
    { key: 'health', label: '健康运', icon: Activity, color: 'text-red-500' },
    { key: 'social', label: '人际运', icon: User, color: 'text-purple-500' },
];

// 解析日期字符串
function parseDateParam(dateStr: string | null): Date {
    if (!dateStr) return new Date();

    const parts = dateStr.split('-');
    if (parts.length === 3) {
        const year = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1;
        const day = parseInt(parts[2]);
        if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
            return new Date(year, month, day);
        }
    }
    return new Date();
}

function DailyPageContent() {
    const searchParams = useSearchParams();
    const [selectedDate, setSelectedDate] = useState(() => parseDateParam(searchParams.get('date')));
    const [baziChart, setBaziChart] = useState<BaziChart | null>(null);
    const [baziCharts, setBaziCharts] = useState<BaziChart[]>([]);
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);
    const [showChartSelector, setShowChartSelector] = useState(false);
    const [showShareCard, setShowShareCard] = useState(false);
    const [interpretationMode, setInterpretationMode] = useState<InterpretationMode>('colloquial');

    const [showAuthModal, setShowAuthModal] = useState(false);

    // 加载用户所有八字命盘
    const loadUserCharts = useCallback(async (uid: string) => {
        try {
            const { data, error } = await supabase
                .from('bazi_charts')
                .select('*')
                .eq('user_id', uid)
                .order('created_at', { ascending: false });

            if (!error && data && data.length > 0) {
                // 从 chart_data 中提取完整的八字数据
                const charts = data.map(row => {
                    const chartData = row.chart_data as Record<string, unknown> || {};
                    return {
                        id: row.id,
                        name: row.name,
                        gender: row.gender,
                        birthDate: row.birth_date,
                        birthTime: row.birth_time,
                        birthPlace: row.birth_place,
                        calendarType: row.calendar_type,
                        isLeapMonth: row.is_leap_month,
                        // 从 chart_data 中读取排盘结果
                        fourPillars: chartData.fourPillars,
                        dayMaster: chartData.dayMaster,
                        fiveElements: chartData.fiveElements,
                        createdAt: row.created_at,
                    } as BaziChart;
                });
                setBaziCharts(charts);

                const { data: settings, error: settingsError } = await supabase
                    .from('user_settings')
                    .select('default_bazi_chart_id')
                    .eq('user_id', uid)
                    .maybeSingle();

                if (!settingsError) {
                    const cachedDefaultId = readLocalCache<string>('mingai.pref.defaultBaziChartId', Number.POSITIVE_INFINITY);
                    const legacyDefaultId = cachedDefaultId ? null : localStorage.getItem('defaultBaziChartId');
                    const storedDefaultId = cachedDefaultId || legacyDefaultId;
                    if (legacyDefaultId) {
                        writeLocalCache('mingai.pref.defaultBaziChartId', legacyDefaultId);
                    }
                    const defaultId = settings?.default_bazi_chart_id || storedDefaultId;
                    if (settings?.default_bazi_chart_id) {
                        writeLocalCache('mingai.pref.defaultBaziChartId', settings.default_bazi_chart_id);
                    } else if (!settings && storedDefaultId) {
                        await supabase
                            .from('user_settings')
                            .upsert({ user_id: uid, default_bazi_chart_id: storedDefaultId }, { onConflict: 'user_id' });
                    }
                    const defaultChart = defaultId ? charts.find(c => c.id === defaultId) : null;
                    setBaziChart(defaultChart || charts[0]);
                    return;
                }

                // 回退到本地默认
                const fallbackId = readLocalCache<string>('mingai.pref.defaultBaziChartId', Number.POSITIVE_INFINITY)
                    || localStorage.getItem('defaultBaziChartId');
                const defaultChart = fallbackId ? charts.find(c => c.id === fallbackId) : null;
                setBaziChart(defaultChart || charts[0]);
            }
        } catch (err) {
            console.error('加载命盘失败:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    // 初始化
    useEffect(() => {
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                setUserId(session.user.id);
                await loadUserCharts(session.user.id);
            } else {
                setLoading(false);
            }
        };
        init();
    }, [loadUserCharts]);

    // 当 URL 参数变化时同步日期
    useEffect(() => {
        const dateParam = searchParams.get('date');
        if (dateParam) {
            setSelectedDate(parseDateParam(dateParam));
        } else {
            setSelectedDate(new Date());
        }
    }, [searchParams]);

    // 计算运势
    const fortune = useMemo(() => {
        if (baziChart) {
            return calculateDailyFortune(baziChart, selectedDate);
        }
        const generic = calculateGenericDailyFortune(selectedDate);
        return {
            ...generic,
            date: `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`,
            dayStem: undefined as unknown,
            dayBranch: '',
            tenGod: '',
            luckyColor: '',
            luckyDirection: '',
        } as DailyFortune;
    }, [baziChart, selectedDate]);



    const changeDate = (days: number) => {
        const newDate = new Date(selectedDate);
        newDate.setDate(newDate.getDate() + days);
        setSelectedDate(newDate);
    };

    const goToToday = () => {
        setSelectedDate(new Date());
    };

    const handleSelectChart = (chart: BaziChart) => {
        setBaziChart(chart);
        setShowChartSelector(false);
    };

    const isToday = selectedDate.toDateString() === new Date().toDateString();
    const isPersonalized = !!baziChart;

    // 计算周趋势数据（用于趋势图）
    const trendData = useMemo((): FortuneTrendDataPoint[] => {
        if (!baziChart) return [];
        const weekData = calculateWeeklyTrend(baziChart, selectedDate);
        return weekData.map(d => ({
            date: d.date,
            fullDate: d.fullDate,
            dayOfMonth: d.dayOfMonth,
            scores: d.scores,
        }));
    }, [baziChart, selectedDate]);

    // 根据解读模式生成建议
    const interpretedAdvice = useMemo(() => {
        if (!baziChart || !fortune.tenGod) return fortune.advice;
        return generateFortuneInterpretation(
            fortune.tenGod,
            {
                overall: fortune.overall,
                career: fortune.career,
                love: fortune.love,
                wealth: fortune.wealth,
                health: fortune.health,
                social: fortune.social,
            },
            interpretationMode
        );
    }, [baziChart, fortune, interpretationMode]);

    // 获取黄历数据用于分享卡片
    const almanacData = useMemo(() => {
        const data = getCalendarAlmanac(selectedDate);
        return {
            yi: data.yi,
            ji: data.ji,
        };
    }, [selectedDate]);

    if (loading) {
        return (
            <div className="max-w-2xl mx-auto px-4 py-8 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto" />
                <p className="mt-4 text-foreground-secondary">加载中...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background relative overflow-hidden md:pb-24">
            <div className="max-w-7xl mx-auto md:px-4 px-2 md:py-8 py-2 relative z-10 space-y-6">

                {/* 顶部标题 - 仅桌面端显示 */}
                {/* <header className="hidden md:block text-center mb-8 pt-4">
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-600 dark:from-purple-400 dark:to-indigo-400 mb-2">
                        每日运势
                    </h1>
                    <p className="text-foreground-secondary/80 text-sm">
                        洞察天机，把握当下 | {formatDate(new Date())}
                    </p>
                </header> */}

                {/* 命盘选择器弹窗 */}
                {showChartSelector && (
                    <ChartSelectorModal
                        charts={baziCharts}
                        selectedId={baziChart?.id}
                        onSelect={handleSelectChart}
                        onClose={() => setShowChartSelector(false)}
                    />
                )}

                {/* 分享卡片弹窗 */}
                {showShareCard && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                        <div className="bg-background rounded-2xl p-6 max-w-md w-full shadow-2xl scale-100 animate-in zoom-in-95 duration-200" style={{ maxHeight: 'calc(100vh - 32px)' }}>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-bold flex items-center gap-2">
                                    <Share2 className="w-5 h-5 text-purple-500" />
                                    分享运势
                                </h2>
                                <button
                                    onClick={() => setShowShareCard(false)}
                                    className="p-2 rounded-full hover:bg-background-secondary transition-colors"
                                >
                                    <X className="w-5 h-5 text-foreground-secondary" />
                                </button>
                            </div>
                            <ShareCard
                                fortune={fortune}
                                date={selectedDate}
                                userName={baziChart?.name}
                                isPersonalized={isPersonalized}
                                almanac={almanacData}
                            />
                        </div>
                    </div>
                )}

                {/* 主要内容网格区域 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

                    {/* 左侧：黄历信息 */}
                    <div className="h-full">
                        <div className="bg-background/60 backdrop-blur-md rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300 h-full">
                            <CalendarAlmanac
                                date={selectedDate}
                                onDateChange={changeDate}
                                onGoToday={goToToday}
                                isToday={isToday}
                                chartName={baziChart?.name}
                                onChartSelect={() => setShowChartSelector(true)}
                                isPersonalized={isPersonalized}
                                dayStem={fortune.dayStem}
                                dayBranch={fortune.dayBranch}
                                tenGod={fortune.tenGod}
                            />
                        </div>
                    </div>

                    {/* 右侧：趋势图 + 运势分析 */}
                    <div className="flex flex-col gap-6">
                        {/* 1. 7日运势趋势 (仅个性化模式显示) */}
                        {isPersonalized && trendData.length > 0 && (
                            <section className="bg-background/60 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                                <div className="p-4">
                                    <div className="w-full">
                                        <FortuneTrendChart
                                            data={trendData}
                                            selectedDate={fortune.date}
                                            height={220}
                                            multiDimension={false}
                                            title={
                                                <div className="flex items-center gap-2">
                                                    <Activity className="w-5 h-5 text-purple-500" />
                                                    7日运势趋势
                                                </div>
                                            }
                                        />
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* 2. 详细运势评分与分析 */}
                        <section className="bg-background/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-lg relative overflow-hidden flex flex-col">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-bold flex items-center gap-2">
                                    <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                                    运势分析
                                </h2>
                                <button
                                    onClick={() => setShowShareCard(true)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-gradient-to-r from-purple-500/10 to-indigo-500/10 text-purple-600 dark:text-purple-400 hover:from-purple-500/20 hover:to-indigo-500/20 border border-purple-200 dark:border-purple-800 transition-all active:scale-95"
                                >
                                    <Share2 className="w-3.5 h-3.5" />
                                    分享好运
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-x-6 gap-y-3 mb-4 flex-none">
                                {scoreItems.map(item => {
                                    const score = fortune[item.key as keyof typeof fortune] as number;
                                    const Icon = item.icon;
                                    const isHigh = score >= 80;
                                    const isMedium = score >= 60;

                                    return (
                                        <div key={item.key} className="group">
                                            <div className="flex items-center justify-between mb-1">
                                                <div className="flex items-center gap-2">
                                                    <div className={`p-1 rounded-md ${item.color.replace('text-', 'bg-').replace('500', '500/10')} ${item.color}`}>
                                                        <Icon className="w-3.5 h-3.5" />
                                                    </div>
                                                    <span className="font-medium text-xs text-foreground/90">{item.label}</span>
                                                </div>
                                                <span className={`text-xs font-bold ${isHigh ? 'text-green-600' : isMedium ? 'text-amber-600' : 'text-red-600'}`}>
                                                    {score}
                                                </span>
                                            </div>
                                            <div className="h-1.5 bg-background-secondary/50 rounded-full overflow-hidden border border-border/30">
                                                <div
                                                    className={`h-full transition-all duration-1000 ease-out rounded-full relative overflow-hidden ${isHigh ? 'bg-gradient-to-r from-emerald-400 to-green-500' :
                                                        isMedium ? 'bg-gradient-to-r from-amber-400 to-orange-500' :
                                                            'bg-gradient-to-r from-red-400 to-rose-500'
                                                        }`}
                                                    style={{ width: `${score}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="flex-1 flex flex-col gap-1">
                                {/* 幸运信息 */}
                                {isPersonalized && fortune.luckyColor && (
                                    <div className="grid grid-cols-2 gap-3 py-3 border-t border-border/50">
                                        <div className="bg-background-secondary/30 rounded-xl p-2.5 flex items-center gap-2.5 border border-border/50">
                                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-red-400 to-pink-500 flex items-center justify-center text-white shadow-sm flex-shrink-0">
                                                <span className="text-xs">色</span>
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-[10px] text-foreground-secondary leading-none mb-1">幸运色</div>
                                                <div className="font-bold text-sm text-foreground truncate">{fortune.luckyColor}</div>
                                            </div>
                                        </div>
                                        <div className="bg-background-secondary/30 rounded-xl p-2.5 flex items-center gap-2.5 border border-border/50">
                                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-white shadow-sm flex-shrink-0">
                                                <Compass className="w-3.5 h-3.5" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-[10px] text-foreground-secondary leading-none mb-1">吉方位</div>
                                                <div className="font-bold text-sm text-foreground truncate">{fortune.luckyDirection}</div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* 建议区域 */}
                                <div className="pt-1 border-t border-border/50 flex-1">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="font-semibold flex items-center gap-2 text-sm">
                                            <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                                            运势指引
                                        </h3>
                                        {isPersonalized && (
                                            <InterpretationModeToggle
                                                mode={interpretationMode}
                                                onModeChange={setInterpretationMode}
                                                compact
                                            />
                                        )}
                                    </div>
                                    <div className="bg-background-secondary/30 rounded-xl p-3 border border-border/50 h-full max-h-[200px] overflow-y-auto custom-scrollbar">
                                        <ul className="space-y-2.5">
                                            {interpretedAdvice.map((advice, index) => (
                                                <li key={index} className="flex gap-2.5 text-xs text-foreground/90 leading-relaxed">
                                                    <span className="flex-shrink-0 w-4 h-4 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center text-[10px] font-bold mt-0.5">
                                                        {index + 1}
                                                    </span>
                                                    <span>{advice}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>

                {/* AI Chat 模块 */}
                <section className="bg-background/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-sm overflow-hidden mt-6">
                    <div className="p-1">
                        {userId ? (
                            <DailyAIChat date={selectedDate} userId={userId} />
                        ) : (
                            <div className="p-8 text-center bg-gradient-to-b from-purple-500/5 to-transparent">
                                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-500/20 rotate-3">
                                    <Sparkles className="w-8 h-8 text-white" />
                                </div>
                                <h3 className="text-xl font-bold mb-2">AI 命理师在线解读</h3>
                                <p className="text-foreground-secondary mb-6 max-w-sm mx-auto">
                                    登录即可解锁 AI 智能对话，针对您的命盘进行深度的一对一运势分析
                                </p>
                                <button
                                    onClick={() => setShowAuthModal(true)}
                                    className="px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-xl shadow-lg hover:shadow-purple-500/25 transition-all hover:scale-105 active:scale-95"
                                >
                                    立即登录体验
                                </button>
                            </div>
                        )}
                    </div>
                </section>
            </div>

            <AuthModal
                isOpen={showAuthModal}
                onClose={() => setShowAuthModal(false)}
            />
        </div>
    );
}
// 底部导出保持不变
export default function DailyPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 animate-spin text-purple-500" />
                    <p className="text-foreground-secondary animate-pulse">正在推演天机...</p>
                </div>
            </div>
        }>
            <DailyPageContent />
        </Suspense>
    );
}
