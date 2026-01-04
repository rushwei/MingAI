/**
 * 八字结果页面
 * 
 * 'use client' 标记说明：
 * - 需要在客户端解析 URL 参数并进行八字计算
 * - 使用 useSearchParams 获取表单数据
 */
'use client';

import { useSearchParams } from 'next/navigation';
import { useMemo, Suspense } from 'react';
import Link from 'next/link';
import {
    ArrowLeft,
    User,
    Calendar,
    Sparkles,
    MessageCircle,
    Lock,
    Share2
} from 'lucide-react';
import { calculateBazi, getElementColor, getDayMasterDescription } from '@/lib/bazi';
import type { BaziFormData, CalendarType, Gender, FiveElement } from '@/types';

// 五行可视化组件
function FiveElementsChart({ elements }: { elements: Record<FiveElement, number> }) {
    const maxValue = Math.max(...Object.values(elements));
    const elementOrder: FiveElement[] = ['木', '火', '土', '金', '水'];

    return (
        <div className="space-y-3">
            {elementOrder.map(element => {
                const value = elements[element];
                const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
                const color = getElementColor(element);

                return (
                    <div key={element} className="flex items-center gap-3">
                        <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                            style={{ backgroundColor: color }}
                        >
                            {element}
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between text-sm mb-1">
                                <span>{element}</span>
                                <span className="text-foreground-secondary">{value}</span>
                            </div>
                            <div className="h-2 bg-background rounded-full overflow-hidden">
                                <div
                                    className="h-full transition-all duration-500 rounded-full"
                                    style={{
                                        width: `${percentage}%`,
                                        backgroundColor: color
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// 四柱显示组件
function FourPillarsDisplay({ fourPillars }: { fourPillars: ReturnType<typeof calculateBazi>['fourPillars'] }) {
    const pillarsData = [
        { label: '年柱', pillar: fourPillars.year },
        { label: '月柱', pillar: fourPillars.month },
        { label: '日柱', pillar: fourPillars.day },
        { label: '时柱', pillar: fourPillars.hour },
    ];

    return (
        <div className="grid grid-cols-4 gap-2 sm:gap-4">
            {pillarsData.map(({ label, pillar }) => (
                <div key={label} className="text-center">
                    <div className="text-xs text-foreground-secondary mb-2">{label}</div>
                    <div className="bg-background rounded-xl p-3 sm:p-4 border border-border space-y-2">
                        {/* 天干 */}
                        <div
                            className="text-2xl sm:text-3xl font-bold"
                            style={{ color: getElementColor(pillar.stemElement) }}
                        >
                            {pillar.stem}
                        </div>
                        {/* 地支 */}
                        <div
                            className="text-2xl sm:text-3xl font-bold"
                            style={{ color: getElementColor(pillar.branchElement) }}
                        >
                            {pillar.branch}
                        </div>
                        {/* 十神 */}
                        {pillar.tenGod && (
                            <div className="text-xs text-foreground-secondary pt-1 border-t border-border">
                                {pillar.tenGod}
                            </div>
                        )}
                    </div>
                    {/* 藏干 */}
                    <div className="mt-2 text-xs text-foreground-secondary">
                        {pillar.hiddenStems.join(' ')}
                    </div>
                </div>
            ))}
        </div>
    );
}

// 结果内容组件（需要 Suspense 边界）
function BaziResultContent() {
    const searchParams = useSearchParams();

    // 从 URL 参数解析表单数据
    const formData: BaziFormData = useMemo(() => ({
        name: searchParams.get('name') || '命主',
        gender: (searchParams.get('gender') as Gender) || 'male',
        birthYear: Number(searchParams.get('year')) || 1990,
        birthMonth: Number(searchParams.get('month')) || 1,
        birthDay: Number(searchParams.get('day')) || 1,
        birthHour: Number(searchParams.get('hour')) || 12,
        birthMinute: Number(searchParams.get('minute')) || 0,
        calendarType: (searchParams.get('calendar') as CalendarType) || 'solar',
        birthPlace: searchParams.get('place') || undefined,
    }), [searchParams]);

    // 计算八字
    const baziResult = useMemo(() => {
        try {
            return calculateBazi(formData);
        } catch (error) {
            console.error('八字计算错误:', error);
            return null;
        }
    }, [formData]);

    if (!baziResult) {
        return (
            <div className="max-w-2xl mx-auto px-4 py-8 text-center">
                <p className="text-foreground-secondary">八字计算出错，请返回重新输入</p>
                <Link href="/bazi" className="mt-4 inline-block text-accent hover:underline">
                    返回重新输入
                </Link>
            </div>
        );
    }

    const dayMasterDescription = getDayMasterDescription(baziResult.dayMaster);

    return (
        <div className="max-w-3xl mx-auto px-4 py-8 animate-fade-in">
            {/* 返回按钮 */}
            <Link
                href="/bazi"
                className="inline-flex items-center gap-2 text-foreground-secondary hover:text-foreground mb-6 transition-colors"
            >
                <ArrowLeft className="w-4 h-4" />
                返回修改信息
            </Link>

            {/* 命主信息卡片 */}
            <div className="bg-gradient-to-r from-accent/10 via-accent/5 to-transparent rounded-2xl p-6 border border-accent/20 mb-6">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center">
                        <User className="w-8 h-8 text-accent" />
                    </div>
                    <div className="flex-1">
                        <h1 className="text-xl font-bold">{formData.name}</h1>
                        <div className="flex flex-wrap gap-3 mt-1 text-sm text-foreground-secondary">
                            <span>{formData.gender === 'male' ? '男' : '女'}</span>
                            <span>•</span>
                            <span>
                                {formData.calendarType === 'lunar' ? '农历' : '公历'}
                                {formData.birthYear}年{formData.birthMonth}月{formData.birthDay}日
                            </span>
                            <span>•</span>
                            <span>日主 {baziResult.dayMaster}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 四柱八字 */}
            <section className="mb-8">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-accent" />
                    四柱八字
                </h2>
                <div className="bg-background-secondary rounded-xl p-4 sm:p-6 border border-border">
                    <FourPillarsDisplay fourPillars={baziResult.fourPillars} />
                </div>
            </section>

            {/* 五行分析 */}
            <section className="mb-8">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <div className="w-5 h-5 rounded bg-gradient-to-r from-green-500 via-red-500 to-blue-500" />
                    五行分析
                </h2>
                <div className="bg-background-secondary rounded-xl p-6 border border-border">
                    <FiveElementsChart elements={baziResult.fiveElements} />
                </div>
            </section>

            {/* 日主解读 */}
            <section className="mb-8">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <User className="w-5 h-5 text-accent" />
                    日主特征
                </h2>
                <div className="bg-background-secondary rounded-xl p-6 border border-border">
                    <div className="flex items-start gap-4">
                        <div
                            className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl font-bold text-white flex-shrink-0"
                            style={{ backgroundColor: getElementColor(baziResult.fourPillars.day.stemElement) }}
                        >
                            {baziResult.dayMaster}
                        </div>
                        <div>
                            <div className="font-medium mb-2">
                                您的日主是「{baziResult.dayMaster}」，五行属{baziResult.fourPillars.day.stemElement}
                            </div>
                            <p className="text-foreground-secondary leading-relaxed">
                                {dayMasterDescription}
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* 深度解读 - 付费入口 */}
            <section className="mb-8">
                <div className="bg-gradient-to-r from-accent/5 via-accent/10 to-accent/5 rounded-xl p-6 border border-accent/20">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <Lock className="w-5 h-5 text-accent" />
                            AI 深度解读
                        </h2>
                        <span className="text-sm text-accent font-medium">¥19.9</span>
                    </div>
                    <p className="text-foreground-secondary text-sm mb-4">
                        解锁完整的八字分析报告，包括事业、感情、财运、健康等全面解读，以及未来十年大运走势分析。
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <button className="flex-1 py-3 px-4 rounded-lg bg-accent text-white font-medium hover:bg-accent/90 transition-colors">
                            解锁完整报告
                        </button>
                        <Link
                            href="/chat"
                            className="flex-1 py-3 px-4 rounded-lg border border-border text-center font-medium hover:border-accent hover:text-accent transition-colors flex items-center justify-center gap-2"
                        >
                            <MessageCircle className="w-4 h-4" />
                            与 AI 命理师对话
                        </Link>
                    </div>
                </div>
            </section>

            {/* 操作按钮 */}
            <div className="flex gap-3">
                <Link
                    href="/bazi"
                    className="flex-1 py-3 px-4 rounded-lg border border-border text-center font-medium hover:border-accent hover:text-accent transition-colors"
                >
                    重新排盘
                </Link>
                <button className="flex items-center justify-center gap-2 py-3 px-6 rounded-lg bg-background-secondary border border-border hover:border-accent transition-colors">
                    <Share2 className="w-4 h-4" />
                    分享
                </button>
            </div>
        </div>
    );
}

// 主页面组件
export default function BaziResultPage() {
    return (
        <Suspense fallback={
            <div className="max-w-2xl mx-auto px-4 py-8 text-center">
                <div className="inline-block w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
                <p className="mt-4 text-foreground-secondary">正在计算八字命盘...</p>
            </div>
        }>
            <BaziResultContent />
        </Suspense>
    );
}
