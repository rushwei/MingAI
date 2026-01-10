/**
 * 移动端底部导航组件
 * 
 * 设计说明：
 * - 仅在移动端显示（lg 以下屏幕）
 * - 固定在底部，提供主要功能的快速入口
 * 
 * 'use client' 标记说明：
 * - 需要获取当前路由路径来高亮当前选中项
 */
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    Orbit,
    Sparkles,
    Gem,
    Dices,
    HeartHandshake,
    BotMessageSquare,
    Brain,
    Compass,
    Sun,
    User
} from 'lucide-react';

// 移动端导航项 - 扩展显示更多入口
const mobileNavItems = [
    { href: '/bazi', label: '八字', icon: Orbit },
    { href: '/hepan', label: '合盘', icon: HeartHandshake },
    { href: '/ziwei', label: '紫微', icon: Sparkles },
    { href: '/tarot', label: '塔罗', icon: Gem },
    { href: '/liuyao', label: '六爻', icon: Dices },
    { href: '/fortune-hub', label: '运势', icon: Compass },
    { href: '/chat', label: '对话', icon: BotMessageSquare },
    { href: '/mbti', label: 'MBTI', icon: Brain },
    { href: '/daily', label: '每日', icon: Sun },
    { href: '/user', label: '我的', icon: User },
];

export function MobileNav() {
    const pathname = usePathname();

    return (
        <nav
            className="
        lg:hidden fixed bottom-0 left-0 right-0 z-50
        bg-background/95 backdrop-blur-md
        border-t border-border
        safe-area-inset-bottom
      "
        >
            <ul className="grid grid-cols-5 gap-y-1 px-2 py-1">
                {mobileNavItems.map((item) => {
                    const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                    const Icon = item.icon;

                    return (
                        <li key={item.href}>
                            <Link
                                href={item.href}
                                className={`
                  flex flex-col items-center justify-center
                  w-full h-12
                  transition-colors duration-200
                  ${isActive
                                        ? 'text-accent'
                                        : 'text-foreground-secondary'
                                    }
                `}
                            >
                                <Icon className="w-[18px] h-[18px]" />
                                <span className="text-[10px] mt-0.5 font-medium">{item.label}</span>
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}
