/**
 * 移动端底部导航组件
 * 
 * 设计说明：
 * - 仅在移动端显示（lg 以下屏幕）
 * - 固定在底部，提供 5 个主要入口
 * - 第五个是"更多"按钮，点击展开抽屉显示所有入口
 */
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useCallback, useMemo } from 'react';
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
    User,
    Plus,
    X,
    ScanFace,
    Hand,
    CalendarRange,
    Aperture,
    Tags,
    Settings,
    SlidersHorizontal,
    Bell,
    CreditCard,
    MessageCircleHeart,
    BookOpenText,
    CircleHelp,
    type LucideIcon,
    CircleStar,
    Scroll,
} from 'lucide-react';
import { usePaymentPause } from '@/lib/hooks/usePaymentPause';
import { useSidebarConfigSafe } from '@/components/layout/SidebarConfigContext';

// 底部导航栏的默认入口
const DEFAULT_MAIN_ITEMS = ['fortune-hub', 'liuyao', 'chat', 'daily'];

// 所有可用的导航项目映射
const ALL_NAV_ITEMS: Record<string, { href: string; label: string; icon: LucideIcon }> = {
    'fortune-hub': { href: '/fortune-hub', label: '运势中心', icon: Compass },
    'bazi': { href: '/bazi', label: '八字', icon: Orbit },
    'records': { href: '/records', label: '命理记录', icon: Tags },
    'community': { href: '/community', label: '社区', icon: Aperture },
    'hepan': { href: '/hepan', label: '八字合盘', icon: HeartHandshake },
    'ziwei': { href: '/ziwei', label: '紫微斗数', icon: Sparkles },
    'tarot': { href: '/tarot', label: '塔罗', icon: Gem },
    'liuyao': { href: '/liuyao', label: '六爻', icon: Dices },
    'face': { href: '/face', label: '面相', icon: ScanFace },
    'palm': { href: '/palm', label: '手相', icon: Hand },
    'mbti': { href: '/mbti', label: 'MBTI', icon: Brain },
    'chat': { href: '/chat', label: 'AI', icon: BotMessageSquare },
    'daily': { href: '/daily', label: '日运', icon: Sun },
    'monthly': { href: '/monthly', label: '月运', icon: CalendarRange },
    'user': { href: '/user', label: '我的', icon: User },
    'user/settings': { href: '/user/settings', label: '设置', icon: Settings },
    'user/upgrade': { href: '/user/upgrade', label: '订阅', icon: CircleStar },
    'user/charts': { href: '/user/charts', label: '命盘', icon: Scroll },
    'user/notifications': { href: '/user/notifications', label: '通知', icon: Bell },
    'user/orders': { href: '/user/orders', label: '订单', icon: CreditCard },
    'user/settings/ai': { href: '/user/settings/ai', label: '个性化', icon: MessageCircleHeart },
    'user/knowledge-base': { href: '/user/knowledge-base', label: '知识库', icon: BookOpenText },
    'user/help': { href: '/user/help', label: '帮助', icon: CircleHelp },
};

// 抽屉中显示的默认顺序
const DEFAULT_DRAWER_ORDER = [
    'bazi', 'records', 'community', 'hepan', 'ziwei', 'tarot',
    'face', 'palm', 'mbti', 'monthly', 'user', 'user/settings',
    'user/upgrade', 'user/charts', 'user/notifications', 'user/orders',
    'user/settings/ai', 'user/knowledge-base', 'user/help'
];

export function MobileNav() {
    const pathname = usePathname();
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const { isPaused: isPaymentPaused } = usePaymentPause();
    const { config } = useSidebarConfigSafe();

    // 根据配置计算底部导航栏项目
    const mainNavItems = useMemo(() => {
        const items = config.mobileMainItems || DEFAULT_MAIN_ITEMS;
        return items
            .map(id => ALL_NAV_ITEMS[id])
            .filter((item): item is typeof ALL_NAV_ITEMS[string] => !!item);
    }, [config.mobileMainItems]);

    // 根据配置计算抽屉中的项目
    const drawerNavItems = useMemo(() => {
        const order = config.mobileDrawerOrder || DEFAULT_DRAWER_ORDER;
        const hidden = new Set(config.hiddenMobileItems || []);
        const mainSet = new Set(config.mobileMainItems || DEFAULT_MAIN_ITEMS);
        const orderSet = new Set(order);

        // 按顺序排列已有的项目
        const orderedItems = order
            .filter(id => !mainSet.has(id) && !hidden.has(id))
            .map(id => ALL_NAV_ITEMS[id])
            .filter((item): item is typeof ALL_NAV_ITEMS[string] => !!item);

        // 添加不在 order 中的新项目（追加到末尾）
        const newItems = Object.entries(ALL_NAV_ITEMS)
            .filter(([id]) => !orderSet.has(id) && !mainSet.has(id) && !hidden.has(id))
            .map(([, item]) => item);

        return [...orderedItems, ...newItems];
    }, [config.mobileDrawerOrder, config.hiddenMobileItems, config.mobileMainItems]);

    // 点击外部或链接时关闭抽屉
    const closeDrawer = useCallback(() => {
        setIsDrawerOpen(false);
    }, []);

    // 打开抽屉时禁止背景滚动
    useEffect(() => {
        if (isDrawerOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isDrawerOpen]);

    return (
        <>
            {/* 抽屉遮罩 */}
            {isDrawerOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/50 z-40 transition-opacity"
                    onClick={closeDrawer}
                />
            )}

            {/* 抽屉内容 */}
            <div
                className={`
                    lg:hidden fixed left-0 right-0 bottom-0 z-50
                    bg-background rounded-t-2xl
                    transform transition-transform duration-300 ease-out
                    ${isDrawerOpen ? 'translate-y-0' : 'translate-y-full'}
                    max-h-[70vh] overflow-hidden flex flex-col
                `}
            >
                {/* 抽屉头部 */}
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <h3 className="font-medium text-foreground">全部功能</h3>
                    <div className="flex items-center gap-1">
                        <Link
                            href="/user/settings"
                            onClick={closeDrawer}
                            className="p-2 rounded-full hover:bg-background-secondary text-foreground-secondary"
                            title="自定义导航"
                        >
                            <SlidersHorizontal className="w-5 h-5" />
                        </Link>
                        <button
                            onClick={closeDrawer}
                            className="p-2 rounded-full hover:bg-background-secondary text-foreground-secondary"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* 抽屉内容网格 */}
                <div className="flex-1 overflow-y-auto p-4">
                    <div className="grid grid-cols-4 gap-3">
                        {drawerNavItems.map((item) => {
                            // 精确匹配：只有完全匹配或者是该路径的直接子页面才高亮
                            const isActive = pathname === item.href ||
                                (pathname?.startsWith(item.href + '/') && !drawerNavItems.some(other =>
                                    other.href !== item.href &&
                                    other.href.startsWith(item.href + '/') &&
                                    (pathname === other.href || pathname?.startsWith(other.href + '/'))
                                ));
                            const Icon = item.icon;

                            if (item.href === '/user/upgrade' && isPaymentPaused) {
                                return (
                                    <div
                                        key={item.href}
                                        className="flex flex-col items-center justify-center p-3 rounded-xl
                                            bg-background-secondary opacity-60 cursor-not-allowed"
                                        onClick={(e) => e.preventDefault()}
                                    >
                                        <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center mb-2">
                                            <Icon className="w-5 h-5 text-foreground-secondary" />
                                        </div>
                                        <span className="text-xs text-foreground-secondary text-center flex flex-col items-center gap-0.5">
                                            {item.label}
                                            <span className="text-[10px] text-amber-600 bg-amber-500/10 px-1.5 py-px rounded-full transform scale-90">
                                                暂停服务
                                            </span>
                                        </span>
                                    </div>
                                );
                            }

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`flex flex-col items-center justify-center p-3 rounded-xl
                                        transition-colors duration-200
                                        ${isActive
                                            ? 'bg-accent/10 text-accent'
                                            : 'bg-background-secondary hover:bg-accent/5 text-foreground-secondary'
                                        }`}
                                    onClick={closeDrawer}
                                >
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2
                                        ${isActive ? 'bg-accent/20' : 'bg-background'}`}>
                                        <Icon className={`w-5 h-5 ${isActive ? 'text-accent' : ''}`} />
                                    </div>
                                    <span className="text-xs text-center">{item.label}</span>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* 底部导航栏 */}
            <nav
                className={`
                    lg:hidden fixed bottom-0 left-0 right-0 z-40
                    bg-background/95 backdrop-blur-md
                    border-t border-border
                    safe-area-inset-bottom
                    transition-transform duration-300
                    ${isDrawerOpen ? 'translate-y-full' : 'translate-y-0'}
                `}
            >
                <ul className={`grid px-2 py-1 ${
                    mainNavItems.length === 0 ? 'grid-cols-1' :
                    mainNavItems.length === 1 ? 'grid-cols-2' :
                    mainNavItems.length === 2 ? 'grid-cols-3' :
                    mainNavItems.length === 3 ? 'grid-cols-4' :
                    'grid-cols-5'
                }`}>
                    {mainNavItems.map((item) => {
                        const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                        const Icon = item.icon;

                        return (
                            <li key={item.href}>
                                <Link
                                    href={item.href}
                                    className={`
                                        flex flex-col items-center justify-center
                                        w-full h-14
                                        transition-colors duration-200
                                        ${isActive ? 'text-accent' : 'text-foreground-secondary'}
                                    `}
                                >
                                    <Icon className="w-5 h-5" />
                                    <span className="text-[10px] mt-1 font-medium">{item.label}</span>
                                </Link>
                            </li>
                        );
                    })}

                    {/* 更多按钮 */}
                    <li>
                        <button
                            onClick={() => setIsDrawerOpen(true)}
                            className={`
                                flex flex-col items-center justify-center
                                w-full h-14
                                transition-all duration-200
                                text-foreground-secondary
                            `}
                        >
                            <div className="w-6 h-6 rounded-full flex items-center justify-center">
                                <Plus className="w-5 h-5" />
                            </div>
                            <span className="text-[10px] mt-1 font-medium">更多</span>
                        </button>
                    </li>
                </ul>
            </nav>
        </>
    );
}
