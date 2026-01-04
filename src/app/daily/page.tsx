/**
 * 每日运势页面
 * 
 * 'use client' 标记说明：
 * - 需要日期交互，在客户端运行
 */
'use client';

import { useState } from 'react';
import {
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    Briefcase,
    Heart,
    Wallet,
    Activity,
    Star
} from 'lucide-react';

// 模拟的运势数据
const mockFortune = {
    overall: 78,
    career: 82,
    love: 70,
    wealth: 75,
    health: 85,
    advice: [
        '今日适合与人沟通交流，可能有好消息传来',
        '财运平稳，不宜大额投资',
        '注意休息，避免过度劳累',
    ],
};

const scoreItems = [
    { key: 'overall', label: '综合运势', icon: Star, color: 'text-amber-500' },
    { key: 'career', label: '事业运', icon: Briefcase, color: 'text-blue-500' },
    { key: 'love', label: '感情运', icon: Heart, color: 'text-pink-500' },
    { key: 'wealth', label: '财运', icon: Wallet, color: 'text-green-500' },
    { key: 'health', label: '健康运', icon: Activity, color: 'text-red-500' },
];

export default function DailyPage() {
    const [selectedDate, setSelectedDate] = useState(new Date());

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
                    {isToday && (
                        <span className="text-sm text-accent">今日运势</span>
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
                    const score = mockFortune[item.key as keyof typeof mockFortune] as number;
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
                    今日建议
                </h2>
                <ul className="space-y-3">
                    {mockFortune.advice.map((advice, index) => (
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
