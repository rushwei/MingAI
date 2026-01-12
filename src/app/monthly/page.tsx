/**
 * 每月运势页面
 * 
 * 支持个性化运势（基于用户八字命盘）和通用运势
 */
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
    Calendar as CalendarIcon,
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
    Check,
    X
} from 'lucide-react';
import Link from 'next/link';
import { LoginOverlay } from '@/components/auth/LoginOverlay';
import { ChartSelectorModal } from '@/components/ChartSelectorModal';
import { FortuneTrendChart, type FortuneTrendDataPoint } from '@/components/fortune/FortuneTrendChart';
import { supabase } from '@/lib/supabase';
import { calculateMonthlyFortune, calculateDailyFortune, calculateGenericDailyFortune, calculateMonthlyTrend, generateEnhancedKeyDates, type MonthlyFortune, type EnhancedKeyDate } from '@/lib/fortune';
import type { BaziChart } from '@/types';

const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];

// 基于日期的伪随机函数（通用运势用）
function seededRandom(seed: number, offset: number): number {
    const x = Math.sin(seed + offset) * 10000;
    return x - Math.floor(x);
}

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

                // 优先使用默认命盘
                const defaultId = localStorage.getItem('defaultBaziChartId');
                const defaultChart = defaultId ? charts.find(c => c.id === defaultId) : null;
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

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-8 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto" />
                <p className="mt-4 text-foreground-secondary">加载中...</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in">
            {/* 个性化提示 - 可点击切换命盘 */}
            {isPersonalized ? (
                <button
                    onClick={() => setShowChartSelector(true)}
                    className="flex items-center justify-center gap-2 mb-4 text-accent hover:opacity-80 transition-opacity w-full"
                >
                    <Sparkles className="w-4 h-4" />
                    <span className="text-sm">八字运势 · 基于「{baziChart.name}」</span>
                    <ChevronDown className="w-4 h-4" />
                </button>
            ) : (
                <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-amber-600">
                            <User className="w-4 h-4" />
                            <span className="text-sm">当前为通用运势</span>
                        </div>
                        <Link
                            href="/bazi"
                            className="text-sm text-accent hover:underline"
                        >
                            添加命盘获取个性化分析 →
                        </Link>
                    </div>
                </div>
            )}

            {/* 命盘选择器弹窗 */}
            {showChartSelector && (
                <ChartSelectorModal
                    charts={baziCharts}
                    selectedId={baziChart?.id}
                    onSelect={handleSelectChart}
                    onClose={() => setShowChartSelector(false)}
                />
            )}


            {/* 月份选择器 */}
            <div className="flex items-center justify-between mb-6">
                <button
                    onClick={() => changeMonth(-1)}
                    className="p-2 rounded-lg hover:bg-background-secondary transition-colors"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>

                <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                        <CalendarIcon className="w-5 h-5 text-accent" />
                        <span className="text-xl font-semibold">{year}年{monthNames[month - 1]}</span>
                    </div>
                    <div className="text-sm text-foreground-secondary">
                        {isCurrentMonth ? (
                            <span>本月综合运势：<span className="font-semibold text-accent">{average}分</span></span>
                        ) : (
                            <button
                                onClick={goToCurrentMonth}
                                className="text-foreground-secondary hover:text-accent transition-colors"
                            >
                                回到本月
                            </button>
                        )}
                    </div>
                </div>

                <button
                    onClick={() => changeMonth(1)}
                    className="p-2 rounded-lg hover:bg-background-secondary transition-colors"
                >
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>

            {/* 月度总结（仅个性化时显示） */}
            {isPersonalized && fortune && (
                <div className="bg-accent/5 border border-accent/20 rounded-xl p-4 mb-6">
                    <div className="flex items-center gap-4 mb-3 text-sm text-foreground-secondary">
                        <span>流月：{fortune.monthStem}{fortune.monthBranch}</span>
                        <span>•</span>
                        <span>十神：{fortune.tenGod}</span>
                    </div>
                    <p className="text-foreground">{fortune.summary}</p>
                </div>
            )}

            {/* 月度运势趋势图（仅个性化时显示） */}
            {isPersonalized && trendData.length > 0 && (
                <div className="bg-background-secondary rounded-xl p-4 border border-border mb-6">
                    <button
                        onClick={() => setShowTrendChart(!showTrendChart)}
                        className="w-full flex items-center justify-between"
                    >
                        <h2 className="font-semibold flex items-center gap-2">
                            <Star className="w-4 h-4 text-accent" />
                            月度运势曲线
                        </h2>
                        <ChevronDown className={`w-5 h-5 transition-transform ${showTrendChart ? 'rotate-180' : ''}`} />
                    </button>
                    {showTrendChart && (
                        <div className="mt-4">
                            <FortuneTrendChart
                                data={trendData}
                                height={280}
                                multiDimension={true}
                            />
                        </div>
                    )}
                </div>
            )}

            {/* 运势热力图 */}
            <div className="bg-background-secondary rounded-xl p-4 border border-border mb-6">
                <h2 className="font-semibold mb-4 flex items-center gap-2">
                    <Star className="w-4 h-4 text-accent" />
                    运势日历
                </h2>
                <div className="grid grid-cols-7 gap-1 text-sm">
                    {/* 星期标题 */}
                    {['日', '一', '二', '三', '四', '五', '六'].map(d => (
                        <div key={d} className="text-center text-foreground-secondary text-xs py-1">
                            {d}
                        </div>
                    ))}

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
                                    relative p-2 rounded-lg text-center cursor-pointer
                                    hover:ring-2 hover:ring-accent/50 transition-all
                                    ${isToday ? 'ring-2 ring-accent' : 'bg-background'}
                                `}
                            >
                                <div className="text-xs text-foreground-secondary">{day.day}</div>
                                <div className="flex items-center justify-center gap-0.5 mt-1">
                                    <div className={`w-2 h-2 rounded-full ${getScoreColor(day.score)}`} />
                                    {getTrendIcon(day.trend)}
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>

            {/* 重点日期（仅个性化时显示） */}
            {isPersonalized && enhancedKeyDates.length > 0 && (
                <div className="bg-background-secondary rounded-xl p-4 border border-border mb-6">
                    <h2 className="font-semibold mb-4">本月关键日期</h2>
                    <div className="space-y-3">
                        {enhancedKeyDates.map(h => {
                            const bgColor = h.type === 'lucky' || h.type === 'peak'
                                ? 'bg-green-500/10 border-green-500/20'
                                : h.type === 'warning' || h.type === 'valley'
                                    ? 'bg-red-500/10 border-red-500/20'
                                    : 'bg-amber-500/10 border-amber-500/20';
                            const textColor = h.type === 'lucky' || h.type === 'peak'
                                ? 'text-green-600'
                                : h.type === 'warning' || h.type === 'valley'
                                    ? 'text-red-600'
                                    : 'text-amber-600';
                            const typeLabel = h.type === 'lucky' ? '吉日'
                                : h.type === 'peak' ? '高峰'
                                    : h.type === 'valley' ? '低谷'
                                        : h.type === 'warning' ? '警惕'
                                            : '转折';

                            return (
                                <Link
                                    key={h.date}
                                    href={`/daily?date=${year}-${String(month).padStart(2, '0')}-${String(h.date).padStart(2, '0')}`}
                                    className={`block p-4 rounded-lg border transition-colors hover:opacity-90 ${bgColor}`}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="text-center flex-shrink-0">
                                            <div className={`text-2xl font-bold ${textColor}`}>{h.date}</div>
                                            <div className={`text-xs font-medium ${textColor}`}>{typeLabel}</div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-foreground mb-1">{h.summary}</div>
                                            <div className="text-sm text-foreground-secondary">{h.recommendation}</div>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <div className="text-sm text-foreground-secondary">综合</div>
                                            <div className={`text-lg font-bold ${textColor}`}>{h.scores.overall}</div>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* 图例 */}
            <div className="flex items-center justify-center gap-6 text-xs text-foreground-secondary mb-4">
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span>≥80分</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    <span>70-79分</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <span>&lt;70分</span>
                </div>
            </div>

            {/* 底部提示 */}
            {!isPersonalized && (
                <p className="text-center text-sm text-foreground-secondary">
                    <Link href="/bazi" className="text-accent hover:underline">
                        完成八字排盘
                    </Link>
                    {' '}获取更精准的个性化运势分析
                </p>
            )}
        </div>
    );
}

export default function MonthlyPage() {
    return (
        <LoginOverlay message="登录后查看每月运势">
            <MonthlyPageContent />
        </LoginOverlay>
    );
}

