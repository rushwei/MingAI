/**
 * 每日运势页面
 * 
 * 支持个性化运势（基于用户八字命盘）和通用运势
 */
'use client';

import { useState, useMemo, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    Briefcase,
    Heart,
    Wallet,
    Activity,
    Star,
    Loader2,
    Sparkles,
    User,
    Compass,
    ChevronDown,
    X,
    Share2,
    Sun
} from 'lucide-react';

import { ChartSelectorModal } from '@/components/ChartSelectorModal';
import { CalendarAlmanac } from '@/components/daily/CalendarAlmanac';
import { DailyAIChat } from '@/components/daily/DailyAIChat';
import { ShareCard } from '@/components/fortune/ShareCard';
import { FortuneTrendChart, type FortuneTrendDataPoint } from '@/components/fortune/FortuneTrendChart';
import { InterpretationModeToggle, type InterpretationMode } from '@/components/fortune/InterpretationModeToggle';
import { supabase } from '@/lib/supabase';
import { calculateDailyFortune, calculateGenericDailyFortune, calculateWeeklyTrend, type DailyFortune } from '@/lib/fortune';
import { generateFortuneInterpretation } from '@/lib/fortune-interpretations';
import { getCalendarAlmanac } from '@/lib/calendar';
import { getBranchElement, getElementColor, getStemElement } from '@/lib/bazi';
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
    const [showTrendChart, setShowTrendChart] = useState(true);
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
                    const storedDefaultId = localStorage.getItem('defaultBaziChartId');
                    const defaultId = settings?.default_bazi_chart_id || storedDefaultId;
                    if (settings?.default_bazi_chart_id) {
                        localStorage.setItem('defaultBaziChartId', settings.default_bazi_chart_id);
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
                const fallbackId = localStorage.getItem('defaultBaziChartId');
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

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long',
        });
    };

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

    const dayStemElement = fortune.dayStem ? getStemElement(fortune.dayStem) : null;
    const dayBranchElement = fortune.dayBranch ? getBranchElement(fortune.dayBranch) : null;
    const dayStemColor = dayStemElement ? getElementColor(dayStemElement) : undefined;
    const dayBranchColor = dayBranchElement ? getElementColor(dayBranchElement) : undefined;

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


            <div className="max-w-2xl mx-auto px-4 md:py-8 py-2 relative z-10 space-y-6">

                {/* 顶部标题与日期选择 */}
                <header className="text-center md:mb-8 mb-4 md:pt-4 pt-0">
                    <h1 className="hidden md:block text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-600 dark:from-purple-400 dark:to-indigo-400 mb-2 flex items-center justify-center gap-2">
                        <Sun className="w-8 h-8 text-purple-500" />
                        每日运势
                    </h1>
                    <p className="hidden md:block text-foreground-secondary/80 text-sm mb-6">
                        洞察天机，把握当下 | {formatDate(new Date())}
                    </p>

                    {/* Date Navigator & Chart Selector */}
                    <div className="bg-background/60 backdrop-blur-md border border-border/50 rounded-2xl p-2 shadow-sm flex items-center justify-between gap-2 max-w-md mx-auto">
                        <button
                            onClick={() => changeDate(-1)}
                            className="p-2 rounded-xl hover:bg-background-secondary text-foreground-secondary hover:text-foreground transition-all"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>

                        <div className="flex-1 flex flex-col items-center">
                            <div className="flex items-center gap-2 font-medium text-foreground">
                                <CalendarIcon className="w-4 h-4 text-purple-500" />
                                {formatDate(selectedDate)}
                            </div>
                            <div className="flex items-center gap-2 text-xs mt-0.5">
                                {isToday ? (
                                    <span className="text-purple-600 dark:text-purple-400 font-medium bg-purple-100 dark:bg-purple-900/30 px-1.5 py-0.5 rounded text-[10px]">今日</span>
                                ) : (
                                    <button
                                        onClick={goToToday}
                                        className="text-foreground-secondary hover:text-purple-500 transition-colors"
                                    >
                                        回到今天
                                    </button>
                                )}
                            </div>
                        </div>

                        <button
                            onClick={() => changeDate(1)}
                            className="p-2 rounded-xl hover:bg-background-secondary text-foreground-secondary hover:text-foreground transition-all"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Personalization Toggle */}
                    <div className="mt-4 flex justify-center">
                        {isPersonalized ? (
                            <button
                                onClick={() => setShowChartSelector(true)}
                                className="group flex items-center justify-center gap-2 px-5 py-2.5 bg-background hover:bg-background-secondary rounded-full border border-border/60 hover:border-indigo-500/30 shadow-sm hover:shadow-md transition-all duration-300"
                            >
                                <Sparkles className="w-4 h-4 text-purple-500 group-hover:scale-110 transition-transform" />
                                <span className="text-sm font-medium">
                                    当前解读：{baziChart?.name}
                                </span>
                                <ChevronDown className="w-3 h-3 text-purple-400 group-hover:translate-y-0.5 transition-transform" />
                            </button>
                        ) : (
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-full">
                                <User className="w-4 h-4 text-amber-600" />
                                <span className="text-sm text-amber-700 dark:text-amber-400">通用运势模式</span>
                                <Link
                                    href="/bazi"
                                    className="text-xs text-amber-600 underline hover:text-amber-800 ml-1"
                                >
                                    切换个性化 &rarr;
                                </Link>
                            </div>
                        )}
                    </div>
                </header>

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

                {/* 核心运势卡片 */}
                {isPersonalized && fortune.dayStem && (
                    <div className="flex items-center justify-center gap-6 py-2 text-sm font-medium text-foreground/80 bg-background/40 rounded-xl border border-border/50 mx-4">
                        <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                            流日：
                            <span className="font-bold">
                                <span style={{ color: dayStemColor }}>{fortune.dayStem}</span>
                                <span style={{ color: dayBranchColor }}>{fortune.dayBranch}</span>
                            </span>
                        </div>
                        <div className="w-px h-4 bg-border" />
                        <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                            主神：<span className="font-bold">{fortune.tenGod}</span>
                        </div>
                    </div>
                )}

                {/* 黄历信息 */}
                <div className="bg-background/60 backdrop-blur-md border border-white/10 rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300">
                    <CalendarAlmanac date={selectedDate} />
                </div>

                {/* 趋势图表 - 可折叠 */}
                {isPersonalized && trendData.length > 0 && (
                    <section className="bg-background/60 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 group">
                        <button
                            onClick={() => setShowTrendChart(!showTrendChart)}
                            className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-transparent to-transparent group-hover:from-purple-500/5 transition-colors"
                        >
                            <h2 className="font-bold flex items-center gap-2 text-foreground">
                                <Activity className="w-5 h-5 text-purple-500" />
                                7日运势趋势
                            </h2>
                            <ChevronDown className={`w-5 h-5 text-foreground-secondary transition-transform duration-300 ${showTrendChart ? 'rotate-180' : ''}`} />
                        </button>

                        <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${showTrendChart ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                            <div className="overflow-hidden">
                                <div className="p-4 pt-0">
                                    <FortuneTrendChart
                                        data={trendData}
                                        selectedDate={fortune.date}
                                        height={200}
                                        multiDimension={false}
                                    />
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                {/* 详细运势评分卡片 */}
                <section className="bg-background/80 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-lg relative overflow-hidden">
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

                    <div className="grid gap-4 mb-6">
                        {scoreItems.map(item => {
                            const score = fortune[item.key as keyof typeof fortune] as number;
                            const Icon = item.icon;
                            const isHigh = score >= 80;
                            const isMedium = score >= 60;

                            return (
                                <div key={item.key} className="group">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-1.5 rounded-lg ${item.color.replace('text-', 'bg-').replace('500', '500/10')} ${item.color}`}>
                                                <Icon className="w-4 h-4" />
                                            </div>
                                            <span className="font-medium text-sm text-foreground/90">{item.label}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${isHigh ? 'bg-green-500/10 text-green-600' :
                                                isMedium ? 'bg-amber-500/10 text-amber-600' : 'bg-red-500/10 text-red-600'
                                                }`}>
                                                {score}分
                                            </span>
                                        </div>
                                    </div>
                                    <div className="h-2.5 bg-background-secondary/50 rounded-full overflow-hidden border border-border/30">
                                        <div
                                            className={`h-full transition-all duration-1000 ease-out rounded-full relative overflow-hidden ${isHigh ? 'bg-gradient-to-r from-emerald-400 to-green-500' :
                                                isMedium ? 'bg-gradient-to-r from-amber-400 to-orange-500' :
                                                    'bg-gradient-to-r from-red-400 to-rose-500'
                                                }`}
                                            style={{ width: `${score}%` }}
                                        >
                                            <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]" />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* 幸运信息 */}
                    {isPersonalized && fortune.luckyColor && (
                        <div className="grid grid-cols-2 gap-3 py-4 border-t border-border/50">
                            <div className="bg-background-secondary/30 rounded-xl p-3 flex items-center gap-3 border border-border/50">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-400 to-pink-500 flex items-center justify-center text-white shadow-sm">
                                    <span className="text-xs">色</span>
                                </div>
                                <div>
                                    <div className="text-xs text-foreground-secondary mb-0.5">幸运色</div>
                                    <div className="font-bold text-foreground">{fortune.luckyColor}</div>
                                </div>
                            </div>
                            <div className="bg-background-secondary/30 rounded-xl p-3 flex items-center gap-3 border border-border/50">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-white shadow-sm">
                                    <Compass className="w-4 h-4" />
                                </div>
                                <div>
                                    <div className="text-xs text-foreground-secondary mb-0.5">吉方位</div>
                                    <div className="font-bold text-foreground">{fortune.luckyDirection}</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 建议区域 */}
                    <div className="mt-4 pt-4 border-t border-border/50">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-purple-500" />
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
                        <div className="bg-background-secondary/30 rounded-xl p-4 border border-border/50">
                            <ul className="space-y-3">
                                {interpretedAdvice.map((advice, index) => (
                                    <li key={index} className="flex gap-3 text-sm leading-relaxed text-foreground/90">
                                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center text-xs font-bold mt-0.5">
                                            {index + 1}
                                        </span>
                                        <span>{advice}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </section>

                {/* AI Chat 模块 - 玻璃态容器 */}
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
