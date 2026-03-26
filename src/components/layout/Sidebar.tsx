/**
 * 左侧导航栏组件
 *
 * 设计说明：
 * - 包含所有命理体系入口（八字、紫微、塔罗等）
 * - AI 区域下方内嵌对话列表（新聊天/搜索/对话列表）
 * - 桌面端显示在左侧，移动端隐藏（使用 MobileNav 代替）
 * - 支持展开/收起状态
 * - 底部包含用户信息
 */
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useSearchParams } from 'next/navigation';
import {
    PanelLeft,
    LogIn,
} from 'lucide-react';
import { useState, useCallback, useMemo } from 'react';
import { AuthModal } from '@/components/auth/AuthModal';
import { SidebarUserCard } from '@/components/layout/UserMenu';
import { SidebarConversations } from '@/components/layout/SidebarConversations';
import { useSidebarSafe } from '@/components/layout/SidebarContext';
import { useSessionSafe } from '@/components/providers/ClientProviders';
import { useFeatureToggles } from '@/lib/hooks/useFeatureToggles';
import { getSidebarNavItems, getSidebarToolItems } from '@/lib/navigation/registry';
import { useConversationList } from '@/lib/chat/ConversationListContext';
import { useRouter } from 'next/navigation';

// Derive from registry once at module level
const navItems = getSidebarNavItems().map(n => ({ ...n, available: true }));
const toolItems = getSidebarToolItems().map(n => ({ ...n, available: true }));

export function Sidebar() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { collapsed, setCollapsed } = useSidebarSafe();
    const [isHoveringLogo, setIsHoveringLogo] = useState(false);
    const { user } = useSessionSafe();
    const { isFeatureEnabled, isLoading: featureLoading, isRefreshing: featureRefreshing } = useFeatureToggles();
    const { handleNewChat } = useConversationList();
    const [showAuthModal, setShowAuthModal] = useState(false);
    const isNavLoading = featureLoading || featureRefreshing;

    // 当前是否在具体某个对话中
    const activeConvId = searchParams.get('id');

    // 切换折叠状态
    const toggleCollapsed = useCallback((newState: boolean) => {
        setCollapsed(newState);
        setIsHoveringLogo(false);
    }, [setCollapsed]);

    // 根据 feature toggle 过滤导航项
    const filteredNavItems = useMemo(() => navItems
        .filter(item => isFeatureEnabled(item.id)),
    [isFeatureEnabled]);

    const filteredToolItems = useMemo(() => toolItems
        .filter(item => isFeatureEnabled(item.id)),
    [isFeatureEnabled]);

    if (isNavLoading) {
        return (
            <aside
                className={`
                    hidden lg:flex flex-col h-screen sticky top-0
                    bg-[#f7f6f3] border-r border-gray-200
                    transition-all duration-150 ease-in-out
                    ${collapsed ? 'w-[72px]' : 'w-[240px]'}
                `}
            >
                <div className={`flex items-center h-16 px-4 border-b border-gray-200 ${collapsed ? 'justify-center' : 'justify-between'}`}>
                    <Link href="/" className="flex items-center gap-2 min-w-0">
                        <Image
                            src="/Logo.svg"
                            alt="MingAI Logo"
                            width={28}
                            height={28}
                            className="rounded-md flex-shrink-0 dark:invert"
                        />
                        {!collapsed && (
                            <span className="font-bold text-base text-[#37352f] whitespace-nowrap">
                                MingAI
                            </span>
                        )}
                    </Link>
                    {!collapsed && <div className="w-8 h-8 rounded-md bg-[#efedea] animate-pulse" />}
                </div>

                <div className="flex-1 py-4 px-2 space-y-3">
                    {Array.from({ length: collapsed ? 7 : 9 }).map((_, index) => (
                        <div
                            key={index}
                            className={`rounded-md bg-[#efedea] animate-pulse ${collapsed ? 'h-10 w-10 mx-auto' : 'h-10 w-full'}`}
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
                    bg-[#f7f6f3] border-r border-gray-200
                    transition-all duration-150 ease-in-out
                    ${collapsed ? 'w-[72px]' : 'w-[240px]'}
                `}
            >
                {/* Logo 区域 */}
                <div className={`flex items-center h-16 px-4 border-b border-gray-200 transition-all duration-150 flex-shrink-0 ${collapsed ? 'justify-center' : 'justify-between'}`}>
                    {collapsed ? (
                        <div
                            className="relative flex items-center justify-center w-10 h-10"
                            onMouseEnter={() => setIsHoveringLogo(true)}
                            onMouseLeave={() => setIsHoveringLogo(false)}
                        >
                            <Link
                                href="/"
                                className={`absolute inset-0 flex items-center justify-center transition-opacity duration-150 ${isHoveringLogo ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                            >
                                <Image
                                    src="/Logo.svg"
                                    alt="MingAI Logo"
                                    width={28}
                                    height={28}
                                    className="rounded-md dark:invert"
                                />
                            </Link>
                            <button
                                onClick={() => toggleCollapsed(false)}
                                className={`absolute inset-0 flex items-center justify-center p-1.5 rounded-md text-[#37352f]/60
                                   hover:bg-[#efedea] hover:text-[#37352f]
                                   transition-all duration-150 ${isHoveringLogo ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
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
                                    src="/Logo.svg"
                                    alt="MingAI Logo"
                                    width={28}
                                    height={28}
                                    className="rounded-md flex-shrink-0 dark:invert"
                                />
                                <span className={`font-bold text-base text-[#37352f] whitespace-nowrap transition-opacity duration-150 ${collapsed ? 'opacity-0' : 'opacity-100'}`}>
                                    MingAI
                                </span>
                            </Link>
                            <button
                                onClick={() => toggleCollapsed(true)}
                                className="p-1.5 rounded-md text-[#37352f]/60 flex-shrink-0
                                   hover:bg-[#efedea] hover:text-[#37352f]
                                   transition-all duration-150"
                                aria-label="收起侧边栏"
                            >
                                <PanelLeft className="w-5 h-5" />
                            </button>
                        </>
                    )}
                </div>

                {/* 侧边栏内容区：上部固定，下部滚动 */}
                <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    {/* 固定区域：仅命理体系 */}
                    <div className="pt-4 px-2 flex-shrink-0 border-b border-gray-100/50">
                        <div className={`px-3 text-[11px] font-semibold text-[#37352f]/50 uppercase tracking-wider transition-all duration-150 overflow-hidden ${collapsed ? 'opacity-0 max-h-0 mb-0' : 'opacity-100 max-h-6 mb-1'}`}>
                            命理体系
                        </div>
                        <ul className="space-y-0.5">
                            {filteredNavItems.map((item) => {
                                const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                                const Icon = item.icon;

                                return (
                                    <li key={item.href}>
                                        <Link
                                            href={item.available ? item.href : '#'}
                                            className={`
                                                flex items-center py-1.5 rounded-md
                                                transition-colors duration-150
                                                ${isActive
                                                    ? 'bg-[#e3e1db] text-[#37352f]'
                                                    : 'text-[#37352f] hover:bg-[#efedea]'
                                                }
                                                ${!item.available && 'opacity-50 cursor-not-allowed'}
                                                ${collapsed ? 'px-2 justify-center' : 'px-3 gap-2'}
                                            `}
                                            onClick={(e) => !item.available && e.preventDefault()}
                                            title={collapsed ? item.label : undefined}
                                        >
                                            <Icon className={`w-4.5 h-4.5 flex-shrink-0 ${isActive ? 'text-[#37352f]' : 'text-[#37352f]/70'}`} />
                                            <div className={`min-w-0 transition-all duration-150 ${collapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100 flex-1'}`}>
                                                <div className="text-sm font-medium truncate">{item.label}</div>
                                            </div>
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>

                    {/* 滚动区域：包含 AI 标题(吸顶) + AI 选项 + 对话列表 */}
                    <nav className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 px-2">
                        {/* AI 标题 - 吸顶，增加背景覆盖和 z-index */}
                        <div className={`sticky top-0 z-30 bg-[#f7f6f3] px-3 pt-3 pb-1.5 text-[11px] font-semibold text-[#37352f]/50 uppercase tracking-wider transition-all duration-150 overflow-hidden ${collapsed ? 'opacity-0 max-h-0 mb-0' : 'opacity-100 max-h-10'}`}>
                            AI
                        </div>

                        {/* AI 功能项 */}
                        <ul className="space-y-0.5">
                            {filteredToolItems.map((item) => {
                                const isChatItem = item.id === 'chat';
                                const isActive = isChatItem 
                                    ? pathname === item.href && !activeConvId
                                    : pathname === item.href;
                                const Icon = item.icon;

                                return (
                                    <li key={item.href}>
                                        <Link
                                            href={item.available ? item.href : '#'}
                                            className={`
                                                flex items-center py-1.5 rounded-md
                                                transition-colors duration-150
                                                ${isActive
                                                    ? 'bg-[#e3e1db] text-[#37352f]'
                                                    : 'text-[#37352f] hover:bg-[#efedea]'
                                                }
                                                ${collapsed ? 'px-2 justify-center' : 'px-3 gap-2'}
                                            `}
                                            onClick={(e) => {
                                                if (!item.available) {
                                                    e.preventDefault();
                                                    return;
                                                }
                                                if (isChatItem) {
                                                    e.preventDefault();
                                                    handleNewChat().then(() => {
                                                        router.push('/chat');
                                                    });
                                                }
                                            }}
                                            title={collapsed ? item.label : undefined}
                                        >
                                            <Icon className={`w-4.5 h-4.5 flex-shrink-0 ${isActive ? 'text-[#37352f]' : 'text-[#37352f]/70'}`} />
                                            <span className={`text-sm font-medium transition-all duration-150 whitespace-nowrap ${collapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>
                                                {item.label}
                                            </span>
                                        </Link>

                                        {/* 对话列表内嵌在“新聊天”项下方 */}
                                        {isChatItem && user && !collapsed && (
                                            <SidebarConversations collapsed={collapsed} />
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    </nav>
                </div>

                {/* 底部用户区域 */}
                <div className="border-t border-gray-200 p-3 flex-shrink-0">
                    {user ? (
                        <SidebarUserCard user={user} collapsed={collapsed} />
                    ) : (
                        <button
                            onClick={() => setShowAuthModal(true)}
                            className={`
                                flex items-center rounded-md w-full
                                text-sm font-medium
                                bg-[#2383e2] text-white
                                hover:bg-[#2383e2]/90 active:bg-[#1a65b0]
                                transition-colors duration-150
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
