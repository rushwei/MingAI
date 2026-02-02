/**
 * 登录覆盖层组件
 *
 * 'use client' 标记说明：
 * - 使用 React hooks (useState)
 * - 有登录弹窗交互功能
 */
'use client';

import { useState } from 'react';
import { LogIn, Lock } from 'lucide-react';
import { AuthModal } from '@/components/auth/AuthModal';
import { useSessionSafe } from '@/components/providers/ClientProviders';

interface LoginOverlayProps {
    children: React.ReactNode;
    message?: string;
}

/**
 * 登录覆盖层组件
 * 未登录时显示模糊内容并提示登录
 */
export function LoginOverlay({ children, message = '登录后查看完整内容' }: LoginOverlayProps) {
    const [showAuthModal, setShowAuthModal] = useState(false);
    const { user, loading } = useSessionSafe();
    const isAuthed = !!user;

    // 加载中或已登录，直接显示内容
    if (loading || isAuthed) {
        return <>{children}</>;
    }

    // 未登录，显示模糊覆盖层
    return (
        <div className="relative">
            {/* 模糊的内容 */}
            <div className="blur-sm pointer-events-none select-none">
                {children}
            </div>

            {/* 覆盖层 */}
            <div className="absolute inset-0 flex items-start justify-center pt-32 bg-background/60 backdrop-blur-sm">
                <div className="text-center p-6 max-w-sm">
                    <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                        <Lock className="w-8 h-8 text-accent" />
                    </div>
                    <h2 className="text-xl font-bold mb-2">需要登录</h2>
                    <p className="text-foreground-secondary mb-6">
                        {message}
                    </p>
                    <button
                        onClick={() => setShowAuthModal(true)}
                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-accent text-white font-medium hover:bg-accent/90 transition-colors"
                    >
                        <LogIn className="w-4 h-4" />
                        立即登录
                    </button>
                </div>
            </div>

            <AuthModal
                isOpen={showAuthModal}
                onClose={() => setShowAuthModal(false)}
            />
        </div>
    );
}
