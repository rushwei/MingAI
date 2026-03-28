/**
 * 帮助中心页面
 * 
 * 提供常见问题、使用指南和联系方式
 */
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FeatureGate } from '@/components/layout/FeatureGate';
import {
    ChevronDown,
    Mail,
} from 'lucide-react';

interface FAQItem {
    question: string;
    answer: string;
}

const faqList: FAQItem[] = [
    {
        question: 'AI服务是否免费？',
        answer: 'AI服务目前是基于公益站提供的，用户可以免费使用，但会有使用次数限制、模型不可访问等情况。如果公益站关闭，AI服务可能会受到影响，我们会尽力寻找替代方案以保证服务的连续性。',
    },
    {
        question: 'AI对话的次数有多少？',
        answer: '现在暂时只支持每日3次的对话次数，后续可能会增加，每天0点会重置。我们会根据用户的反馈和使用情况，适时调整这个限制，以提供更好的服务体验。',
    },
    {
        question: 'AI分析的结果为什么有时候不太准确？',
        answer: 'AI分析基于大量数据和算法，但仍可能存在误差。建议结合自身情况和专业命理师的建议进行参考。',
    },
    {
        question: '为什么我的日运/月运功能缺少了？',
        answer: '因为没有设置默认命盘，在我的命盘中设置一个默认命盘后，日运/月运功能会优先使用默认命盘进行分析。设置默认命盘后，你的日运/月运分析将更加个性化和准确。',
    },
    {
        question: '为什么真太阳时和出生时间不一致？',
        answer: '真太阳时是根据出生地的经度计算的太阳时间，可能与出生时间存在差异。计算真太阳服务是基于高德地图api，可能会出现额度用完的情况',
    },
    {
        question: '紫微斗数和八字有什么区别？',
        answer: '八字命理基于天干地支推算命运，侧重五行生克；紫微斗数则以紫微星为主星，通过十二宫位分析人生各方面。两者各有特色，可互相参照。',
    },
];

export default function HelpPage() {
    const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);

    return (
        <FeatureGate featureId="help">
        <div className="min-h-screen bg-background text-foreground">
            <div className="max-w-3xl mx-auto px-4 py-8 animate-fade-in space-y-10">
                {/* 标题 */}
                <header className="space-y-1">
                    <h1 className="text-2xl font-bold">帮助中心</h1>
                    <p className="text-sm text-foreground/50">了解如何更好地使用 MingAI</p>
                </header>

                {/* 常见问题 */}
                <section className="space-y-4">
                    <h2 className="text-[11px] font-semibold text-foreground/40 uppercase tracking-widest px-1">常见问题</h2>
                    <div className="bg-background border border-border rounded-md overflow-hidden divide-y divide-border/60">
                        {faqList.map((faq, index) => (
                            <div key={index} className="transition-colors">
                                <button
                                    onClick={() => setExpandedFAQ(expandedFAQ === index ? null : index)}
                                    className="flex items-center gap-3 w-full p-4 text-left hover:bg-background-secondary transition-colors"
                                >
                                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 text-foreground/30 ${expandedFAQ === index ? 'rotate-0' : '-rotate-90'}`} />
                                    <span className={`text-sm font-medium ${expandedFAQ === index ? 'text-[#2eaadc]' : 'text-foreground'}`}>
                                        {faq.question}
                                    </span>
                                </button>
                                <div
                                    className={`
                                        overflow-hidden transition-all duration-200
                                        ${expandedFAQ === index ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}
                                    `}
                                >
                                    <div className="px-11 pb-4 text-sm text-foreground/60 leading-relaxed">
                                        {faq.answer}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* 联系我们 */}
                <section className="space-y-4">
                    <h2 className="text-[11px] font-semibold text-foreground/40 uppercase tracking-widest px-1">联系我们</h2>
                    <div className="bg-background border border-border rounded-md p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                        <div className="flex-1 space-y-1">
                            <h3 className="text-sm font-semibold">需要更多帮助？</h3>
                            <p className="text-xs text-foreground/50 leading-relaxed">
                                如果您没有找到需要的答案，或者有任何建议和反馈，欢迎随时联系。
                            </p>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-background-secondary text-xs font-medium border border-border">
                            <Mail className="w-3.5 h-3.5 text-[#2eaadc]" />
                            <span>support@mingai.fun</span>
                        </div>
                    </div>
                </section>

                {/* 法律声明 */}
                <footer className="border-t border-border/60">
                    <div className="flex items-center justify-center gap-6 text-xs text-foreground/40">
                        <Link href="/privacy" className="hover:text-foreground hover:underline underline-offset-4">隐私政策</Link>
                        <span className="w-1 h-1 rounded-full bg-background-secondary" />
                        <Link href="/terms" className="hover:text-foreground hover:underline underline-offset-4">服务条款</Link>
                    </div>
                </footer>
            </div>
        </div>
        </FeatureGate>
    );
}
