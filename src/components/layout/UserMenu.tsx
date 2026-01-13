'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    Sparkles,
    Smile,
    Settings,
    HelpCircle,
    LogOut,
    ChevronRight,
    ChevronDown,
    ChevronUp,
    Crown,
    Loader2,
    FileText,
    CreditCard,
    CircleStar,
    Bell,
    User,
} from 'lucide-react';
import { signOut, getUserProfile } from '@/lib/auth';
import { getMembershipInfo, type MembershipInfo } from '@/lib/membership';
import { getUnreadCount } from '@/lib/notification';
import { supabase } from '@/lib/supabase';
import { usePaymentPause } from '@/lib/usePaymentPause';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface SidebarUserCardProps {
    user: SupabaseUser;
    collapsed?: boolean;
}

const membershipLabels: Record<string, string> = {
    free: 'Free',
    plus: 'Plus',
    pro: 'Pro',
};

const membershipColors: Record<string, string> = {
    free: 'text-gray-500',
    plus: 'text-amber-500',
    pro: 'text-purple-500',
};

// 头像组件 - 使用普通 img 标签避免 Next.js Image 配置问题
function Avatar({ src, alt, size = 32 }: { src: string | null; alt: string; size?: number }) {
    const [error, setError] = useState(false);

    if (!src || error) {
        return (
            <div
                className="rounded-full bg-gradient-to-br from-accent/50 to-accent flex items-center justify-center text-white font-medium flex-shrink-0"
                style={{ width: size, height: size, fontSize: size * 0.4 }}
            >
                {alt[0]?.toUpperCase() || 'U'}
            </div>
        );
    }

    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
            src={src}
            alt={alt}
            width={size}
            height={size}
            className="rounded-full flex-shrink-0 object-cover"
            style={{ width: size, height: size }}
            onError={() => setError(true)}
        />
    );
}

export function SidebarUserCard({ user, collapsed = false }: SidebarUserCardProps) {
    const router = useRouter();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [signingOut, setSigningOut] = useState(false);
    const [nickname, setNickname] = useState<string | null>(null);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [membership, setMembership] = useState<MembershipInfo | null>(null);
    const [unreadCount, setUnreadCount] = useState(0);
    const menuRef = useRef<HTMLDivElement>(null);
    const { isPaused: isPaymentPaused } = usePaymentPause();

    const displayName = nickname || user.email?.split('@')[0] || '用户';
    const handle = user.email || 'user';

    // 加载用户信息
    useEffect(() => {
        getUserProfile(user.id).then((profile) => {
            if (profile) {
                setNickname(profile.nickname);
                setAvatarUrl(profile.avatar_url);
            }
        });
        getMembershipInfo(user.id).then(setMembership);
    }, [user.id]);

    // 实时更新未读通知数
    useEffect(() => {
        let isActive = true;
        const fetchCount = async () => {
            const count = await getUnreadCount(user.id);
            if (isActive) {
                setUnreadCount(count);
            }
        };

        fetchCount();

        const channel = supabase
            .channel(`user-menu-notifications:${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`,
                },
                () => {
                    fetchCount();
                }
            )
            .subscribe();

        return () => {
            isActive = false;
            supabase.removeChannel(channel);
        };
    }, [user.id]);

    // 通知页面主动同步未读数
    useEffect(() => {
        const handleUnreadUpdate = (event: Event) => {
            const detail = (event as CustomEvent<{ count?: number }>).detail;
            if (typeof detail?.count === 'number') {
                setUnreadCount(detail.count);
            }
        };

        window.addEventListener('mingai:notifications-unread', handleUnreadUpdate);
        return () => {
            window.removeEventListener('mingai:notifications-unread', handleUnreadUpdate);
        };
    }, []);

    // 点击外部关闭菜单
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSignOut = async () => {
        if (signingOut) return;
        setSigningOut(true);
        try {
            await signOut();
            setIsMenuOpen(false);
            // 强制刷新整个页面以确保所有状态重置
            window.location.reload();
        } catch (error) {
            console.error('Sign out error:', error);
            setSigningOut(false);
        }
    };

    const membershipType = membership?.type || 'free';

    // 折叠状态只显示头像
    if (collapsed) {
        return (
            <Link
                href="/user"
                className="flex items-center justify-center p-2 rounded-lg hover:bg-background-secondary transition-colors"
                title={displayName}
            >
                <Avatar src={avatarUrl} alt={displayName} size={28} />
            </Link>
        );
    }

    return (
        <div className="relative" ref={menuRef}>
            {/* 用户信息卡片 - 始终显示 */}
            <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-background-secondary transition-colors"
            >
                <Avatar src={avatarUrl} alt={displayName} size={32} />
                <div className="flex-1 min-w-0 text-left">
                    <div className="text-sm font-medium truncate">{displayName}</div>
                    <div className={`text-xs flex items-center gap-1 ${membershipColors[membershipType]}`}>
                        {/* <Crown className="w-3 h-3" /> */}
                        {membershipLabels[membershipType]}
                    </div>
                </div>
                {isMenuOpen ? (
                    <ChevronUp className="w-4 h-4 text-foreground-secondary flex-shrink-0" />
                ) : (
                    <ChevronDown className="w-4 h-4 text-foreground-secondary flex-shrink-0" />
                )}
            </button>

            {/* 下拉菜单 */}
            {isMenuOpen && (
                <div className="absolute z-50 bottom-full mb-2 left-0 right-0 bg-background border border-border rounded-xl shadow-lg py-2 animate-fade-in">
                    {/* 用户信息头部 - 点击跳转到用户主页 */}
                    <div className="px-2 pb-2 border-b border-border">
                        <Link
                            href="/user"
                            onClick={() => setIsMenuOpen(false)}
                            className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-background-secondary transition-colors"
                        >
                            <Avatar src={avatarUrl} alt={displayName} size={32} />
                            <div className="min-w-0 flex-1">
                                <div className="font-medium text-sm truncate">{displayName}</div>
                                <div className="text-xs text-foreground-secondary truncate">{handle}</div>
                            </div>
                        </Link>
                    </div>

                    {/* 菜单项 */}
                    <div className="px-2 py-1">
                        <Link
                            href="/user"
                            onClick={() => setIsMenuOpen(false)}
                            className="flex items-center gap-3 px-2 py-2 text-sm rounded-lg hover:bg-background-secondary transition-colors"
                        >
                            <User className="w-4.5 h-4.5 text-foreground-secondary" />
                            <span>用户中心</span>
                        </Link>
                        {isPaymentPaused ? (
                            <div className="flex items-center gap-3 px-2 py-2 text-sm rounded-lg text-foreground-secondary cursor-not-allowed opacity-60">
                                <CircleStar className="w-4.5 h-4.5 text-foreground-secondary" />
                                <span>订阅</span>
                                <span className="ml-auto text-[10px] text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full">
                                    暂停服务
                                </span>
                            </div>
                        ) : (
                            <Link
                                href="/user/upgrade"
                                onClick={() => setIsMenuOpen(false)}
                                className="flex items-center gap-3 px-2 py-2 text-sm rounded-lg hover:bg-background-secondary transition-colors"
                            >
                                <CircleStar className="w-4.5 h-4.5 text-foreground-secondary" />
                                <span>订阅</span>
                            </Link>
                        )}
                        <Link
                            href="/user/notifications"
                            onClick={() => setIsMenuOpen(false)}
                            className="flex items-center gap-3 px-2 py-2 text-sm rounded-lg hover:bg-background-secondary transition-colors"
                        >
                            <Bell className="w-4.5 h-4.5 text-foreground-secondary" />
                            <span>消息通知</span>
                            {unreadCount > 0 && (
                                <span className="ml-auto min-w-[18px] h-[18px] px-1 text-[10px] font-bold bg-accent text-white rounded-full flex items-center justify-center">
                                    {unreadCount > 99 ? '99+' : unreadCount}
                                </span>
                            )}
                        </Link>
                        <Link
                            href="/user/charts"
                            onClick={() => setIsMenuOpen(false)}
                            className="flex items-center gap-3 px-2 py-2 text-sm rounded-lg hover:bg-background-secondary transition-colors"
                        >
                            <FileText className="w-4.5 h-4.5 text-foreground-secondary" />
                            <span>命盘</span>
                        </Link>
                        <Link
                            href="/user/settings"
                            onClick={() => setIsMenuOpen(false)}
                            className="flex items-center gap-3 px-2 py-2 text-sm rounded-lg hover:bg-background-secondary transition-colors"
                        >
                            <Settings className="w-4.5 h-4.5 text-foreground-secondary" />
                            <span>设置</span>
                        </Link>
                    </div>

                    {/* 退出登录 */}
                    <div className="border-t border-border px-2 pt-1">
                        <button
                            onClick={handleSignOut}
                            disabled={signingOut}
                            className="flex items-center gap-3 px-2 py-2 text-sm rounded-lg hover:bg-background-secondary transition-colors w-full disabled:opacity-50"
                        >
                            {signingOut ? (
                                <Loader2 className="w-4.5 h-4.5 animate-spin text-foreground-secondary" />
                            ) : (
                                <LogOut className="w-4.5 h-4.5 text-foreground-secondary" />
                            )}
                            <span>{signingOut ? '退出中...' : '退出登录'}</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
