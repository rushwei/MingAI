/**
 * 关系合盘主页面
 */
'use client';

import Link from 'next/link';
import { Heart, Briefcase, Users, ArrowRight, HeartHandshake } from 'lucide-react';
import { type HepanType, getHepanTypeName } from '@/lib/hepan';

import { HistoryDrawer } from '@/components/layout/HistoryDrawer';

const HEPAN_TYPES: { type: HepanType; icon: typeof Heart; color: string; bg: string; description: string }[] = [
    {
        type: 'love',
        icon: Heart,
        color: 'text-rose-500',
        bg: 'bg-rose-500',
        description: '分析情侣或夫妻的八字配对，了解感情走向和相处之道',
    },
    {
        type: 'business',
        icon: Briefcase,
        color: 'text-blue-500',
        bg: 'bg-blue-500',
        description: '分析商业伙伴的八字配合，预测合作前景和互补优势',
    },
    {
        type: 'family',
        icon: Users,
        color: 'text-emerald-500',
        bg: 'bg-emerald-500',
        description: '分析亲子关系的八字匹配，改善家庭沟通与教育方式',
    },
];

function HepanPageContent() {
    return (
        <div className="min-h-screen bg-background pb-20">
            {/* 顶部 Hero 区域 */}
            <div className="relative overflow-hidden pt-24 pb-16">
                <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]" />
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-rose-500/5 rounded-full blur-[100px] translate-x-1/2 -translate-y-1/2 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[100px] -translate-x-1/2 translate-y-1/2 pointer-events-none" />

                <div className="max-w-4xl mx-auto px-4 relative z-10 text-center animate-fade-in-up">
                    <div className="inline-flex items-center justify-center p-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl mb-8 shadow-2xl shadow-rose-500/10">
                        <HeartHandshake className="w-12 h-12 text-rose-500" />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6 tracking-tight">
                        关系合盘
                    </h1>
                    <p className="text-lg md:text-xl text-foreground-secondary max-w-2xl mx-auto leading-relaxed">
                        探索人与人之间微妙的能量场，通过八字命理深度解读双方的缘分契合度，为您的人际关系提供指引。
                    </p>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 py-8 relative z-10">
                {/* 合盘类型选择 */}
                <div className="grid md:grid-cols-3 gap-6 mb-16">
                    {HEPAN_TYPES.map(({ type, icon: Icon, color, bg, description }) => {
                        return (
                            <Link
                                key={type}
                                href={`/hepan/create?type=${type}`}
                                className="group relative bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-8
                                    hover:bg-white/10 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                            >
                                <div className={`w-16 h-16 rounded-2xl ${bg} flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                                    <Icon className="w-8 h-8 text-white" />
                                </div>

                                <h3 className="text-xl font-bold text-foreground mb-3 group-hover:text-foreground transition-colors">
                                    {getHepanTypeName(type)}
                                </h3>

                                <p className="text-sm text-foreground-secondary leading-relaxed mb-8 h-10">
                                    {description}
                                </p>

                                <div className="flex items-center justify-between text-sm font-medium">
                                    <span className="text-foreground-secondary group-hover:text-foreground transition-colors">开始分析</span>
                                    <div className={`p-2 rounded-full ${bg}/10 ${color} group-hover:bg-white group-hover:text-foreground transition-all duration-300`}>
                                        <ArrowRight className="w-4 h-4" />
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>

                {/* 说明部分 */}
                <div className="bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 overflow-hidden">
                    <div className="p-8 md:p-12">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="h-8 w-1 bg-rose-500 rounded-full" />
                            <h3 className="text-xl font-bold text-foreground">合盘原理解析</h3>
                        </div>

                        <div className="grid md:grid-cols-2 gap-x-12 gap-y-10 text-sm text-foreground-secondary/90">
                            <div className="space-y-3">
                                <h4 className="flex items-center gap-2 font-bold text-base text-foreground">
                                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                    什么是八字合盘？
                                </h4>
                                <p className="leading-relaxed pl-3.5 border-l border-white/10">
                                    八字合盘是根据两个人的出生时间，分析双方八字中天干地支的生克关系，
                                    从而判断两人的缘分深浅和相处方式。它不仅看表面性格，更深入灵魂契合度。
                                </p>
                            </div>
                            <div className="space-y-3">
                                <h4 className="flex items-center gap-2 font-bold text-base text-foreground">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                    多维分析视角
                                </h4>
                                <p className="leading-relaxed pl-3.5 border-l border-white/10">
                                    我们的 AI 算法综合考量五行互补、日柱吸引力、神煞配合以及年柱根基。
                                    针对情感、事业、家庭不同场景，侧重点各有不同，提供最具针对性的建议。
                                </p>
                            </div>
                            <div className="space-y-3">
                                <h4 className="flex items-center gap-2 font-bold text-base text-foreground">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    所需信息
                                </h4>
                                <p className="leading-relaxed pl-3.5 border-l border-white/10">
                                    需要双方准确的出生年、月、日、时（农历或公历均可）。
                                    出生时辰的准确性对分析结果的精准度有重要影响，建议尽量精确到小时。
                                </p>
                            </div>
                            <div className="space-y-3">
                                <h4 className="flex items-center gap-2 font-bold text-base text-foreground">
                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                    理性看待
                                </h4>
                                <p className="leading-relaxed pl-3.5 border-l border-white/10">
                                    命理分析揭示的是先天能量的匹配趋势，而非绝对的宿命。
                                    真正的良性关系，永远需要双方后天的共同经营、理解与包容。
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 历史记录抽屉 */}
            <HistoryDrawer type="hepan" />
        </div>
    );
}

export default function HepanPage() {
    return (
        <HepanPageContent />
    );
}
