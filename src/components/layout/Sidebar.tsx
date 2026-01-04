/**
 * 左侧导航栏组件
 * 
 * 设计说明：
 * - 包含所有命理体系入口（八字、紫微、塔罗等）
 * - 桌面端显示在左侧，移动端隐藏（使用 MobileNav 代替）
 * - 支持展开/收起状态
 * 
 * 'use client' 标记说明：
 * - 需要处理用户点击和路由导航，必须在客户端运行
 */
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
    Orbit,
    Sparkles,
    Gem,
    Dices,
    ScanFace,
    Hand,
    MessageCircle,
    Calendar,
    PanelLeft
} from 'lucide-react';
import { useState } from 'react';

// 导航项配置
const navItems = [
    {
        href: '/bazi',
        label: '八字命理',
        icon: Orbit,
        available: true,
        emoji: '🔮',
        description: '四柱八字精批'
    },
    {
        href: '/ziwei',
        label: '紫微斗数',
        icon: Sparkles,
        available: false,
        emoji: '⭐',
        description: '敬请期待'
    },
    {
        href: '/tarot',
        label: '塔罗',
        icon: Gem,
        available: false,
        emoji: '🃏',
        description: '敬请期待'
    },
    {
        href: '/liuyao',
        label: '六爻',
        icon: Dices,
        available: false,
        emoji: '☯️',
        description: '敬请期待'
    },
    {
        href: '/face',
        label: '面相',
        icon: ScanFace,
        available: false,
        emoji: '👤',
        description: '敬请期待'
    },
    {
        href: '/palm',
        label: '手相',
        icon: Hand,
        available: false,
        emoji: '🖐️',
        description: '敬请期待'
    },
];

// 工具项配置
const toolItems = [
    { href: '/chat', label: 'AI 对话', icon: MessageCircle, available: true },
    { href: '/daily', label: '每日运势', icon: Calendar, available: true },
];

export function Sidebar() {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);
    const [isHoveringLogo, setIsHoveringLogo] = useState(false);

    // 切换折叠状态并重置hover状态
    const toggleCollapsed = (newState: boolean) => {
        setCollapsed(newState);
        setIsHoveringLogo(false); // 重置hover状态
    };

    return (
        <aside
            className={`
        hidden lg:flex flex-col h-screen sticky top-0
        bg-background border-r border-border
        transition-all duration-300 ease-in-out
        ${collapsed ? 'w-[72px]' : 'w-[240px]'}
      `}
        >
            {/* Logo 区域 */}
            <div className={`flex items-center h-16 px-4 border-b border-border transition-all duration-300 ${collapsed ? 'justify-center' : 'justify-between'}`}>
                {collapsed ? (
                    /* 折叠状态：Logo居中，hover显示展开按钮 */
                    <div
                        className="relative flex items-center justify-center w-10 h-10"
                        onMouseEnter={() => setIsHoveringLogo(true)}
                        onMouseLeave={() => setIsHoveringLogo(false)}
                    >
                        {/* Logo - 始终渲染，通过opacity控制显隐 */}
                        <Link
                            href="/"
                            className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${isHoveringLogo ? 'opacity-0 pointer-events-none' : 'opacity-100'
                                }`}
                        >
                            <Image
                                src="/Logo.png"
                                alt="MingAI Logo"
                                width={28}
                                height={28}
                                className="rounded-lg"
                            />
                        </Link>
                        {/* 展开按钮 - 始终渲染，通过opacity控制显隐 */}
                        <button
                            onClick={() => toggleCollapsed(false)}
                            className={`absolute inset-0 flex items-center justify-center p-1.5 rounded-lg text-foreground-secondary 
                               hover:bg-background-secondary hover:text-foreground
                               transition-all duration-300 ${isHoveringLogo ? 'opacity-100' : 'opacity-0 pointer-events-none'
                                }`}
                            aria-label="展开侧边栏"
                            tabIndex={isHoveringLogo ? 0 : -1}
                        >
                            <PanelLeft className="w-5 h-5" />
                        </button>
                    </div>
                ) : (
                    /* 展开状态：Logo在左，折叠按钮在右 */
                    <>
                        <Link href="/" className="flex items-center gap-2 min-w-0">
                            <Image
                                src="/Logo.png"
                                alt="MingAI Logo"
                                width={28}
                                height={28}
                                className="rounded-lg flex-shrink-0"
                            />
                            <span className={`font-bold text-base text-foreground whitespace-nowrap transition-opacity duration-300 ${collapsed ? 'opacity-0' : 'opacity-100'
                                }`}>
                                MingAI
                            </span>
                        </Link>
                        <button
                            onClick={() => toggleCollapsed(true)}
                            className="p-1.5 rounded-lg text-foreground-secondary flex-shrink-0
                               hover:bg-background-secondary hover:text-foreground
                               transition-all duration-300"
                            aria-label="收起侧边栏"
                        >
                            <PanelLeft className="w-5 h-5" />
                        </button>
                    </>
                )}
            </div>

            {/* 主导航区域 */}
            <nav className="flex-1 overflow-y-auto py-4 px-2">
                <div className="mb-6">
                    <div className={`px-3 text-xs font-medium text-foreground-secondary uppercase tracking-wider transition-all duration-300 overflow-hidden ${collapsed ? 'opacity-0 max-h-0 mb-0' : 'opacity-100 max-h-6 mb-2'
                        }`}>
                        命理体系
                    </div>
                    <ul className="space-y-1">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                            const Icon = item.icon;

                            return (
                                <li key={item.href}>
                                    <Link
                                        href={item.available ? item.href : '#'}
                                        className={`
                      flex items-center px-2.5 py-2 rounded-lg
                      transition-all duration-300
                      ${isActive
                                                ? 'bg-accent/10 text-accent'
                                                : 'text-foreground-secondary hover:bg-background-secondary hover:text-foreground'
                                            }
                      ${!item.available && 'opacity-50 cursor-not-allowed'}
                      ${collapsed ? 'justify-center' : 'gap-2'}
                    `}
                                        onClick={(e) => !item.available && e.preventDefault()}
                                        title={collapsed ? item.label : undefined}
                                    >
                                        <Icon className="w-4 h-4 flex-shrink-0" />
                                        <div className={`min-w-0 transition-all duration-300 ${collapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100 flex-1'
                                            }`}>
                                            <div className="text-sm font-medium truncate">{item.label}</div>
                                        </div>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </div>

                {/* 工具区域 */}
                <div className="mb-6">
                    <div className={`px-3 text-xs font-medium text-foreground-secondary uppercase tracking-wider transition-all duration-300 overflow-hidden ${collapsed ? 'opacity-0 max-h-0 mb-0' : 'opacity-100 max-h-6 mb-2'
                        }`}>
                        工具
                    </div>
                    <ul className="space-y-1">
                        {toolItems.map((item) => {
                            const isActive = pathname === item.href;
                            const Icon = item.icon;

                            return (
                                <li key={item.href}>
                                    <Link
                                        href={item.available ? item.href : '#'}
                                        className={`
                      flex items-center px-2.5 py-2 rounded-lg
                      transition-all duration-300
                      ${isActive
                                                ? 'bg-accent/10 text-accent'
                                                : 'text-foreground-secondary hover:bg-background-secondary hover:text-foreground'
                                            }
                      ${collapsed ? 'justify-center' : 'gap-2'}
                    `}
                                        title={collapsed ? item.label : undefined}
                                    >
                                        <Icon className="w-4 h-4 flex-shrink-0" />
                                        <span className={`text-sm font-medium transition-all duration-300 whitespace-nowrap ${collapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
                                            }`}>{item.label}</span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </nav>
        </aside>
    );
}
