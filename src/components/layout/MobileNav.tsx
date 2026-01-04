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
    Sparkles,
    Stars,
    MessageCircle,
    Calendar,
    User
} from 'lucide-react';

// 移动端导航项 - 精简版，只显示最常用的功能
const mobileNavItems = [
    { href: '/bazi', label: '八字', icon: Sparkles },
    { href: '/chat', label: '对话', icon: MessageCircle },
    { href: '/daily', label: '运势', icon: Calendar },
    { href: '/ziwei', label: '紫微', icon: Stars },
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
            <ul className="flex items-center justify-around h-14">
                {mobileNavItems.map((item) => {
                    const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                    const Icon = item.icon;

                    return (
                        <li key={item.href}>
                            <Link
                                href={item.href}
                                className={`
                  flex flex-col items-center justify-center
                  w-14 h-full
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
