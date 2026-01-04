/**
 * 通用占位页面组件
 * 用于尚未实现的命理体系
 */

import Link from 'next/link';
import { ArrowLeft, Clock, Bell } from 'lucide-react';

interface ComingSoonPageProps {
    title: string;
    emoji: string;
    description: string;
    features: string[];
}

export function ComingSoonPage({ title, emoji, description, features }: ComingSoonPageProps) {
    return (
        <div className="max-w-2xl mx-auto px-4 py-12 text-center animate-fade-in">
            {/* 返回首页 */}
            <Link
                href="/"
                className="inline-flex items-center gap-2 text-foreground-secondary hover:text-foreground mb-8 transition-colors"
            >
                <ArrowLeft className="w-4 h-4" />
                返回首页
            </Link>

            {/* 图标 */}
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-accent/10 mb-6">
                <span className="text-5xl">{emoji}</span>
            </div>

            {/* 标题 */}
            <h1 className="text-3xl font-bold mb-4">{title}</h1>

            {/* 描述 */}
            <p className="text-foreground-secondary mb-8 max-w-md mx-auto">
                {description}
            </p>

            {/* 敬请期待标签 */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent mb-8">
                <Clock className="w-4 h-4" />
                敬请期待
            </div>

            {/* 预览功能 */}
            <div className="bg-background-secondary rounded-xl p-6 border border-border text-left mb-8">
                <h2 className="font-semibold mb-4">即将推出的功能</h2>
                <ul className="space-y-3">
                    {features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <span className="text-accent text-sm">{index + 1}</span>
                            </div>
                            <span className="text-foreground-secondary">{feature}</span>
                        </li>
                    ))}
                </ul>
            </div>

            {/* 订阅提醒 */}
            <button className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-accent text-white hover:bg-accent/90 transition-colors">
                <Bell className="w-4 h-4" />
                上线提醒我
            </button>

            <p className="text-sm text-foreground-secondary mt-4">
                功能上线后，我们会第一时间通知您
            </p>
        </div>
    );
}
