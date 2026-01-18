/**
 * 运势中心聚合页面
 */
'use client';

import Link from 'next/link';
import {
    Compass,
    Sparkles,
    Brain,
    ArrowRight,
    TrendingUp,
    HeartHandshake,
    Gem,
    Dices,
    Orbit
} from 'lucide-react';


const FORTUNE_SERVICES = [
    {
        id: 'bazi',
        name: '八字命理',
        description: '根据出生时间分析命格运势',
        icon: Orbit,
        href: '/bazi',
        color: 'from-amber-500/20 to-orange-500/20 border-amber-500/30',
        iconColor: 'text-amber-500',
    },
    {
        id: 'ziwei',
        name: '紫微斗数',
        description: '东方占星术，解析命盘格局',
        icon: Sparkles,
        href: '/ziwei',
        color: 'from-purple-500/20 to-indigo-500/20 border-purple-500/30',
        iconColor: 'text-purple-500',
    },
    {
        id: 'tarot',
        name: '塔罗牌',
        description: '抽取塔罗牌，获取指引',
        icon: Gem,
        href: '/tarot',
        color: 'from-pink-500/20 to-rose-500/20 border-pink-500/30',
        iconColor: 'text-pink-500',
    },
    {
        id: 'liuyao',
        name: '六爻占卜',
        description: '周易六爻，预测事物发展',
        icon: Dices,
        href: '/liuyao',
        color: 'from-yellow-500/20 to-amber-500/20 border-yellow-500/30',
        iconColor: 'text-yellow-500',
    },
    {
        id: 'hepan',
        name: '关系合盘',
        description: '分析双方八字的缘分契合度',
        icon: HeartHandshake,
        href: '/hepan',
        color: 'from-red-500/20 to-pink-500/20 border-red-500/30',
        iconColor: 'text-red-500',
    },
    {
        id: 'mbti',
        name: 'MBTI 测试',
        description: '探索你的性格类型',
        icon: Brain,
        href: '/mbti',
        color: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30',
        iconColor: 'text-blue-500',
    },
];

function FortuneHubContent() {
    // 获取今日日期
    const today = new Date();
    const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    const weekday = weekdays[today.getDay()];

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-4xl mx-auto px-4 py-8">
                {/* 标题 */}
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center mb-4">
                        <Compass className="w-12 h-12 text-emerald-500" />
                    </div>
                    <h1 className="text-3xl font-bold text-foreground">运势中心</h1>
                    <p className="text-foreground-secondary mt-2">
                        探索命运的奥秘，发现更好的自己
                    </p>
                </div>

                {/* 今日概览 */}
                <div className="bg-background-secondary border border-border rounded-2xl p-6 mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className="text-sm text-foreground-secondary">今日日期</p>
                            <p className="text-lg font-semibold text-foreground">
                                {dateStr} 星期{weekday}
                            </p>
                        </div>
                        <div className="flex items-center gap-2 text-accent">
                            <TrendingUp className="w-5 h-5" />
                            <span className="font-medium">综合运势：良好</span>
                        </div>
                    </div>
                    <p className="text-sm text-foreground-secondary">
                        今日宜：学习、交友、思考规划
                        <br />
                        今日忌：冲动决策、争执对抗
                    </p>
                </div>

                {/* 服务列表 */}
                <div className="grid md:grid-cols-2 gap-4 mb-8">
                    {FORTUNE_SERVICES.map((service) => {
                        const Icon = service.icon;
                        return (
                            <Link
                                key={service.id}
                                href={service.href}
                                className={`bg-gradient-to-br ${service.color} border rounded-xl p-5
                                    transition-all hover:shadow-lg hover:scale-[1.02] group`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-background/50 rounded-xl">
                                        <Icon className={`w-6 h-6 ${service.iconColor}`} />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-foreground">{service.name}</h3>
                                        <p className="text-sm text-foreground-secondary">
                                            {service.description}
                                        </p>
                                    </div>
                                    <ArrowRight className="w-5 h-5 text-foreground-secondary 
                                        group-hover:text-foreground group-hover:translate-x-1 transition-all" />
                                </div>
                            </Link>
                        );
                    })}
                </div>

                {/* 使用提示 */}
                <div className="bg-background-secondary/50 rounded-xl p-6">
                    <h3 className="font-semibold text-foreground mb-3">💡 使用提示</h3>
                    <ul className="space-y-2 text-sm text-foreground-secondary">
                        <li>• <strong>八字命理</strong>：需要准确的出生年月日时，分析先天命格</li>
                        <li>• <strong>紫微斗数</strong>：东方占星系统，适合了解人生大方向</li>
                        <li>• <strong>塔罗牌</strong>：适合询问具体问题，获取当下指引</li>
                        <li>• <strong>六爻占卜</strong>：适合预测事情发展走向</li>
                        <li>• <strong>关系合盘</strong>：分析两人之间的缘分契合度</li>
                        <li>• <strong>MBTI 测试</strong>：了解自己的性格特点和优势</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}

export default function FortuneHubPage() {
    return (
        <FortuneHubContent />
    );
}
