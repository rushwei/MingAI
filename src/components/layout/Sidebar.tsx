/**
 * 左侧导航栏组件
 * 
 * 设计说明：
 * - 包含所有命理体系入口（八字、紫微、塔罗等）
 * - 桌面端显示在左侧，移动端隐藏（使用 MobileNav 代替）
 * - 支持展开/收起状态
 * - 底部包含用户信息
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
    Sun,
    CalendarRange,
    PanelLeft,
    LogIn,
    BotMessageSquare,
    Brain,
    Compass,
    HeartHandshake,
    // Github,
    Aperture,
    Tags,
} from 'lucide-react';
import { useState, useCallback, useMemo } from 'react';
import { AuthModal } from '@/components/auth/AuthModal';
import { SidebarUserCard } from '@/components/layout/UserMenu';
import { useSidebarSafe } from '@/components/layout/SidebarContext';
import { useSidebarConfigSafe } from '@/components/layout/SidebarConfigContext';
import { useSessionSafe } from '@/components/providers/ClientProviders';
import { useFeatureToggles } from '@/lib/hooks/useFeatureToggles';

// 导航项配置
const navItems = [
    {
        href: '/fortune-hub',
        label: '运势中心',
        icon: Compass,
        available: true
    },
    {
        href: '/bazi',
        label: '八字',
        icon: Orbit,
        available: true,
        emoji: '🔮',
        description: '四柱八字精批'
    },
    {
        href: '/hepan',
        label: '八字合盘',
        icon: HeartHandshake,
        available: true,
        emoji: '💑',
        description: '八字合盘'
    },
    {
        href: '/ziwei',
        label: '紫微斗数',
        icon: Sparkles,
        available: true,
        emoji: '⭐',
        description: '紫微命盘'
    },
    {
        href: '/tarot',
        label: '塔罗',
        icon: Gem,
        available: true,
        emoji: '🃏',
        description: '塔罗占卜'
    },
    {
        href: '/liuyao',
        label: '六爻',
        icon: Dices,
        available: true,
        emoji: '☯️',
        description: '六爻占卜'
    },
    {
        href: '/face',
        label: '面相',
        icon: ScanFace,
        available: true,
        emoji: '👤',
        description: '面相分析'
    },
    {
        href: '/palm',
        label: '手相',
        icon: Hand,
        available: true,
        emoji: '🖐️',
        description: '手相分析'
    },
    {
        href: '/mbti',
        label: 'MBTI',
        icon: Brain,
        available: true,
        emoji: '🧩',
        description: '性格测试'
    },
];

// 工具项配置 - 使用不同图标区分每日/每月
const toolItems = [
    { href: '/chat', label: 'AI', icon: BotMessageSquare, available: true },
    { href: '/daily', label: '日运', icon: Sun, available: true },
    { href: '/monthly', label: '月运', icon: CalendarRange, available: true },
    { href: '/records', label: '命理记录', icon: Tags, available: true },
    { href: '/community', label: '社区', icon: Aperture, available: true },
];

export function Sidebar() {
    const pathname = usePathname();
    const { collapsed, setCollapsed } = useSidebarSafe();
    const { config: sidebarConfig, loading: sidebarConfigLoading } = useSidebarConfigSafe();
    const [isHoveringLogo, setIsHoveringLogo] = useState(false);
    const { user } = useSessionSafe();
    const { isFeatureEnabled, isLoading: featureLoading } = useFeatureToggles();
    const [showAuthModal, setShowAuthModal] = useState(false);
    const isNavLoading = sidebarConfigLoading || featureLoading;

    // 切换折叠状态
    const toggleCollapsed = useCallback((newState: boolean) => {
        setCollapsed(newState);
        setIsHoveringLogo(false);
    }, [setCollapsed]);

    // 根据配置过滤并排序导航项
    const filteredNavItems = useMemo(() => navItems
        .filter(item => isFeatureEnabled(item.href.replace('/', '')))
        .filter(item => !sidebarConfig.hiddenNavItems?.includes(item.href.replace('/', '')))
        .sort((a, b) => {
            const orderA = sidebarConfig.navOrder?.indexOf(a.href.replace('/', '')) ?? -1;
            const orderB = sidebarConfig.navOrder?.indexOf(b.href.replace('/', '')) ?? -1;
            if (orderA === -1 && orderB === -1) return 0;
            if (orderA === -1) return 1;
            if (orderB === -1) return -1;
            return orderA - orderB;
        }), [sidebarConfig.hiddenNavItems, sidebarConfig.navOrder, isFeatureEnabled]);

    const filteredToolItems = useMemo(() => toolItems
        .filter(item => isFeatureEnabled(item.href.replace('/', '')))
        .filter(item => !sidebarConfig.hiddenToolItems?.includes(item.href.replace('/user/', '').replace('/', '')))
        .sort((a, b) => {
            const idA = a.href.replace('/user/', '').replace('/', '');
            const idB = b.href.replace('/user/', '').replace('/', '');
            const orderA = sidebarConfig.toolOrder?.indexOf(idA) ?? -1;
            const orderB = sidebarConfig.toolOrder?.indexOf(idB) ?? -1;
            if (orderA === -1 && orderB === -1) return 0;
            if (orderA === -1) return 1;
            if (orderB === -1) return -1;
            return orderA - orderB;
        }), [sidebarConfig.hiddenToolItems, sidebarConfig.toolOrder, isFeatureEnabled]);

    if (isNavLoading) {
        return (
            <aside
                className={`
                    hidden lg:flex flex-col h-screen sticky top-0
                    bg-background border-r border-border
                    transition-all duration-300 ease-in-out
                    ${collapsed ? 'w-[72px]' : 'w-[240px]'}
                `}
            >
                <div className={`flex items-center h-16 px-4 border-b border-border ${collapsed ? 'justify-center' : 'justify-between'}`}>
                    <Link href="/" className="flex items-center gap-2 min-w-0">
                        <Image
                            src="/Logo.png"
                            alt="MingAI Logo"
                            width={28}
                            height={28}
                            className="rounded-lg flex-shrink-0"
                        />
                        {!collapsed && (
                            <span className="font-bold text-base text-foreground whitespace-nowrap">
                                MingAI
                            </span>
                        )}
                    </Link>
                    {!collapsed && <div className="w-8 h-8 rounded-lg bg-background-secondary animate-pulse" />}
                </div>

                <div className="flex-1 py-4 px-2 space-y-3">
                    {Array.from({ length: collapsed ? 7 : 9 }).map((_, index) => (
                        <div
                            key={index}
                            className={`rounded-xl bg-background-secondary animate-pulse ${collapsed ? 'h-10 w-10 mx-auto' : 'h-10 w-full'}`}
                        />
                    ))}
                </div>
            </aside>
        );
    }

    return (
        <>
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
                        <div
                            className="relative flex items-center justify-center w-10 h-10"
                            onMouseEnter={() => setIsHoveringLogo(true)}
                            onMouseLeave={() => setIsHoveringLogo(false)}
                        >
                            <Link
                                href="/"
                                className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${isHoveringLogo ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                            >
                                <Image
                                    src="/Logo.png"
                                    alt="MingAI Logo"
                                    width={28}
                                    height={28}
                                    className="rounded-lg"
                                />
                            </Link>
                            <button
                                onClick={() => toggleCollapsed(false)}
                                className={`absolute inset-0 flex items-center justify-center p-1.5 rounded-lg text-foreground-secondary 
                                   hover:bg-background-secondary hover:text-foreground
                                   transition-all duration-300 ${isHoveringLogo ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                                aria-label="展开侧边栏"
                                tabIndex={isHoveringLogo ? 0 : -1}
                            >
                                <PanelLeft className="w-5 h-5" />
                            </button>
                        </div>
                    ) : (
                        <>
                            <Link href="/" className="flex items-center gap-2 min-w-0">
                                <Image
                                    src="/Logo.png"
                                    alt="MingAI Logo"
                                    width={28}
                                    height={28}
                                    className="rounded-lg flex-shrink-0"
                                />
                                <span className={`font-bold text-base text-foreground whitespace-nowrap transition-opacity duration-300 ${collapsed ? 'opacity-0' : 'opacity-100'}`}>
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
                        <div className={`px-3 text-xs font-medium text-foreground-secondary uppercase tracking-wider transition-all duration-300 overflow-hidden ${collapsed ? 'opacity-0 max-h-0 mb-0' : 'opacity-100 max-h-6 mb-2'}`}>
                            命理体系
                        </div>
                        <ul className="space-y-1">
                            {filteredNavItems.map((item) => {
                                const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                                const Icon = item.icon;

                                return (
                                    <li key={item.href}>
                                        <Link
                                            href={item.available ? item.href : '#'}
                                            className={`
                                                flex items-center px-2.5 py-2.5 rounded-lg
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
                                            <Icon className="w-4.5 h-4.5 flex-shrink-0" />
                                            <div className={`min-w-0 transition-all duration-300 ${collapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100 flex-1'}`}>
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
                        <div className={`px-3 text-xs font-medium text-foreground-secondary uppercase tracking-wider transition-all duration-300 overflow-hidden ${collapsed ? 'opacity-0 max-h-0 mb-0' : 'opacity-100 max-h-6 mb-2'}`}>
                            工具
                        </div>
                        <ul className="space-y-1">
                            {filteredToolItems.map((item) => {
                                const isActive = pathname === item.href;
                                const Icon = item.icon;

                                return (
                                    <li key={item.href}>
                                        <Link
                                            href={item.available ? item.href : '#'}
                                            className={`
                                                flex items-center px-2.5 py-2.5 rounded-lg
                                                transition-all duration-300
                                                ${isActive
                                                    ? 'bg-accent/10 text-accent'
                                                    : 'text-foreground-secondary hover:bg-background-secondary hover:text-foreground'
                                                }
                                                ${collapsed ? 'justify-center' : 'gap-2'}
                                            `}
                                            title={collapsed ? item.label : undefined}
                                        >
                                            <Icon className="w-4.5 h-4.5 flex-shrink-0" />
                                            <span className={`text-sm font-medium transition-all duration-300 whitespace-nowrap ${collapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>
                                                {item.label}
                                            </span>
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>

                    {/* GitHub 反馈 */}
                    {/* <div className="mb-2">
                        <div className={`px-3 text-xs font-medium text-foreground-secondary uppercase tracking-wider transition-all duration-300 overflow-hidden ${collapsed ? 'opacity-0 max-h-0 mb-0' : 'opacity-100 max-h-6 mb-2'}`}>
                            反馈
                        </div>
                        <a
                            href="https://github.com/hhszzzz/MingAI/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`
                                flex items-center px-2.5 py-2.5 rounded-lg
                                transition-all duration-300
                                text-foreground-secondary hover:bg-background-secondary hover:text-foreground
                                ${collapsed ? 'justify-center' : 'gap-2'}
                            `}
                            title={collapsed ? 'GitHub - 反馈' : undefined}
                        >
                            <Github className="w-4.5 h-4.5 flex-shrink-0" />
                            <span className={`text-sm font-medium transition-all duration-300 whitespace-nowrap ${collapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>
                                反馈
                            </span>
                        </a>
                    </div> */}
                </nav>

                {/* 底部用户区域 */}
                <div className="border-t border-border p-3">
                    {/* 用户卡片 */}
                    {user ? (
                        <SidebarUserCard user={user} collapsed={collapsed} />
                    ) : (
                        <button
                            onClick={() => setShowAuthModal(true)}
                            className={`
                                flex items-center rounded-lg w-full
                                text-sm font-medium
                                bg-accent text-white
                                hover:bg-accent/90
                                transition-all duration-200
                                ${collapsed ? 'p-2 justify-center' : 'gap-1.5 px-3 py-2 justify-center'}
                            `}
                            title={collapsed ? '登录' : undefined}
                        >
                            <LogIn className="w-4 h-4 flex-shrink-0" />
                            {!collapsed && <span>登录</span>}
                        </button>
                    )}
                </div>
            </aside>

            {/* 登录弹窗 */}
            <AuthModal
                isOpen={showAuthModal}
                onClose={() => setShowAuthModal(false)}
            />
        </>
    );
}
