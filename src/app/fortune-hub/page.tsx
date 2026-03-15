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
    Orbit,
    ScanFace,
    Hand,
} from 'lucide-react';
import { useFeatureToggles } from '@/lib/hooks/useFeatureToggles';
import { FeatureGate } from '@/components/layout/FeatureGate';


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
    {
        id: 'face',
        name: '面相分析',
        description: 'AI 解读面部特征与运势',
        icon: ScanFace,
        href: '/face',
        color: 'from-teal-500/20 to-emerald-500/20 border-teal-500/30',
        iconColor: 'text-teal-500',
    },
    {
        id: 'palm',
        name: '手相分析',
        description: 'AI 解读掌纹与命运线',
        icon: Hand,
        href: '/palm',
        color: 'from-orange-500/20 to-rose-500/20 border-orange-500/30',
        iconColor: 'text-orange-500',
    },
];

function FortuneHubContent() {
    const { isFeatureEnabled } = useFeatureToggles();
    const enabledServices = FORTUNE_SERVICES.filter(s => isFeatureEnabled(s.id));

    // 获取今日日期
    const today = new Date();
    const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    const weekday = weekdays[today.getDay()];

    return (
        <div className="sm:min-h-screen bg-background md:pb-12">
            {/* 顶部 Hero 区域 - 移动端隐藏（全宽设计） */}
            <div className="hidden md:block relative overflow-hidden bg-background-secondary/30 border-b border-border/50">
                <div className="absolute inset-0 bg-grid-pattern opacity-5 pointer-events-none" />
                <div className="max-w-4xl mx-auto px-4 pt-16 pb-8 text-center relative z-10">
                    <div className="inline-flex items-center justify-center p-4 rounded-2xl mb-6 shadow-lg shadow-emerald-500/10">
                        <Compass className="w-12 h-12 text-emerald-500" />
                    </div>
                    <h1 className="text-4xl font-bold text-emerald-600 dark:text-emerald-400 mb-4 tracking-tight">
                        运势中心
                    </h1>
                    <p className="text-lg text-foreground-secondary max-w-2xl mx-auto leading-relaxed">
                        探索东方玄学与现代科技的完美融合，
                        <br className="hidden sm:block" />
                        开启您的个性化命运探索之旅。
                    </p>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 sm:py-8 pt-4">
                {/* 今日概览 */}
                <div className="bg-gradient-to-br from-background-secondary to-background border border-border/60 rounded-2xl p-6 sm:mb-10 mb-4 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl group-hover:bg-emerald-500/10 transition-colors duration-500" />

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <span className="px-3 py-1 bg-background rounded-full border border-border text-xs font-medium text-foreground-secondary">
                                    {dateStr}
                                </span>
                                <span className="px-3 py-1 bg-background rounded-full border border-border text-xs font-medium text-foreground-secondary">
                                    星期{weekday}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-emerald-500" />
                                <span className="text-lg font-bold text-foreground">探索今日运势</span>
                            </div>
                        </div>

                        <div className="flex-1 md:text-right">
                            <div className="text-sm font-medium text-foreground-secondary">
                                完成八字排盘后，即可查看个性化每日运势
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between mb-2 md:mb-6">
                    <h2 className="text-base md:text-xl font-bold text-foreground flex items-center gap-2">
                        <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-amber-500" />
                        精选服务
                    </h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-5 mb-4 md:mb-10">
                    {enabledServices.map((service) => {
                        const Icon = service.icon;
                        return (
                            <Link
                                key={service.id}
                                href={service.href}
                                className={`
                                    relative overflow-hidden
                                    bg-background rounded-xl md:rounded-2xl p-3 md:p-5 border border-border/50
                                    hover:border-transparent hover:shadow-xl hover:-translate-y-1
                                    transition-all duration-300 group
                                `}
                            >
                                <div className={`absolute inset-0 bg-gradient-to-br ${service.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

                                <div className="relative z-10 flex flex-col h-full">
                                    <div className="flex items-start justify-between mb-2 md:mb-4">
                                        <div className={`
                                            p-2 md:p-3 rounded-lg md:rounded-xl bg-background-secondary/80 backdrop-blur-sm
                                            group-hover:bg-white/90 dark:group-hover:bg-black/20
                                            transition-colors duration-300
                                        `}>
                                            <Icon className={`w-5 h-5 md:w-6 md:h-6 ${service.iconColor}`} />
                                        </div>
                                        <div className="hidden md:flex w-8 h-8 rounded-full bg-background/50 items-center justify-center opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-300 delay-75">
                                            <ArrowRight className="w-4 h-4 text-foreground-secondary" />
                                        </div>
                                    </div>

                                    <div className="mt-auto">
                                        <h3 className="text-sm md:text-lg font-bold text-foreground mb-0.5 md:mb-1 group-hover:text-foreground-primary transition-colors">
                                            {service.name}
                                        </h3>
                                        <p className="text-xs text-foreground-secondary group-hover:text-foreground-secondary/90 line-clamp-1 md:line-clamp-2">
                                            {service.description}
                                        </p>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>

                {/* 使用提示 */}
                <div className="sm:block hidden bg-background-secondary/50 rounded-xl p-6 border border-border/50">
                    <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                        <span className="w-1 h-4 bg-emerald-500 rounded-full" />
                        使用指南
                    </h3>
                    <ul className="grid md:grid-cols-2 gap-3 text-sm text-foreground-secondary">
                        <li className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                            <span><strong>八字命理</strong>：需要准确的出生年月日时，分析先天命格</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5 flex-shrink-0" />
                            <span><strong>紫微斗数</strong>：东方占星系统，适合了解人生大方向</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-pink-500 mt-1.5 flex-shrink-0" />
                            <span><strong>塔罗牌</strong>：适合询问具体问题，获取当下指引</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 mt-1.5 flex-shrink-0" />
                            <span><strong>六爻占卜</strong>：适合预测事情发展走向</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                            <span><strong>关系合盘</strong>：分析两人之间的缘分契合度</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                            <span><strong>MBTI 测试</strong>：了解自己的性格特点和优势</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-1.5 flex-shrink-0" />
                            <span><strong>面相分析</strong>：上传正面照片，AI 解读面部特征</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 flex-shrink-0" />
                            <span><strong>手相分析</strong>：上传手掌照片，AI 解读掌纹命理</span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
}

export default function FortuneHubPage() {
    return (
        <FeatureGate featureId="fortune-hub">
            <FortuneHubContent />
        </FeatureGate>
    );
}
