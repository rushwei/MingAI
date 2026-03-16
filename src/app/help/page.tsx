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
    ArrowLeft,
    ChevronDown,
    HelpCircle,
    MessageCircle,
    Mail,
} from 'lucide-react';

interface FAQItem {
    question: string;
    answer: string;
}

const faqList: FAQItem[] = [
    {
        question: '如何创建八字命盘？',
        answer: '点击左侧导航栏的"八字命理"，输入姓名、性别和出生日期时间，点击"立即排盘"即可生成命盘。可以选择保存命盘以便后续查看。',
    },
    {
        question: '紫微斗数和八字有什么区别？',
        answer: '八字命理基于天干地支推算命运，侧重五行生克；紫微斗数则以紫微星为主星，通过十二宫位分析人生各方面。两者各有特色，可互相参照。',
    },
    {
        question: 'AI对话如何使用？',
        answer: '进入"AI智聊"页面，可以直接输入问题与AI命理师对话。您还可以选择已保存的命盘加入对话上下文，获得更准确的分析。',
    },
    // {
    //     question: '免费版有什么限制？',
    //     answer: '免费版每日可进行3次AI对话，可查看基础的每日运势。升级Plus或Pro会员可享受无限对话和更多高级功能。',
    // },
    {
        question: '如何查看每日运势？',
        answer: '点击"每日运势"，选择您保存的命盘，即可查看基于您八字的个性化运势分析，包含财运、事业、感情等多维度评分。',
    },
    {
        question: '如何进行塔罗占卜？',
        answer: '进入"塔罗占卜"页面，选择占卜牌阵（单牌、三牌阵或凯尔特十字），输入您的问题，点击抽牌即可获得AI的专业解读。',
    },
    {
        question: '如何进行六爻占卜？',
        answer: '进入"六爻占卜"页面，输入占卜问题，点击摇卦获取卦象。系统会显示主卦、变卦和六爻信息，并提供AI解卦。',
    },
    {
        question: '如何删除命盘？',
        answer: '进入"我的命盘"页面，点击对应命盘的删除按钮，确认后即可删除。删除后无法恢复，请谨慎操作。',
    },
    {
        question: '支持哪些登录方式？',
        answer: '目前支持邮箱密码登录和邮箱验证码登录两种方式。您可以在登录页面切换。',
    },
    {
        question: '数据会被保存吗？',
        answer: '您的命盘数据和对话历史都会安全保存在云端，登录后可随时查看。我们重视用户隐私，不会将数据用于其他用途。',
    },
    {
        question: '如何设置默认命盘？',
        answer: '进入"我的命盘"页面，点击命盘旁边的星星图标即可设置为默认命盘。默认命盘会在每日运势等功能中优先使用。',
    },
];

export default function HelpPage() {
    const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);

    return (
        <FeatureGate featureId="help">
        <div className="min-h-screen bg-background">
            <div className="max-w-3xl mx-auto px-4 py-8 relative z-10 animate-fade-in">
                {/* 头部 - 仅桌面端显示 */}
                <div className="hidden md:flex items-center gap-4 mb-10">
                    <Link
                        href="/user"
                        className="p-2.5 rounded-xl bg-background-secondary/50 border border-border/50 hover:bg-background-secondary hover:shadow-md transition-all text-foreground-secondary hover:text-foreground backdrop-blur-sm"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">帮助中心</h1>
                        <p className="text-sm text-foreground-secondary mt-1">了解如何更好地使用 MingAI</p>
                    </div>
                </div>

                {/* 常见问题 */}
                <section className="mb-10">
                    <h2 className="flex items-center gap-2 text-lg font-bold mb-5 ml-1">
                        <HelpCircle className="w-5 h-5" />
                        常见问题
                    </h2>
                    <div className="space-y-3">
                        {faqList.map((faq, index) => (
                            <div
                                key={index}
                                className={`
                                    bg-background rounded-2xl border transition-all duration-300 overflow-hidden
                                    ${expandedFAQ === index
                                        ? 'border-accent/30 shadow-md'
                                        : 'border-border/50 hover:border-accent/20 hover:shadow-sm'
                                    }
                                `}
                            >
                                <button
                                    onClick={() => setExpandedFAQ(expandedFAQ === index ? null : index)}
                                    className="flex items-center justify-between w-full p-1 px-5 text-left"
                                >
                                    <span className={`font-medium pr-8 transition-colors ${expandedFAQ === index ? 'text-accent' : 'text-foreground'}`}>
                                        {faq.question}
                                    </span>
                                    <div className={`
                                        w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300
                                        ${expandedFAQ === index ? 'bg-accent/10 rotate-180' : 'bg-transparent'}
                                    `}>
                                        <ChevronDown className={`w-5 h-5 ${expandedFAQ === index ? 'text-accent' : 'text-foreground-secondary'}`} />
                                    </div>
                                </button>
                                <div
                                    className={`
                                        overflow-hidden transition-all duration-300 ease-in-out
                                        ${expandedFAQ === index ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'}
                                    `}
                                >
                                    <div className="pb-2 pt-0 text-sm text-foreground-secondary leading-relaxed border-t border-dashed border-border/50 mx-5">
                                        <div className="pt-2">
                                            {faq.answer}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* 联系我们 */}
                <section>
                    <h2 className="flex items-center gap-2 text-lg font-bold mb-5 ml-1">
                        <MessageCircle className="w-5 h-5" />
                        联系我们
                    </h2>
                    <div className="bg-gradient-to-br from-background to-background-secondary/50 rounded-2xl border border-border/50 p-3 px-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-sm">
                        <div className="flex-1">
                            <h3 className="font-semibold text-foreground mb-2">需要更多帮助？</h3>
                            <p className="text-sm text-foreground-secondary leading-relaxed">
                                如果您没有找到需要的答案，或者有任何建议和反馈，<br className="hidden sm:block" />
                                欢迎随时联系我们的支持团队。
                            </p>
                        </div>
                        <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-background border border-border/50 shadow-sm text-sm font-medium text-foreground hover:shadow-md transition-all">
                            <Mail className="w-4 h-4 text-accent" />
                            <span>support@mingai.fun</span>
                        </div>
                    </div>
                </section>

                {/* 法律声明 */}
                <section className="pt-4">
                    <div className="flex flex-wrap justify-center gap-4 text-sm">
                        <Link
                            href="/privacy"
                            className="text-foreground-secondary hover:text-foreground hover:underline transition-colors"
                        >
                            隐私政策
                        </Link>
                        <span className="text-border">|</span>
                        <Link
                            href="/terms"
                            className="text-foreground-secondary hover:text-foreground hover:underline transition-colors"
                        >
                            服务条款
                        </Link>
                    </div>
                </section>
            </div>
        </div>
        </FeatureGate>
    );
}
