'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  CircleQuestionMark,
  LayoutPanelTop,
  LogOut,
  MessageCircleHeart,
  Scroll,
  Settings,
  User,
} from 'lucide-react';
import { SoundWaveLoader } from '@/components/ui/SoundWaveLoader';
import { signOut } from '@/lib/auth';
import { buildMembershipInfo } from '@/lib/user/membership';
import { useFeatureToggles } from '@/lib/hooks/useFeatureToggles';
import type { User as SupabaseUser } from '@/lib/auth';
import { SettingsCenterLink } from '@/components/settings/SettingsCenterLink';
import { useCurrentUserProfile } from '@/lib/hooks/useCurrentUserProfile';

interface SidebarUserCardProps {
    user: SupabaseUser;
    collapsed?: boolean;
}

const membershipLabels: Record<string, string> = {
    free: 'Free',
    plus: 'Plus',
    pro: 'Pro',
};

function Avatar({ src, alt, size = 32 }: { src: string | null; alt: string; size?: number }) {
    const [error, setError] = useState(false);

    if (!src || error) {
        return (
            <div
                className="flex flex-shrink-0 items-center justify-center rounded-md bg-[#efedea] font-bold text-[#37352f]/40 border border-gray-200"
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
            className="rounded-md border border-gray-200 object-cover flex-shrink-0"
            style={{ width: size, height: size }}
            onError={() => setError(true)}
        />
    );
}

function useIsDesktopSidebar() {
    return useSyncExternalStore(
        (onStoreChange) => {
            if (typeof window === 'undefined') {
                return () => { };
            }
            const mediaQuery = window.matchMedia('(min-width: 1024px)');
            mediaQuery.addEventListener('change', onStoreChange);
            return () => mediaQuery.removeEventListener('change', onStoreChange);
        },
        () => (typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)').matches : false),
        () => false,
    );
}

export function SidebarUserCard({ user, collapsed = false }: SidebarUserCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isDesktopSidebar = useIsDesktopSidebar();
  const { isFeatureEnabled } = useFeatureToggles();
  const { profile, loading: profileLoading, resolved: profileResolved } = useCurrentUserProfile({ enabled: isDesktopSidebar });
  const personalizationEnabled = isFeatureEnabled('ai-personalization');
  const chartsEnabled = isFeatureEnabled('charts');
  const helpEnabled = isFeatureEnabled('help');

  const membership = profileResolved ? buildMembershipInfo(profile ?? null) : null;
  const isAdmin = !!profile?.is_admin;
  const avatarUrl = profile?.avatar_url ?? null;
  const displayName = profile?.nickname || user.email?.split('@')[0] || '用户';
  const membershipLabel = profileLoading || !profileResolved
    ? '...'
    : `${membershipLabels[membership?.type || 'free']} Plan`;

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
      window.location.reload();
    } catch (error) {
      console.error('Sign out error:', error);
      setSigningOut(false);
    }
  };

    return (
        <div className="relative" ref={menuRef}>
            <button
                type="button"
                onClick={() => setIsMenuOpen((prev) => !prev)}
                className={`w-full rounded-md transition-colors duration-150 flex items-center ${
                    collapsed ? 'justify-center p-1.5' : 'px-2 py-1.5'
                } ${
                    isMenuOpen ? 'bg-[#e3e1db]' : 'hover:bg-[#efedea]'
                }`}
            >
                <div className="flex items-center gap-2.5 w-full">
                    <Avatar src={avatarUrl} alt={displayName} size={collapsed ? 28 : 32} />
                    {!collapsed && (
                        <div className="min-w-0 flex-1 text-left flex items-center justify-between">
                            <div className="min-w-0">
                                <div className="truncate text-sm font-semibold text-[#37352f]">{displayName}</div>
                                <div className="truncate text-[11px] font-medium text-[#37352f]/40">{membershipLabel}</div>
                            </div>
                        </div>
                    )}
                </div>
            </button>

            {isMenuOpen ? (
                <div className={`absolute bottom-full mb-2 z-[100] overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg animate-in fade-in zoom-in-95 duration-100 origin-bottom-left ${collapsed ? 'left-2 w-[240px]' : 'left-0 right-0'}`}>
                    <div className="p-1 flex flex-col">
                        {/* 用户信息头部 */}
                        <div className="px-2 py-2 flex items-center gap-3">
                            <Avatar src={avatarUrl} alt={displayName} size={36} />
                            <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-bold text-[#37352f]">{displayName}</div>
                                <div className="truncate text-[11px] text-[#37352f]/40 font-medium">
                                    {user.email}
                                </div>
                            </div>
                        </div>

                        <div className="h-px bg-gray-100 my-1 mx-1" />

                        {/* 设置选项 */}
                        <div className="flex flex-col">
                            {personalizationEnabled && (
                                <SettingsCenterLink
                                    tab="personalization"
                                    onClick={() => setIsMenuOpen(false)}
                                    className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm font-medium text-[#37352f]/80 transition-colors hover:bg-[#efedea] hover:text-[#37352f]"
                                >
                                    <MessageCircleHeart className="h-4 w-4 text-[#37352f]/40" />
                                    <span>个性化</span>
                                </SettingsCenterLink>
                            )}

                            {chartsEnabled && (
                                <SettingsCenterLink
                                    tab="charts"
                                    onClick={() => setIsMenuOpen(false)}
                                    className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm font-medium text-[#37352f]/80 transition-colors hover:bg-[#efedea] hover:text-[#37352f]"
                                >
                                    <Scroll className="h-4 w-4 text-[#37352f]/40" />
                                    <span>命盘</span>
                                </SettingsCenterLink>
                            )}

                            <SettingsCenterLink
                                tab="profile"
                                onClick={() => setIsMenuOpen(false)}
                                className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm font-medium text-[#37352f]/80 transition-colors hover:bg-[#efedea] hover:text-[#37352f]"
                            >
                                <User className="h-4 w-4 text-[#37352f]/40" />
                                <span>个人资料</span>
                            </SettingsCenterLink>

                            <SettingsCenterLink
                                tab="general"
                                onClick={() => setIsMenuOpen(false)}
                                className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm font-medium text-[#37352f]/80 transition-colors hover:bg-[#efedea] hover:text-[#37352f]"
                            >
                                <Settings className="h-4 w-4 text-[#37352f]/40" />
                                <span>设置</span>
                            </SettingsCenterLink>
                        </div>

                        <div className="h-px bg-gray-100 my-1 mx-1" />

                        {/* 帮助与管理 */}
                        <div className="flex flex-col">
                            {helpEnabled && (
                                <SettingsCenterLink
                                    tab="help"
                                    onClick={() => setIsMenuOpen(false)}
                                    className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm font-medium text-[#37352f]/80 transition-colors hover:bg-[#efedea] hover:text-[#37352f]"
                                >
                                    <span className="flex items-center gap-2.5">
                                        <CircleQuestionMark className="h-4 w-4 text-[#37352f]/40" />
                                        <span>帮助</span>
                                    </span>
                                </SettingsCenterLink>
                            )}

                            {isAdmin && (
                                <SettingsCenterLink
                                    tab="admin-announcements"
                                    onClick={() => setIsMenuOpen(false)}
                                    className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm font-medium text-[#37352f]/80 transition-colors hover:bg-[#efedea] hover:text-[#37352f]"
                                >
                                    <span className="flex items-center gap-2.5">
                                        <LayoutPanelTop className="h-4 w-4 text-[#37352f]/40" />
                                        <span>管理</span>
                                    </span>
                                </SettingsCenterLink>
                            )}
                        </div>

                        <div className="h-px bg-gray-100 my-1 mx-1" />

                        {/* 退出登录 */}
                        <div className="flex flex-col">
                            <button
                                type="button"
                                onClick={handleSignOut}
                                disabled={signingOut}
                                className="group flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm font-medium text-[#37352f]/80 transition-colors hover:bg-[#efedea] hover:text-[#eb5757] disabled:opacity-50"
                            >
                                {signingOut ? (
                                    <SoundWaveLoader variant="inline" />
                                ) : (
                                    <LogOut className="h-4 w-4 text-[#37352f]/40 group-hover:text-[#eb5757] transition-colors" />
                                )}
                                <span>{signingOut ? '退出中...' : '退出登录'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
