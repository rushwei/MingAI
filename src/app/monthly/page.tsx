/**
 * 每月运势页面
 * 
 * 支持个性化运势（基于用户八字命盘）和通用运势
 */
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
    CalendarRange as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    TrendingUp,
    TrendingDown,
    Minus,
    Star,
    Loader2,
    Sparkles,
    User,
    ChevronDown,
} from 'lucide-react';
import Link from 'next/link';

import { ChartSelectorModal } from '@/components/ChartSelectorModal';
import { FortuneTrendChart, type FortuneTrendDataPoint } from '@/components/fortune/FortuneTrendChart';
import { supabase } from '@/lib/supabase';
import { calculateMonthlyFortune, calculateDailyFortune, calculateGenericDailyFortune, calculateMonthlyTrend, generateEnhancedKeyDates, type MonthlyFortune, type EnhancedKeyDate } from '@/lib/fortune';
import { getBranchElement, getElementColor, getStemElement } from '@/lib/bazi';
import type { BaziChart } from '@/types';

const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];

function MonthlyPageContent() {
    const today = new Date();
    const [year, setYear] = useState(today.getFullYear());
    const [month, setMonth] = useState(today.getMonth() + 1);
    const [baziChart, setBaziChart] = useState<BaziChart | null>(null);
    const [baziCharts, setBaziCharts] = useState<BaziChart[]>([]);
    const [loading, setLoading] = useState(true);
    const [showChartSelector, setShowChartSelector] = useState(false);
    const [showTrendChart, setShowTrendChart] = useState(true);

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
                await loadUserCharts(session.user.id);
            } else {
                setLoading(false);
            }
        };
        init();
    }, [loadUserCharts]);

    // 计算月度运势
    const fortune = useMemo((): MonthlyFortune | null => {
        if (baziChart) {
            return calculateMonthlyFortune(baziChart, year, month);
        }
        return null;
    }, [baziChart, year, month]);

    // 计算日历数据
    const calendarData = useMemo(() => {
        const daysInMonth = new Date(year, month, 0).getDate();
        const days = [];

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month - 1, day);
            let score: number;

            if (baziChart) {
                const dayFortune = calculateDailyFortune(baziChart, date);
                score = dayFortune.overall;
            } else {
                const generic = calculateGenericDailyFortune(date);
                score = generic.overall;
            }

            days.push({
                day,
                score,
                trend: score >= 80 ? 'up' : score <= 65 ? 'down' : 'neutral',
            });
        }

        return days;
    }, [baziChart, year, month]);

    // 计算月度趋势数据（用于趋势图）
    const trendData = useMemo((): FortuneTrendDataPoint[] => {
        if (!baziChart) return [];
        const monthData = calculateMonthlyTrend(baziChart, year, month);
        return monthData.map(d => ({
            date: d.date,
            fullDate: d.fullDate,
            dayOfMonth: d.dayOfMonth,
            scores: d.scores,
            isKeyDate: d.isKeyDate,
            keyDateType: d.keyDateType as 'lucky' | 'warning' | 'turning' | 'peak' | 'valley' | undefined,
            keyDateDesc: d.keyDateDesc,
        }));
    }, [baziChart, year, month]);

    // 计算增强版关键日期
    const enhancedKeyDates = useMemo((): EnhancedKeyDate[] => {
        if (!baziChart) return [];
        return generateEnhancedKeyDates(baziChart, year, month);
    }, [baziChart, year, month]);

    const changeMonth = (delta: number) => {
        let newMonth = month + delta;
        let newYear = year;

        if (newMonth > 12) {
            newMonth = 1;
            newYear++;
        } else if (newMonth < 1) {
            newMonth = 12;
            newYear--;
        }

        setMonth(newMonth);
        setYear(newYear);
    };

    const goToCurrentMonth = () => {
        setYear(today.getFullYear());
        setMonth(today.getMonth() + 1);
    };

    const isCurrentMonth = year === today.getFullYear() && month === today.getMonth() + 1;
    const isPersonalized = !!baziChart;

    const getTrendIcon = (trend: string) => {
        if (trend === 'up') return <TrendingUp className="w-3 h-3 text-green-500" />;
        if (trend === 'down') return <TrendingDown className="w-3 h-3 text-red-500" />;
        return <Minus className="w-3 h-3 text-foreground-secondary" />;
    };

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'bg-green-500';
        if (score >= 70) return 'bg-amber-500';
        return 'bg-red-500';
    };

    const average = Math.floor(calendarData.reduce((sum, d) => sum + d.score, 0) / calendarData.length);

    const handleSelectChart = (chart: BaziChart) => {
        setBaziChart(chart);
        setShowChartSelector(false);
    };

    const monthStemElement = fortune?.monthStem ? getStemElement(fortune.monthStem) : null;
    const monthBranchElement = fortune?.monthBranch ? getBranchElement(fortune.monthBranch) : null;
    const monthStemColor = monthStemElement ? getElementColor(monthStemElement) : undefined;
    const monthBranchColor = monthBranchElement ? getElementColor(monthBranchElement) : undefined;

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-8 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto" />
                <p className="mt-4 text-foreground-secondary">加载中...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background md:pb-20">
            {/* 顶部 Hero 区域 - 移动端隐藏 */}
            <div className="hidden md:block relative overflow-hidden border-border/50 pb-4 pt-12">
                <div className="absolute inset-0 bg-grid-pattern opacity-[0.03] pointer-events-none" />
                <div className="max-w-4xl mx-auto px-4 relative z-10">
                    <div className="text-center mb-6">
                        <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 mb-4 tracking-tight flex items-center justify-center gap-3">
                            <div className="inline-flex items-center justify-center p-2 rounded-xl">
                                <CalendarIcon className="w-8 h-8 text-indigo-500" />
                            </div>
                            月度运势
                        </h1>
                        <p className="text-lg text-foreground-secondary/80 max-w-lg mx-auto">
                            把握流月气场，洞悉机遇与挑战，规划最佳行动时机。
                        </p>
                    </div>

                    {/* 月份选择器 */}
                    <div className="flex items-center justify-center gap-6 bg-background/50 backdrop-blur-md rounded-2xl border border-border/50 p-2 max-w-md mx-auto shadow-sm">
                        <button
                            onClick={() => changeMonth(-1)}
                            className="p-3 rounded-xl hover:bg-background border border-transparent hover:border-border transition-all text-foreground-secondary hover:text-foreground hover:shadow-sm"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>

                        <div className="text-center min-w-[140px]">
                            <div className="text-2xl font-bold text-foreground tabular-nums tracking-tight">
                                {year}年 {monthNames[month - 1]}
                            </div>
                            {isCurrentMonth ? (
                                <div className="text-xs font-medium text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-full inline-block mt-1">
                                    本月
                                </div>
                            ) : (
                                <button
                                    onClick={goToCurrentMonth}
                                    className="text-xs text-foreground-secondary hover:text-indigo-500 transition-colors mt-1"
                                >
                                    回到本月
                                </button>
                            )}
                        </div>

                        <button
                            onClick={() => changeMonth(1)}
                            className="p-3 rounded-xl hover:bg-background border border-transparent hover:border-border transition-all text-foreground-secondary hover:text-foreground hover:shadow-sm"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* 移动端月份选择器 */}
            <div className="md:hidden py-4 px-4">
                <div className="flex items-center justify-center gap-4 bg-background/50 backdrop-blur-md rounded-xl border border-border/50 p-2">
                    <button
                        onClick={() => changeMonth(-1)}
                        className="p-2 rounded-lg hover:bg-background-secondary transition-all text-foreground-secondary"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="text-center">
                        <div className="text-lg font-bold text-foreground">
                            {year}年 {monthNames[month - 1]}
                        </div>
                    </div>
                    <button
                        onClick={() => changeMonth(1)}
                        className="p-2 rounded-lg hover:bg-background-secondary transition-all text-foreground-secondary"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-4 md:py-8 space-y-8 -mt-4 relative z-20">
                {/* 命盘选择 / 提示卡片 */}
                {isPersonalized ? (
                    <div className="flex justify-center md:mb-8 mb-4">
                        <button
                            onClick={() => setShowChartSelector(true)}
                            className="group flex items-center justify-center gap-2 px-5 py-2.5 bg-background hover:bg-background-secondary rounded-full border border-border/60 hover:border-indigo-500/30 shadow-sm hover:shadow-md transition-all duration-300"
                        >
                            <Sparkles className="w-4 h-4 text-indigo-500 group-hover:scale-110 transition-transform" />
                            <span className="text-sm font-medium text-foreground-secondary group-hover:text-foreground">
                                当前分析：<span className="text-indigo-600 dark:text-indigo-400">{baziChart.name}</span> 的命盘
                            </span>
                            <ChevronDown className="w-4 h-4 text-foreground-secondary group-hover:text-foreground transition-transform group-hover:rotate-180" />
                        </button>
                    </div>
                ) : (
                    <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/5 border border-amber-500/20 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-500/10 rounded-lg">
                                <User className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div>
                                <h3 className="font-medium text-amber-900 dark:text-amber-100">当前为通用运势</h3>
                                <p className="text-xs text-amber-700/70 dark:text-amber-300/70">关联八字命盘，获取专属精准分析</p>
                            </div>
                        </div>
                        <Link
                            href="/bazi"
                            className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors shadow-md hover:shadow-lg hover:shadow-amber-500/20"
                        >
                            去排盘
                        </Link>
                    </div>
                )}

                {/* 月度总结卡片 */}
                {isPersonalized && fortune && (
                    <div className="bg-background border border-border rounded-3xl p-6 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-indigo-500/5 to-transparent pointer-events-none" />

                        <div className="flex flex-col sm:flex-row gap-6 relative z-10">
                            <div className="sm:w-1/3 flex flex-col justify-center items-center sm:items-start border-b sm:border-b-0 sm:border-r border-border/50 pb-4 sm:pb-0 sm:pr-6">
                                <div className="text-sm font-medium text-foreground-secondary mb-1">本月能量</div>
                                <div className="flex items-baseline gap-2 mb-2">
                                    <span className="text-3xl font-bold font-serif text-indigo-900 dark:text-indigo-100">
                                        <span style={{ color: monthStemColor }}>{fortune.monthStem}</span>
                                        <span style={{ color: monthBranchColor }}>{fortune.monthBranch}</span>
                                    </span>
                                    <span className="text-sm text-foreground-secondary">月</span>
                                </div>
                                <div className="flex items-center gap-2 bg-background-secondary px-3 py-1.5 rounded-lg border border-border/50">
                                    <span className="text-xs text-foreground-secondary">主运十神</span>
                                    <span className="text-sm font-bold">{fortune.tenGod}</span>
                                </div>
                                {average > 0 && (
                                    <div className="mt-4 flex flex-col items-center sm:items-start w-full">
                                        <div className="flex justify-between w-full text-xs text-foreground-secondary mb-1">
                                            <span>综合运势</span>
                                            <span className="font-bold">{average}分</span>
                                        </div>
                                        <div className="h-2 w-full bg-background-secondary rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${getScoreColor(average)} transition-all duration-1000`}
                                                style={{ width: `${average}%` }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="sm:w-2/3 flex flex-col justify-center">
                                <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-amber-500" />
                                    运势批语
                                </h3>
                                <p className="text-foreground leading-relaxed text-justify">
                                    {fortune.summary}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* 趋势图 */}
                {isPersonalized && trendData.length > 0 && (
                    <div className="bg-background rounded-3xl p-1 border border-border shadow-sm">
                        <div className="p-5 border-b border-border/50 flex items-center justify-between">
                            <h2 className="font-bold text-lg flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-indigo-500" />
                                运势起伏
                            </h2>
                            <button
                                onClick={() => setShowTrendChart(!showTrendChart)}
                                className="p-2 hover:bg-background-secondary rounded-full transition-colors"
                            >
                                <ChevronDown className={`w-5 h-5 text-foreground-secondary transition-transform duration-300 ${showTrendChart ? 'rotate-180' : ''}`} />
                            </button>
                        </div>
                        {showTrendChart && (
                            <div className="p-4 sm:p-6 bg-background-secondary/30 rounded-b-[1.4rem]">
                                <FortuneTrendChart
                                    data={trendData}
                                    height={300}
                                    multiDimension={true}
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* 运势日历 */}
                <div className="bg-background rounded-3xl border border-border shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-border/50 flex items-center justify-between bg-background-secondary/30">
                        <h2 className="font-bold text-lg flex items-center gap-2">
                            <CalendarIcon className="w-5 h-5 text-indigo-500" />
                            每日运程
                        </h2>

                        {/* 图例 */}
                        <div className="flex items-center gap-3 sm:gap-4 text-[10px] sm:text-xs text-foreground-secondary">
                            <div className="flex items-center gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-sm shadow-green-500/20" />
                                <span>吉</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500/20" />
                                <span>平</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm shadow-red-500/20" />
                                <span>凶</span>
                            </div>
                        </div>
                    </div>

                    <div className="p-6">
                        <div className="grid grid-cols-7 gap-2 sm:gap-4 mb-2">
                            {['日', '一', '二', '三', '四', '五', '六'].map(d => (
                                <div key={d} className="text-center text-foreground-secondary/60 text-xs font-medium py-2">
                                    {d}
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-7 gap-2 sm:gap-4">
                            {/* 填充月初空白 */}
                            {Array.from({ length: new Date(year, month - 1, 1).getDay() }).map((_, i) => (
                                <div key={`empty-${i}`} />
                            ))}

                            {calendarData.map(day => {
                                const isToday = year === today.getFullYear() &&
                                    month === today.getMonth() + 1 &&
                                    day.day === today.getDate();

                                return (
                                    <Link
                                        key={day.day}
                                        href={`/daily?date=${year}-${String(month).padStart(2, '0')}-${String(day.day).padStart(2, '0')}`}
                                        className={`
                                            group relative p-2 sm:p-3 rounded-2xl text-center cursor-pointer
                                            border transition-all duration-300
                                            hover:shadow-md hover:-translate-y-1
                                            ${isToday
                                                ? 'bg-indigo-50 dark:bg-indigo-500/20 border-indigo-200 dark:border-indigo-500/30 ring-1 ring-indigo-500/20'
                                                : 'bg-background-secondary/30 hover:bg-background-secondary border-transparent hover:border-border'
                                            }
                                        `}
                                    >
                                        <div className={`text-xs sm:text-sm font-medium mb-2 ${isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-foreground-secondary'}`}>
                                            {day.day}
                                        </div>
                                        <div className="flex flex-col items-center gap-1">
                                            <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${getScoreColor(day.score)}`} />
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                {getTrendIcon(day.trend)}
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* 重点日期 */}
                {isPersonalized && enhancedKeyDates.length > 0 && (
                    <div className="space-y-4">
                        <h2 className="font-bold text-xl px-2 flex items-center gap-2">
                            <Star className="w-5 h-5 text-amber-500" />
                            本月关键提示
                        </h2>
                        <div className="grid sm:grid-cols-2 gap-4">
                            {enhancedKeyDates.map(h => {
                                const typeStyles = {
                                    lucky: { bg: 'bg-green-500/5', border: 'border-green-500/20', text: 'text-green-600 dark:text-green-400', label: '吉日', icon: '✨' },
                                    peak: { bg: 'bg-emerald-500/5', border: 'border-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-400', label: '高峰', icon: '📈' },
                                    valley: { bg: 'bg-red-500/5', border: 'border-red-500/20', text: 'text-red-600 dark:text-zinc-400', label: '低谷', icon: '📉' },
                                    warning: { bg: 'bg-red-500/5', border: 'border-red-500/20', text: 'text-red-600 dark:text-red-400', label: '警惕', icon: '⚠️' },
                                    turning: { bg: 'bg-amber-500/5', border: 'border-amber-500/20', text: 'text-amber-600 dark:text-amber-400', label: '转折', icon: '🔄' },
                                };
                                const style = typeStyles[h.type as keyof typeof typeStyles] || typeStyles.turning;

                                return (
                                    <Link
                                        key={h.date}
                                        href={`/daily?date=${year}-${String(month).padStart(2, '0')}-${String(h.date).padStart(2, '0')}`}
                                        className={`
                                            group p-5 rounded-2xl border transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5
                                            bg-background ${style.border} hover:border-transparent
                                        `}
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className={`
                                                    w-12 h-12 rounded-xl flex flex-col items-center justify-center
                                                    ${style.bg} ${style.border} border
                                                `}>
                                                    <span className={`text-sm font-bold ${style.text}`}>{month}/{h.date}</span>
                                                </div>
                                                <div>
                                                    <div className={`text-sm font-bold ${style.text} flex items-center gap-1.5`}>
                                                        {style.icon} {style.label}
                                                    </div>
                                                    <div className="text-xs text-foreground-secondary mt-0.5">
                                                        综合指数: <span className="font-medium">{h.scores.overall}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="w-8 h-8 rounded-full bg-background-secondary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0">
                                                <ChevronRight className="w-4 h-4 text-foreground-secondary" />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5 pl-1">
                                            <h4 className="font-medium text-foreground text-sm">{h.summary}</h4>
                                            <p className="text-xs text-foreground-secondary line-clamp-2 leading-relaxed opacity-80 group-hover:opacity-100">
                                                {h.recommendation}
                                            </p>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* 底部提示 */}
                {!isPersonalized && (
                    <div className="text-center py-8">
                        <Link
                            href="/bazi"
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-background border border-border shadow-sm hover:shadow-md hover:border-indigo-500/30 transition-all group"
                        >
                            <span className="text-sm text-foreground-secondary group-hover:text-foreground">完成八字排盘，获取更精准的分析</span>
                            <ChevronRight className="w-4 h-4 text-foreground-secondary group-hover:text-indigo-500" />
                        </Link>
                    </div>
                )}
            </div>

            {/* 命盘选择器弹窗 */}
            {showChartSelector && (
                <ChartSelectorModal
                    charts={baziCharts}
                    selectedId={baziChart?.id}
                    onSelect={handleSelectChart}
                    onClose={() => setShowChartSelector(false)}
                />
            )}
        </div>
    );
}

export default function MonthlyPage() {
    return (
        <MonthlyPageContent />
    );
}
