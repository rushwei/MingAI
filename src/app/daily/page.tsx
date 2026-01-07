/**
 * 每日运势页面
 * 
 * 'use client' 标记说明：
 * - 需要日期交互，在客户端运行
 */
'use client';

import { useState, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    Briefcase,
    Heart,
    Wallet,
    Activity,
    Star,
    Loader2
} from 'lucide-react';
import { LoginOverlay } from '@/components/auth/LoginOverlay';

// 基于日期生成运势分数（简易伪随机算法）
function generateFortuneForDate(date: Date) {
    const seed = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();

    // 简单的伪随机函数
    const random = (offset: number) => {
        const x = Math.sin(seed + offset) * 10000;
        return Math.floor((x - Math.floor(x)) * 40) + 55; // 55-95 范围
    };

    const overall = random(1);
    const career = random(2);
    const love = random(3);
    const wealth = random(4);
    const health = random(5);

    // 根据运势生成建议
    const advices = [
        overall >= 75 ? '整体运势良好，适合开展新计划' : '今日宜稳健行事，不宜冒进',
        career >= 70 ? '工作上有贵人相助，把握机会' : '职场上需多加耐心，避免冲突',
        wealth >= 70 ? '财运亨通，可适当投资' : '守财为主，避免大额消费',
        health >= 70 ? '精力充沛，适合运动健身' : '注意休息，避免过度劳累',
    ];

    return { overall, career, love, wealth, health, advice: advices };
}

const scoreItems = [
    { key: 'overall', label: '综合运势', icon: Star, color: 'text-amber-500' },
    { key: 'career', label: '事业运', icon: Briefcase, color: 'text-blue-500' },
    { key: 'love', label: '感情运', icon: Heart, color: 'text-pink-500' },
    { key: 'wealth', label: '财运', icon: Wallet, color: 'text-green-500' },
    { key: 'health', label: '健康运', icon: Activity, color: 'text-red-500' },
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

    // 当 URL 参数变化时同步日期（例如从月历页面跳转）
    // 如果没有 date 参数，重置为今天
    useEffect(() => {
        const dateParam = searchParams.get('date');
        if (dateParam) {
            const newDate = parseDateParam(dateParam);
            setSelectedDate(newDate);
        } else {
            // 无参数时重置为今天
            setSelectedDate(new Date());
        }
    }, [searchParams]);

    // 使用 useMemo 基于日期计算运势
    const fortune = useMemo(() => generateFortuneForDate(selectedDate), [selectedDate]);

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

    const isToday = selectedDate.toDateString() === new Date().toDateString();

    return (
        <div className="max-w-2xl mx-auto px-4 py-8 animate-fade-in">
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
                        <span className="text-sm text-accent">今日运势</span>
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

            {/* 运势评分 */}
            <div className="space-y-4 mb-8">
                {scoreItems.map(item => {
                    const score = fortune[item.key as keyof typeof fortune] as number;
                    const Icon = item.icon;

                    return (
                        <div key={item.key} className="bg-background-secondary rounded-xl p-4 border border-border">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                    <Icon className={`w-5 h-5 ${item.color}`} />
                                    <span className="font-medium">{item.label}</span>
                                </div>
                                <span className="text-lg font-bold">{score}</span>
                            </div>
                            <div className="h-2 bg-background rounded-full overflow-hidden">
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

            {/* 今日建议 */}
            <div className="bg-background-secondary rounded-xl p-6 border border-border">
                <h2 className="font-semibold mb-4 flex items-center gap-2">
                    <Star className="w-5 h-5 text-accent" />
                    {isToday ? '今日' : formatDate(selectedDate).split(' ')[0]}建议
                </h2>
                <ul className="space-y-3">
                    {fortune.advice.map((advice, index) => (
                        <li key={index} className="flex items-start gap-3">
                            <span className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0 text-accent text-sm">
                                {index + 1}
                            </span>
                            <span className="text-foreground-secondary">{advice}</span>
                        </li>
                    ))}
                </ul>
            </div>

            {/* 提示 */}
            <p className="text-center text-sm text-foreground-secondary mt-6">
                运势分析基于您的八字命盘生成，请先完成八字排盘获取个性化运势
            </p>
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
