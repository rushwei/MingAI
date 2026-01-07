/**
 * 每月运势页面
 */
'use client';

import { useState, useMemo } from 'react';
import {
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    TrendingUp,
    TrendingDown,
    Minus,
    Star
} from 'lucide-react';
import Link from 'next/link';
import { LoginOverlay } from '@/components/auth/LoginOverlay';

// 基于日期的伪随机函数
function seededRandom(seed: number, offset: number): number {
    const x = Math.sin(seed + offset) * 10000;
    return x - Math.floor(x);
}

// 生成月度运势数据（基于年月的确定性计算）
function generateMonthlyFortune(year: number, month: number) {
    const daysInMonth = new Date(year, month, 0).getDate();
    const baseSeed = year * 100 + month;
    const days = [];

    for (let day = 1; day <= daysInMonth; day++) {
        const daySeed = baseSeed * 100 + day;
        const score = Math.floor(seededRandom(daySeed, 1) * 40) + 55; // 55-95
        days.push({
            day,
            score,
            trend: score >= 80 ? 'up' : score <= 65 ? 'down' : 'neutral',
        });
    }

    // 确定性生成重点日期
    const highlightDays = [
        Math.floor(seededRandom(baseSeed, 10) * 8) + 5,   // 5-12
        Math.floor(seededRandom(baseSeed, 20) * 7) + 13,  // 13-19
        Math.floor(seededRandom(baseSeed, 30) * 8) + 20,  // 20-27
    ];

    const highlightLabels = ['贵人日', '财运旺', '宜决策', '桃花运', '健康佳'];

    return {
        year,
        month,
        days,
        average: Math.floor(days.reduce((sum, d) => sum + d.score, 0) / days.length),
        highlights: highlightDays.map((day, i) => ({
            day,
            label: highlightLabels[i % highlightLabels.length],
        })),
    };
}

const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];

function MonthlyPageContent() {
    const today = new Date();
    const [year, setYear] = useState(today.getFullYear());
    const [month, setMonth] = useState(today.getMonth() + 1);

    const fortune = useMemo(() => generateMonthlyFortune(year, month), [year, month]);

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

    return (
        <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in">
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
                            <span>本月综合运势：<span className="font-semibold text-accent">{fortune.average}分</span></span>
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

                    {fortune.days.map(day => {
                        const isToday = year === today.getFullYear() &&
                            month === today.getMonth() + 1 &&
                            day.day === today.getDate();
                        const highlight = fortune.highlights.find(h => h.day === day.day);

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
                                {highlight && (
                                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-accent rounded-full" />
                                )}
                            </Link>
                        );
                    })}
                </div>
            </div>

            {/* 重点日期 */}
            <div className="bg-background-secondary rounded-xl p-4 border border-border mb-6">
                <h2 className="font-semibold mb-3">本月重点日期</h2>
                <div className="grid grid-cols-3 gap-3">
                    {fortune.highlights.map(h => (
                        <Link
                            key={h.day}
                            href={`/daily?date=${year}-${String(month).padStart(2, '0')}-${String(h.day).padStart(2, '0')}`}
                            className="p-3 bg-accent/10 rounded-lg text-center hover:bg-accent/20 transition-colors"
                        >
                            <div className="text-2xl font-bold text-accent">{h.day}</div>
                            <div className="text-xs text-foreground-secondary">{h.label}</div>
                        </Link>
                    ))}
                </div>
            </div>

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

            {/* 提示 */}
            <p className="text-center text-sm text-foreground-secondary">
                运势分析基于您的八字命盘，
                <Link href="/bazi" className="text-accent hover:underline">
                    先完成八字排盘
                </Link>
                获取个性化运势
            </p>
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
