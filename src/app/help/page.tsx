/**
 * 帮助中心页面
 * 
 * 提供常见问题、使用指南和联系方式
 */
'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
    ArrowLeft,
    ChevronDown,
    ChevronRight,
    HelpCircle,
    BookOpen,
    MessageCircle,
    Mail,
    FileText,
    Sparkles,
    Star,
    MessageSquare,
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
    {
        question: '免费版有什么限制？',
        answer: '免费版每日可进行3次AI对话，可查看基础的每日运势。升级Plus或Pro会员可享受无限对话和更多高级功能。',
    },
    {
        question: '如何查看每日运势？',
        answer: '点击"每日运势"，选择您保存的命盘，即可查看基于您八字的个性化运势分析，包含财运、事业、感情等多维度评分。',
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
];

interface GuideItem {
    icon: React.ReactNode;
    title: string;
    description: string;
    href: string;
}

const guideList: GuideItem[] = [
    {
        icon: <Sparkles className="w-5 h-5" />,
        title: '八字命理',
        description: '输入出生信息，获取专业八字排盘和五行分析',
        href: '/bazi',
    },
    {
        icon: <Star className="w-5 h-5" />,
        title: '紫微斗数',
        description: '探索紫微命盘，了解十二宫位和星曜信息',
        href: '/ziwei',
    },
    {
        icon: <MessageSquare className="w-5 h-5" />,
        title: 'AI智聊',
        description: '与AI命理师对话，获取个性化的命理分析',
        href: '/chat',
    },
    {
        icon: <FileText className="w-5 h-5" />,
        title: '每日运势',
        description: '查看基于您命盘的每日运势和宜忌建议',
        href: '/daily',
    },
];

export default function HelpPage() {
    const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);

    return (
        <div className="max-w-2xl mx-auto px-4 py-8 animate-fade-in">
            {/* 头部 */}
            <div className="flex items-center gap-3 mb-8">
                <Link
                    href="/user"
                    className="p-2 rounded-lg hover:bg-background-secondary transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-xl font-bold">帮助中心</h1>
                    <p className="text-sm text-foreground-secondary">了解如何使用 MingAI</p>
                </div>
            </div>

            {/* 功能指南 */}
            <section className="mb-8">
                <h2 className="flex items-center gap-2 text-lg font-semibold mb-4">
                    <BookOpen className="w-5 h-5 text-accent" />
                    功能指南
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {guideList.map((guide) => (
                        <Link
                            key={guide.title}
                            href={guide.href}
                            className="flex items-start gap-3 p-4 rounded-xl bg-background-secondary border border-border hover:border-accent/50 transition-colors"
                        >
                            <div className="p-2 rounded-lg bg-accent/10 text-accent">
                                {guide.icon}
                            </div>
                            <div>
                                <h3 className="font-medium">{guide.title}</h3>
                                <p className="text-sm text-foreground-secondary">
                                    {guide.description}
                                </p>
                            </div>
                        </Link>
                    ))}
                </div>
            </section>

            {/* 常见问题 */}
            <section className="mb-8">
                <h2 className="flex items-center gap-2 text-lg font-semibold mb-4">
                    <HelpCircle className="w-5 h-5 text-accent" />
                    常见问题
                </h2>
                <div className="space-y-2">
                    {faqList.map((faq, index) => (
                        <div
                            key={index}
                            className="bg-background-secondary rounded-xl border border-border overflow-hidden"
                        >
                            <button
                                onClick={() => setExpandedFAQ(expandedFAQ === index ? null : index)}
                                className="flex items-center justify-between w-full p-4 text-left"
                            >
                                <span className="font-medium pr-4">{faq.question}</span>
                                {expandedFAQ === index ? (
                                    <ChevronDown className="w-5 h-5 text-foreground-secondary flex-shrink-0" />
                                ) : (
                                    <ChevronRight className="w-5 h-5 text-foreground-secondary flex-shrink-0" />
                                )}
                            </button>
                            {expandedFAQ === index && (
                                <div className="px-4 pb-4 text-sm text-foreground-secondary">
                                    {faq.answer}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </section>

            {/* 联系我们 */}
            <section>
                <h2 className="flex items-center gap-2 text-lg font-semibold mb-4">
                    <MessageCircle className="w-5 h-5 text-accent" />
                    联系我们
                </h2>
                <div className="bg-background-secondary rounded-xl border border-border p-6">
                    <p className="text-foreground-secondary mb-4">
                        如果您有其他问题或建议，欢迎通过以下方式联系我们：
                    </p>
                    <div className="flex items-center gap-3 text-sm">
                        <Mail className="w-4 h-4 text-accent" />
                        <span>huanghesen1@gmail.com</span>
                    </div>
                </div>
            </section>
        </div>
    );
}
