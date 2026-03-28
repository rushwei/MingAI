/**
 * 用户菜单组件
 *
 * 'use client' 标记说明：
 * - 使用 React hooks (useState, useRef, useEffect)
 * - 有下拉菜单交互功能
 */
'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
    Settings,
    LogOut,
    CircleStar,
    Bell,
    User,
    Scroll,
} from 'lucide-react';
import { SoundWaveLoader } from '@/components/ui/SoundWaveLoader';
import { signOut, getUserProfile } from '@/lib/auth';
import { buildMembershipInfo, type MembershipInfo } from '@/lib/user/membership';
import { usePaymentPause } from '@/lib/hooks/usePaymentPause';
import { useFeatureToggles } from '@/lib/hooks/useFeatureToggles';
import { useNotificationUnreadCount } from '@/lib/hooks/useNotificationUnreadCount';
import { getUserEmailDisplay } from '@/lib/user-email';
import type { User as SupabaseUser } from '@/lib/auth';

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
                className="rounded-full bg-gray-200 flex items-center justify-center text-[#37352f] font-medium flex-shrink-0"
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
            className="rounded-full flex-shrink-0 object-cover border border-gray-100"
            style={{ width: size, height: size }}
            onError={() => setError(true)}
        />
    );
}

export function SidebarUserCard({ user, collapsed = false }: SidebarUserCardProps) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [signingOut, setSigningOut] = useState(false);
    const [nickname, setNickname] = useState<string | null>(null);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [membership, setMembership] = useState<MembershipInfo | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const { isPaused: isPaymentPaused } = usePaymentPause();
    const { isFeatureEnabled } = useFeatureToggles({ enabled: !collapsed });
    const notificationsFeatureEnabled = isFeatureEnabled('notifications');
    const upgradeFeatureEnabled = isFeatureEnabled('upgrade');
    const chartsFeatureEnabled = isFeatureEnabled('charts');
    const unreadCount = useNotificationUnreadCount(user.id, {
        enabled: !collapsed && notificationsFeatureEnabled,
    });

    const displayName = nickname || user.email?.split('@')[0] || '用户';
    const handle = getUserEmailDisplay(user) || 'user';

    // 加载用户信息
    useEffect(() => {
        let isActive = true;
        const load = async () => {
            const profile = await getUserProfile(user.id);
            if (!isActive) return;
            if (profile) {
                setNickname(profile.nickname ?? null);
                setAvatarUrl(profile.avatar_url ?? null);
                setMembership(buildMembershipInfo(profile));
                return;
            }
            setMembership(buildMembershipInfo(null));
        };
        load();

        const handleUserDataInvalidate = () => {
            void load();
        };
        window.addEventListener('mingai:user-data:invalidate', handleUserDataInvalidate);

        return () => {
            isActive = false;
            window.removeEventListener('mingai:user-data:invalidate', handleUserDataInvalidate);
        };
    }, [user.id]);

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
                className="flex items-center justify-center p-2 rounded-md hover:bg-[#efedea] transition-colors duration-150"
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
                className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md transition-colors duration-150 ${isMenuOpen ? 'bg-[#e3e1db]' : 'hover:bg-[#efedea]'}`}
            >
                <Avatar src={avatarUrl} alt={displayName} size={32} />
                <div className="flex-1 min-w-0 text-left">
                    <div className="text-sm font-medium truncate text-[#37352f]">{displayName}</div>
                    <div className={`text-xs flex items-center gap-1 font-semibold ${membershipColors[membershipType]}`}>
                        {/* <Crown className="w-3 h-3" /> */}
                        {membershipLabels[membershipType]}
                    </div>
                </div>
            </button>

            {/* 下拉菜单 */}
            {isMenuOpen && (
                <div className="absolute z-50 bottom-full mb-2 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-md py-1 animate-fade-in transition-all duration-150">
                    {/* 用户信息头部 - 点击跳转到用户主页 */}
                    <div className="px-1 pb-1 border-b border-gray-100">
                        <Link
                            href="/user"
                            onClick={() => setIsMenuOpen(false)}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-[#efedea] transition-colors duration-150"
                        >
                            <Avatar src={avatarUrl} alt={displayName} size={32} />
                            <div className="min-w-0 flex-1">
                                <div className="font-semibold text-sm truncate text-[#37352f]">{displayName}</div>
                                <div className="text-xs text-[#37352f]/50 truncate">{handle}</div>
                            </div>
                        </Link>
                    </div>

                    {/* 菜单项 */}
                    <div className="px-1 py-1">
                        <Link
                            href="/user"
                            onClick={() => setIsMenuOpen(false)}
                            className="flex items-center gap-3 px-2 py-1.5 text-sm rounded-md hover:bg-[#efedea] transition-colors duration-150 text-[#37352f]"
                        >
                            <User className="w-4 h-4 text-[#37352f]/70" />
                            <span>我的</span>
                        </Link>
                        {isPaymentPaused || !upgradeFeatureEnabled ? null : (
                            <Link
                                href="/user/upgrade"
                                onClick={() => setIsMenuOpen(false)}
                                className="flex items-center gap-3 px-2 py-1.5 text-sm rounded-md hover:bg-[#efedea] transition-colors duration-150 text-[#37352f]"
                            >
                                <CircleStar className="w-4 h-4 text-[#37352f]/70" />
                                <span>订阅</span>
                            </Link>
                        )}
                        {notificationsFeatureEnabled && (
                            <Link
                                href="/user/notifications"
                                onClick={() => setIsMenuOpen(false)}
                                className="flex items-center gap-3 px-2 py-1.5 text-sm rounded-md hover:bg-[#efedea] transition-colors duration-150 text-[#37352f]"
                            >
                                <Bell className="w-4 h-4 text-[#37352f]/70" />
                                <span>消息</span>
                                {unreadCount > 0 && (
                                    <span className="ml-auto min-w-[18px] h-[18px] px-1 text-[10px] font-bold bg-[#2383e2] text-white rounded-full flex items-center justify-center">
                                        {unreadCount > 99 ? '99+' : unreadCount}
                                    </span>
                                )}
                            </Link>
                        )}
                        {chartsFeatureEnabled && (
                            <Link
                                href="/user/charts"
                                onClick={() => setIsMenuOpen(false)}
                                className="flex items-center gap-3 px-2 py-1.5 text-sm rounded-md hover:bg-[#efedea] transition-colors duration-150 text-[#37352f]"
                            >
                                <Scroll className="w-4 h-4 text-[#37352f]/70" />
                                <span>命盘</span>
                            </Link>
                        )}
                        <Link
                            href="/user/settings"
                            onClick={() => setIsMenuOpen(false)}
                            className="flex items-center gap-3 px-2 py-1.5 text-sm rounded-md hover:bg-[#efedea] transition-colors duration-150 text-[#37352f]"
                        >
                            <Settings className="w-4 h-4 text-[#37352f]/70" />
                            <span>设置</span>
                        </Link>
                    </div>

                    {/* 退出登录 */}
                    <div className="border-t border-gray-100 px-1 pt-1">
                        <button
                            onClick={handleSignOut}
                            disabled={signingOut}
                            className="flex items-center gap-3 px-2 py-1.5 text-sm rounded-md hover:bg-[#efedea] transition-colors duration-150 w-full disabled:opacity-50 text-[#37352f]"
                        >
                            {signingOut ? (
                                <SoundWaveLoader variant="inline" />
                            ) : (
                                <LogOut className="w-4 h-4 text-[#37352f]/70" />
                            )}
                            <span>{signingOut ? '退出中...' : '退出登录'}</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
