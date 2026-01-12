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
    Check,
    X,
    Share2
} from 'lucide-react';
import { LoginOverlay } from '@/components/auth/LoginOverlay';
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
import type { BaziChart } from '@/types';

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

    if (loading) {
        return (
            <div className="max-w-2xl mx-auto px-4 py-8 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto" />
                <p className="mt-4 text-foreground-secondary">加载中...</p>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto px-4 py-8 animate-fade-in">
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
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-background rounded-2xl p-6 max-w-md w-full" style={{ maxHeight: 'calc(100vh - 32px)' }}>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold">分享运势卡片</h2>
                            <button
                                onClick={() => setShowShareCard(false)}
                                className="p-2 rounded-lg hover:bg-background-secondary transition-colors"
                            >
                                <X className="w-5 h-5" />
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


            {/* 日期选择器 */}
            <div className="flex items-center justify-between mb-8">
                <button
                    onClick={() => changeDate(-1)}
                    className="p-2 rounded-lg hover:bg-background-secondary transition-colors"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>

                <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                        <CalendarIcon className="w-5 h-5 text-accent" />
                        <span className="font-semibold">{formatDate(selectedDate)}</span>
                    </div>
                    {isToday ? (
                        <span className="text-sm text-accent">今日黄历</span>
                    ) : (
                        <button
                            onClick={goToToday}
                            className="text-sm text-foreground-secondary hover:text-accent transition-colors"
                        >
                            回到今天
                        </button>
                    )}
                </div>

                <button
                    onClick={() => changeDate(1)}
                    className="p-2 rounded-lg hover:bg-background-secondary transition-colors"
                >
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>

            {/* 黄历信息 */}
            <div className="mb-8">
                <CalendarAlmanac date={selectedDate} />
            </div>

            {/* 个性化提示 */}
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

            {/* 流日信息（仅个性化时显示） */}
            {isPersonalized && fortune.dayStem && (
                <div className="flex items-center justify-center gap-4 mb-4 text-sm text-foreground-secondary">
                    <span>流日：{fortune.dayStem}{fortune.dayBranch}</span>
                    <span>•</span>
                    <span>十神：{fortune.tenGod}</span>
                </div>
            )}

            {/* 周运势趋势图（仅个性化时显示） */}
            {isPersonalized && trendData.length > 0 && (
                <section className="bg-background rounded-xl border border-border p-4 mb-4">
                    <button
                        onClick={() => setShowTrendChart(!showTrendChart)}
                        className="w-full flex items-center justify-between"
                    >
                        <h2 className="font-semibold flex items-center gap-2">
                            <Star className="w-5 h-5 text-accent" />
                            7日运势趋势
                        </h2>
                        <ChevronDown className={`w-5 h-5 transition-transform ${showTrendChart ? 'rotate-180' : ''}`} />
                    </button>
                    {showTrendChart && (
                        <div className="mt-4">
                            <FortuneTrendChart
                                data={trendData}
                                selectedDate={fortune.date}
                                height={200}
                                multiDimension={false}
                            />
                        </div>
                    )}
                </section>
            )}

            {/* 八字运势模块 - 统一白色背景 */}
            <section className="bg-background rounded-xl border border-border p-4 mb-8">
                {/* 模块标题和分享按钮 */}
                <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold flex items-center gap-2">
                        <Star className="w-5 h-5 text-accent" />
                        {isToday ? '今日' : formatDate(selectedDate).split(' ')[0]}运势
                    </h2>
                    <button
                        onClick={() => setShowShareCard(true)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
                    >
                        <Share2 className="w-4 h-4" />
                        <span>分享</span>
                    </button>
                </div>
                {/* 运势评分 */}
                <div className="space-y-3 mb-6">
                    {scoreItems.map(item => {
                        const score = fortune[item.key as keyof typeof fortune] as number;
                        const Icon = item.icon;

                        return (
                            <div key={item.key} className="py-2">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                        <Icon className={`w-5 h-5 ${item.color}`} />
                                        <span className="font-medium">{item.label}</span>
                                    </div>
                                    <span className="text-lg font-bold">{score}</span>
                                </div>
                                <div className="h-2 bg-background-secondary rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-500 rounded-full ${score >= 80 ? 'bg-green-500' :
                                            score >= 60 ? 'bg-amber-500' :
                                                'bg-red-500'
                                            }`}
                                        style={{ width: `${score}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* 幸运信息（仅个性化时显示） */}
                {isPersonalized && fortune.luckyColor && (
                    <div className="grid grid-cols-2 gap-4 py-4 border-t border-border">
                        <div>
                            <div className="flex items-center gap-2 text-foreground-secondary mb-1">
                                <div className="w-4 h-4 rounded-full bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500" />
                                <span className="text-sm">幸运色</span>
                            </div>
                            <span className="font-medium">{fortune.luckyColor}</span>
                        </div>
                        <div>
                            <div className="flex items-center gap-2 text-foreground-secondary mb-1">
                                <Compass className="w-4 h-4" />
                                <span className="text-sm">吉方位</span>
                            </div>
                            <span className="font-medium">{fortune.luckyDirection}</span>
                        </div>
                    </div>
                )}

                {/* 今日建议 */}
                <div className="pt-4 border-t border-border">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold flex items-center gap-2">
                            <Star className="w-5 h-5 text-accent" />
                            {isToday ? '今日' : formatDate(selectedDate).split(' ')[0]}建议
                        </h3>
                        {isPersonalized && (
                            <InterpretationModeToggle
                                mode={interpretationMode}
                                onModeChange={setInterpretationMode}
                                compact
                            />
                        )}
                    </div>
                    <ul className="space-y-2">
                        {interpretedAdvice.map((advice, index) => (
                            <li key={index} className="flex items-start gap-3">
                                <span className="w-5 h-5 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0 text-accent text-xs">
                                    {index + 1}
                                </span>
                                <span className="text-foreground-secondary text-sm">{advice}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </section>

            {/* 底部提示 */}
            {!isPersonalized && (
                <p className="text-center text-sm text-foreground-secondary mt-6 mb-8">
                    <Link href="/bazi" className="text-accent hover:underline">
                        完成八字排盘
                    </Link>
                    {' '}获取更精准的个性化运势分析
                </p>
            )}

            {/* AI智能问答 */}
            <div className="mt-8">
                <DailyAIChat date={selectedDate} userId={userId} />
            </div>
        </div>
    );
}

export default function DailyPage() {
    return (
        <LoginOverlay message="登录后查看每日运势">
            <Suspense fallback={
                <div className="max-w-2xl mx-auto px-4 py-8 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto" />
                    <p className="mt-4 text-foreground-secondary">加载中...</p>
                </div>
            }>
                <DailyPageContent />
            </Suspense>
        </LoginOverlay>
    );
}

