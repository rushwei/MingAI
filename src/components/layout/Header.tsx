/**
 * 顶部 Header 组件
 * 
 * 设计说明：
 * - 移动端：显示 Logo 和主题切换
 * - 桌面端：显示用户信息和操作按钮
 * - 集成认证状态显示
 */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { User, LogIn } from 'lucide-react';
import { ThemeToggle } from '../ui/ThemeToggle';
import { AuthModal } from '../auth/AuthModal';
import { supabase } from '@/lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';

export function Header() {
    const [user, setUser] = useState<SupabaseUser | null>(null);
    const [showAuthModal, setShowAuthModal] = useState(false);

    useEffect(() => {
        // 获取当前用户
        supabase.auth.getUser().then(({ data: { user } }) => {
            setUser(user);
        });

        // 监听认证状态变化
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {
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
                    h-16 px-4
                    bg-background/95 backdrop-blur-md
                    border-b border-border
                    flex items-center justify-between
                "
            >
                {/* 移动端 Logo - 桌面端隐藏（已在 Sidebar 中显示） */}
                <Link href="/" className="flex items-center gap-2 lg:hidden">
                    <Image
                        src="/Logo.png"
                        alt="MingAI Logo"
                        width={32}
                        height={32}
                        className="rounded-lg"
                    />
                    <span className="font-bold text-lg text-foreground">MingAI</span>
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
