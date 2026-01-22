/**
 * 顶部 Header 组件
 * 
 * 设计说明：
 * - 移动端：根据当前路由动态显示功能图标和名称
 * - 桌面端：显示用户信息和操作按钮
 * - 集成认证状态显示
 */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
    User,
    LogIn,
    Orbit,
    Sparkles,
    Gem,
    Dices,
    HeartHandshake,
    ScanFace,
    Hand,
    Brain,
    Sun,
    CalendarRange,
    Compass,
    Tags,
    Aperture,
    type LucideIcon,
} from 'lucide-react';
import { ThemeToggle } from '../ui/ThemeToggle';
import { AuthModal } from '../auth/AuthModal';
import { supabase } from '@/lib/supabase';
import type { User as SupabaseUser } from '@/lib/supabase';

// 路由到品牌信息的映射（移动端顶栏动态显示）
// icon 为 null 时表示仅显示文字，不显示图标
type RouteBranding = {
    prefix: string;
    icon: LucideIcon | null;
    label: string;
    iconClass: string;  // 完整的图标颜色类
    bgClass: string;    // 完整的背景颜色类
};

const ROUTE_BRANDING: RouteBranding[] = [
    { prefix: '/bazi', icon: Orbit, label: '八字', iconClass: 'text-amber-500', bgClass: 'bg-amber-500/10' },
    { prefix: '/ziwei', icon: Sparkles, label: '紫微斗数', iconClass: 'text-purple-500', bgClass: 'bg-purple-500/10' },
    { prefix: '/tarot', icon: Gem, label: '塔罗占卜', iconClass: 'text-purple-500', bgClass: 'bg-purple-500/10' },
    { prefix: '/liuyao', icon: Dices, label: '六爻占卜', iconClass: 'text-amber-500', bgClass: 'bg-amber-500/10' },
    { prefix: '/hepan', icon: HeartHandshake, label: '关系合盘', iconClass: 'text-rose-500', bgClass: 'bg-rose-500/10' },
    { prefix: '/face', icon: ScanFace, label: '面相分析', iconClass: 'text-orange-500', bgClass: 'bg-orange-500/10' },
    { prefix: '/palm', icon: Hand, label: '手相分析', iconClass: 'text-amber-500', bgClass: 'bg-amber-500/10' },
    { prefix: '/mbti', icon: Brain, label: 'MBTI', iconClass: 'text-blue-500', bgClass: 'bg-blue-500/10' },
    { prefix: '/daily', icon: Sun, label: '每日运势', iconClass: 'text-yellow-500', bgClass: 'bg-yellow-500/10' },
    { prefix: '/monthly', icon: CalendarRange, label: '每月运势', iconClass: 'text-yellow-500', bgClass: 'bg-yellow-500/10' },
    { prefix: '/fortune-hub', icon: Compass, label: '运势中心', iconClass: 'text-teal-500', bgClass: 'bg-teal-500/10' },
    { prefix: '/records', icon: Tags, label: '命理记录', iconClass: 'text-emerald-500', bgClass: 'bg-emerald-500/10' },
    { prefix: '/community', icon: Aperture, label: '命理社区', iconClass: 'text-purple-500', bgClass: 'bg-purple-500/10' },
    // 用户子页面（需放在 /user 之前以优先匹配）
    { prefix: '/user/checkin', icon: null, label: '每日签到', iconClass: '', bgClass: '' },
    { prefix: '/user/settings', icon: null, label: '偏好设置', iconClass: '', bgClass: '' },
    { prefix: '/user/notifications', icon: null, label: '通知中心', iconClass: '', bgClass: '' },
    { prefix: '/user/charts', icon: null, label: '我的命盘', iconClass: '', bgClass: '' },
    { prefix: '/user/upgrade', icon: null, label: '订阅会员', iconClass: '', bgClass: '' },
    { prefix: '/user/orders', icon: null, label: '订单记录', iconClass: '', bgClass: '' },
    { prefix: '/user/profile', icon: null, label: '个人资料', iconClass: '', bgClass: '' },
    { prefix: '/user/annual-report', icon: null, label: '年度报告', iconClass: '', bgClass: '' },
    // 通用页面
    { prefix: '/user', icon: null, label: '个人中心', iconClass: '', bgClass: '' },
    { prefix: '/chat', icon: null, label: 'AI 对话', iconClass: '', bgClass: '' },
    { prefix: '/help', icon: null, label: '帮助中心', iconClass: '', bgClass: '' },
];

export function Header() {
    const pathname = usePathname();
    const [user, setUser] = useState<SupabaseUser | null>(null);
    const [showAuthModal, setShowAuthModal] = useState(false);

    // 根据当前路由获取品牌信息
    const currentBranding = ROUTE_BRANDING.find(item => pathname?.startsWith(item.prefix));

    useEffect(() => {
        // 使用 getSession 从本地缓存读取（比 getUser 快得多）
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
        });

        // 监听认证状态变化
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                setUser(session?.user ?? null);
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    return (
        <>
            <header
                className="
                    sticky top-0 z-40
                    safe-top-header px-4
                    bg-background/95 backdrop-blur-md
                    border-b border-border
                    flex items-center justify-between
                "
            >
                {/* 移动端 Logo/功能图标 - 桌面端隐藏（已在 Sidebar 中显示） */}
                <Link href={currentBranding ? pathname?.split('/').slice(0, 2).join('/') || '/' : '/'} className="flex items-center gap-2 lg:hidden">
                    {currentBranding ? (
                        currentBranding.icon ? (
                            // 有图标的路由：显示彩色图标 + 标题
                            <>
                                <div className={`w-8 h-8 rounded-lg ${currentBranding.bgClass} flex items-center justify-center`}>
                                    <currentBranding.icon className={`w-5 h-5 ${currentBranding.iconClass}`} />
                                </div>
                                <span className="font-bold text-lg text-foreground">{currentBranding.label}</span>
                            </>
                        ) : (
                            // 无图标的路由：显示 MingAI logo + 自定义标题
                            <>
                                <Image
                                    src="/Logo.png"
                                    alt="MingAI Logo"
                                    width={32}
                                    height={32}
                                    className="rounded-lg"
                                />
                                <span className="font-bold text-lg text-foreground">{currentBranding.label}</span>
                            </>
                        )
                    ) : (
                        // 默认：MingAI Logo
                        <>
                            <Image
                                src="/Logo.png"
                                alt="MingAI Logo"
                                width={32}
                                height={32}
                                className="rounded-lg"
                            />
                            <span className="font-bold text-lg text-foreground">MingAI</span>
                        </>
                    )}
                </Link>

                {/* 桌面端占位 - 保持布局平衡 */}
                <div className="hidden lg:block" />

                {/* 右侧操作区 */}
                <div className="flex items-center gap-2">
                    {/* 主题切换按钮 */}
                    <ThemeToggle />

                    {/* 用户状态 */}
                    {user ? (
                        // 已登录：显示用户头像链接
                        <Link
                            href="/user"
                            className="
                                p-2 rounded-lg
                                text-foreground-secondary
                                hover:bg-background-secondary hover:text-foreground
                                transition-all duration-200
                            "
                            aria-label="个人中心"
                        >
                            <User className="w-5 h-5" />
                        </Link>
                    ) : (
                        // 未登录：显示登录按钮
                        <button
                            onClick={() => setShowAuthModal(true)}
                            className="
                                flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                                text-sm font-medium
                                bg-accent text-white
                                hover:bg-accent/90
                                transition-all duration-200
                            "
                        >
                            <LogIn className="w-4 h-4" />
                            <span className="hidden sm:inline">登录</span>
                        </button>
                    )}
                </div>
            </header>

            {/* 登录弹窗 */}
            <AuthModal
                isOpen={showAuthModal}
                onClose={() => setShowAuthModal(false)}
            />
        </>
    );
}
