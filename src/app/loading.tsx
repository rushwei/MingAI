/**
 * 全局加载组件
 *
 * Next.js App Router 会在页面加载时自动显示此组件
 * 显示 Logo 和加载动画
 */

import Image from 'next/image';

export default function Loading() {
    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background">
            {/* Logo 容器 - 带呼吸动画 */}
            <div className="relative animate-pulse">
                <Image
                    src="/Logo.png"
                    alt="MingAI"
                    width={100}
                    height={100}
                    className="rounded-2xl shadow-lg"
                    priority
                />
                {/* 光晕效果 */}
                <div className="absolute -inset-4 bg-accent/20 rounded-full blur-2xl -z-10 animate-pulse" />
            </div>

            {/* 加载文字 */}
            <div className="mt-6 flex items-center gap-1">
                <span className="text-foreground-secondary text-sm">加载中</span>
                <span className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce [animation-delay:300ms]" />
                </span>
            </div>
        </div>
    );
}
