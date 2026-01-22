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
import { useState, useEffect, useCallback } from 'react';
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
    Github,
    Aperture,
    Tags,
    Scroll,
    CalendarCheck,
    HelpCircle,
    Bell,
    Settings,
    CircleStar,
} from 'lucide-react';
import { usePaymentPause } from '@/lib/usePaymentPause';

// 底部导航栏的 5 个主要入口
const mainNavItems = [
    { href: '/fortune-hub', label: '运势中心', icon: Compass },
    { href: '/liuyao', label: '六爻', icon: Dices },
    { href: '/chat', label: 'AI', icon: BotMessageSquare },
    { href: '/daily', label: '每日运势', icon: Sun },
];

// 抽屉中显示的所有入口
const drawerNavItems = [
    { href: '/bazi', label: '八字', icon: Orbit, emoji: '🧭' },
    { href: '/user/checkin', label: '每日签到', icon: CalendarCheck, emoji: '📅' },
    { href: '/records', label: '命理记录', icon: Tags, emoji: '📝' },
    { href: '/community', label: '命理社区', icon: Aperture, emoji: '💬' },
    { href: '/hepan', label: '八字合盘', icon: HeartHandshake, emoji: '💑' },
    { href: '/ziwei', label: '紫微斗数', icon: Sparkles, emoji: '⭐' },
    { href: '/tarot', label: '塔罗占卜', icon: Gem, emoji: '🃏' },
    { href: '/face', label: '面相分析', icon: ScanFace, emoji: '👤' },
    { href: '/palm', label: '手相分析', icon: Hand, emoji: '🖐️' },
    { href: '/mbti', label: 'MBTI测试', icon: Brain, emoji: '🧩' },
    { href: '/monthly', label: '每月运势', icon: CalendarRange, emoji: '📅' },
    { href: '/user', label: '个人中心', icon: User, emoji: '👤' },
    { href: '/user/charts', label: '我的命盘', icon: Scroll, emoji: '📜' },
    { href: '/user/upgrade', label: '订阅', icon: CircleStar, emoji: '👑' },
    { href: '/user/notifications', label: '通知', icon: Bell, emoji: '🔔' },
    { href: '/user/settings', label: '设置', icon: Settings, emoji: '⚙️' },
    { href: '/help', label: '帮助中心', icon: HelpCircle, emoji: '❓' },
    { href: 'https://github.com/hhszzzz/MingAI/', label: '反馈建议', icon: Github, emoji: '💡', external: true },
];

export function MobileNav() {
    const pathname = usePathname();
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const { isPaused: isPaymentPaused } = usePaymentPause();

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
                    <button
                        onClick={closeDrawer}
                        className="p-2 rounded-full hover:bg-background-secondary text-foreground-secondary"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* 抽屉内容网格 */}
                <div className="flex-1 overflow-y-auto p-4">
                    <div className="grid grid-cols-4 gap-3">
                        {drawerNavItems.map((item) => {
                            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                            const Icon = item.icon;

                            if (item.external) {
                                return (
                                    <a
                                        key={item.href}
                                        href={item.href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex flex-col items-center justify-center p-3 rounded-xl
                                            bg-background-secondary hover:bg-accent/10
                                            transition-colors duration-200"
                                        onClick={closeDrawer}
                                    >
                                        <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center mb-2">
                                            <Icon className="w-5 h-5 text-foreground-secondary" />
                                        </div>
                                        <span className="text-xs text-foreground-secondary text-center">{item.label}</span>
                                    </a>
                                );
                            }

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
                <ul className="grid grid-cols-5 px-2 py-1">
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
