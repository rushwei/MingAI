/**
 * 用户中心页面
 * 
 * 集成真实的认证和会员系统
 */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    User,
    CreditCard,
    Settings,
    ChevronRight,
    LogOut,
    History,
    FileText,
    Loader2,
    LogIn,
    Bell,
    Megaphone,
    Wallet,
    Smile,
    HelpCircle,
    CircleStar,
} from 'lucide-react';
import { AuthModal } from '@/components/auth/AuthModal';
import { supabase } from '@/lib/supabase';
import { getUnreadCount } from '@/lib/notification';
import { signOut, getUserProfile, ensureUserRecord } from '@/lib/auth';
import { usePaymentPause } from '@/lib/usePaymentPause';
import { getMembershipInfo, type MembershipInfo } from '@/lib/membership';
import type { User as SupabaseUser } from '@supabase/supabase-js';

// 菜单项配置
const menuItems = [
    {
        section: '我的服务',
        items: [
            { icon: CircleStar, label: '会员中心', href: '/user/upgrade' },
            { icon: FileText, label: '我的命盘', href: '/user/charts' },
            { icon: Bell, label: '消息通知', href: '/user/notifications', showBadge: true },
            { icon: History, label: '对话历史', href: '/chat' },
            { icon: CreditCard, label: '订单记录', href: '/user/orders' },
        ],
    },
    {
        section: '账户设置',
        items: [
            { icon: Smile, label: '个人资料', href: '/user/profile' },
            { icon: Settings, label: '设置', href: '/user/settings' },
        ],
    },
];

const membershipLabels: Record<string, string> = {
    free: 'Free',
    plus: 'Plus',
    pro: 'Pro',
};

type ProfileSnapshot = {
    nickname: string | null;
    avatar_url: string | null;
    is_admin?: boolean;
};

type MembershipSnapshot = {
    type: MembershipInfo['type'];
    aiChatCount: number;
    expiresAt: string | null;
};

const getProfileCacheKey = (userId: string) => `mingai.profile.${userId}`;
const getMembershipCacheKey = (userId: string) => `mingai.membership.${userId}`;

const readProfileCache = (userId: string): ProfileSnapshot | null => {
    if (typeof window === 'undefined') return null;
    const raw = window.localStorage.getItem(getProfileCacheKey(userId));
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw) as ProfileSnapshot;
        return {
            nickname: parsed.nickname ?? null,
            avatar_url: parsed.avatar_url ?? null,
            is_admin: parsed.is_admin ?? false,
        };
    } catch {
        return null;
    }
};

const writeProfileCache = (userId: string, snapshot: ProfileSnapshot) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(getProfileCacheKey(userId), JSON.stringify(snapshot));
};

const readMembershipCache = (userId: string): MembershipInfo | null => {
    if (typeof window === 'undefined') return null;
    const raw = window.localStorage.getItem(getMembershipCacheKey(userId));
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw) as MembershipSnapshot;
        const expiresAt = parsed.expiresAt ? new Date(parsed.expiresAt) : null;
        return {
            type: parsed.type,
            expiresAt,
            isActive: parsed.type === 'free' || (expiresAt !== null && expiresAt > new Date()),
            aiChatCount: parsed.aiChatCount,
            lastCreditRestoreAt: null,
        };
    } catch {
        return null;
    }
};

const writeMembershipCache = (userId: string, info: MembershipInfo) => {
    if (typeof window === 'undefined') return;
    const snapshot: MembershipSnapshot = {
        type: info.type,
        aiChatCount: info.aiChatCount,
        expiresAt: info.expiresAt ? info.expiresAt.toISOString() : null,
    };
    window.localStorage.setItem(getMembershipCacheKey(userId), JSON.stringify(snapshot));
};

export default function UserPage() {
    const [user, setUser] = useState<SupabaseUser | null>(null);
    const [profile, setProfile] = useState<ProfileSnapshot | null>(null);
    const [membership, setMembership] = useState<MembershipInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);
    const { isPaused: isPaymentPaused } = usePaymentPause();
    const effectiveUnreadCount = user ? unreadCount : 0;

    // 弹窗状态
    const [showAuthModal, setShowAuthModal] = useState(false);

    // 获取用户信息 - 先读取本地 session，再监听后续变更
    useEffect(() => {
        let isMounted = true;
        let lastUserId: string | null = null;

        const loadUserDetails = async (currentUser: SupabaseUser) => {
            if (!isMounted) return;
            try {
                await ensureUserRecord(currentUser);
                const [profileData, membershipData] = await Promise.all([
                    getUserProfile(currentUser.id),
                    getMembershipInfo(currentUser.id),
                ]);
                if (isMounted) {
                    setProfile(profileData);
                    setMembership(membershipData);
                    if (profileData) {
                        writeProfileCache(currentUser.id, profileData);
                    }
                    if (membershipData) {
                        writeMembershipCache(currentUser.id, membershipData);
                    }
                    if (profileData?.nickname
                        && profileData.nickname !== currentUser.user_metadata?.nickname) {
                        supabase.auth.updateUser({ data: { nickname: profileData.nickname } }).catch(() => {
                            // 更新失败不影响页面展示
                        });
                    }
                }
            } catch (error) {
                console.error('Error loading user data:', error);
            }
        };

        const handleSession = (session: { user: SupabaseUser } | null, forceReload = false) => {
            if (!isMounted) return;

            const currentUser = session?.user ?? null;
            setUser(currentUser);
            setLoading(false);

            if (currentUser) {
                if (currentUser.id !== lastUserId || forceReload) {
                    lastUserId = currentUser.id;
                    const cachedProfile = readProfileCache(currentUser.id);
                    const cachedMembership = readMembershipCache(currentUser.id);
                    if (cachedProfile) {
                        setProfile(cachedProfile);
                    }
                    if (cachedMembership) {
                        setMembership(cachedMembership);
                    }
                    loadUserDetails(currentUser);
                }
            } else {
                lastUserId = null;
                setProfile(null);
                setMembership(null);
            }
        };

        supabase.auth.getSession()
            .then(({ data: { session } }) => {
                handleSession(session);
            })
            .catch(() => {
                if (isMounted) {
                    setLoading(false);
                }
            });

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {
                const shouldReload = event === 'USER_UPDATED' || event === 'SIGNED_IN' || event === 'INITIAL_SESSION';
                handleSession(session, shouldReload);
            }
        );

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, []);

    useEffect(() => {
        if (!user) {
            return;
        }

        let isActive = true;
        const fetchCount = async () => {
            const count = await getUnreadCount(user.id);
            if (isActive) {
                setUnreadCount(count);
            }
        };

        fetchCount();

        const channel = supabase
            .channel(`user-center-notifications:${user.id}`)
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
    }, [user]);

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

    // 退出登录状态
    const [signingOut, setSigningOut] = useState(false);

    const handleSignOut = async () => {
        if (signingOut) return; // 防止重复点击

        setSigningOut(true);
        try {
            await signOut();
            // 强制刷新整个页面以确保所有状态重置
            window.location.reload();
        } catch (error) {
            console.error('Sign out error:', error);
            setSigningOut(false);
        }
    };

    // 加载状态
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
        );
    }

    // 未登录状态
    if (!user) {
        return (
            <div className="max-w-2xl mx-auto px-4 py-8 animate-fade-in">
                <div className="text-center py-16">
                    <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-6">
                        <User className="w-10 h-10 text-accent" />
                    </div>
                    <h1 className="text-2xl font-bold mb-2">欢迎来到 MingAI</h1>
                    <p className="text-foreground-secondary mb-8">
                        登录后可保存命盘、享受更多积分
                    </p>
                    <button
                        onClick={() => setShowAuthModal(true)}
                        className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-accent text-white font-medium hover:bg-accent/90 transition-colors"
                    >
                        <LogIn className="w-5 h-5" />
                        登录 / 注册
                    </button>
                </div>



                {/* 版本信息 */}
                <p className="text-center text-xs text-foreground-secondary mt-6">
                    MingAI v1.9.0
                </p>

                <AuthModal
                    isOpen={showAuthModal}
                    onClose={() => setShowAuthModal(false)}
                />
            </div>
        );
    }

    const displayName = profile?.nickname
        || (user.user_metadata?.nickname as string | undefined)
        || '命理爱好者';
    const avatarUrl = profile?.avatar_url
        || (user.user_metadata?.avatar_url as string | undefined)
        || null;
    const isAdmin = profile?.is_admin ?? false;
    const membershipLabel = membership?.type
        ? membershipLabels[membership.type]
        : membershipLabels.free;

    // 格式化到期时间
    const formatExpiryDate = (date: Date | null) => {
        if (!date) return null;
        const now = new Date();
        const diff = date.getTime() - now.getTime();
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

        if (days < 0) return '已过期';
        if (days === 0) return '今日到期';
        if (days <= 7) return `${days}天后到期`;
        return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    const expiryText = membership?.type !== 'free' && membership?.expiresAt
        ? formatExpiryDate(membership.expiresAt)
        : null;

    // 已登录状态
    return (
        <div className="max-w-2xl mx-auto px-4 py-8 animate-fade-in">
            {/* 用户信息卡片 */}
            <div className="bg-background rounded-2xl p-4 mb-6">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-background flex items-center justify-center overflow-hidden border border-border flex-shrink-0">
                        {avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={avatarUrl} alt="用户头像" className="w-full h-full object-cover" />
                        ) : (
                            <User className="w-7 h-7 text-foreground-secondary" />
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-lg font-bold truncate">{displayName}</h1>
                        <p className="text-sm text-foreground-secondary truncate">{user.email}</p>
                        {expiryText && (
                            <p className="text-xs text-foreground-secondary mt-0.5">{expiryText}</p>
                        )}
                    </div>
                    <span className={`px-4 py-1 rounded-xl text-sm font-bold flex-shrink-0 ${membership?.type === 'pro'
                        ? 'bg-purple-500/10 text-purple-500'
                        : membership?.type === 'plus'
                            ? 'bg-amber-500/10 text-amber-500'
                            : 'bg-gray-500/10 text-gray-500'
                        }`}>
                        {membershipLabel}
                    </span>
                </div>

                {/* 升级会员入口 */}
                {membership?.type === 'free' && (
                    isPaymentPaused ? (
                        <div className="w-full mt-4 py-3 rounded-xl bg-amber-500/10 text-amber-600 font-medium transition-colors flex items-center justify-center gap-2 cursor-not-allowed">
                            <span>升级会员，解锁全部功能</span>
                            <span className="text-[10px] bg-amber-500/20 text-amber-700 px-2 py-0.5 rounded-full">
                                暂停服务
                            </span>
                        </div>
                    ) : (
                        <Link
                            href="/user/upgrade"
                            className="w-full mt-4 py-3 rounded-xl bg-accent text-white font-medium hover:bg-accent/90 transition-colors flex items-center justify-center gap-2"
                        >
                            <span>升级会员，解锁全部功能</span>
                        </Link>
                    )
                )}
            </div>



            {/* 菜单列表 */}
            {
                [...menuItems,
                ...(isAdmin
                    ? [{
                        section: '管理',
                        items: [
                            { icon: Megaphone, label: '通知发布', href: '/admin/notifications' },
                            { icon: Wallet, label: '支付服务', href: '/admin/payment' },
                        ],
                    }]
                    : [])
                ].map((section, sectionIndex) => (
                    <div key={sectionIndex} className="mb-6">
                        <h2 className="text-sm font-medium text-foreground-secondary mb-2 px-1">
                            {section.section}
                        </h2>
                        <div className="bg-background-secondary rounded-xl border border-border overflow-hidden">
                            {section.items.map((item, itemIndex) => {
                                const Icon = item.icon;
                                const showUnread = item.href === '/user/notifications' && effectiveUnreadCount > 0;
                                const isSubscription = item.href === '/user/upgrade';
                                const isDisabled = isSubscription && isPaymentPaused;

                                if (isDisabled) {
                                    return (
                                        <div
                                            key={itemIndex}
                                            className="flex items-center justify-between px-4 py-3 border-b border-border last:border-b-0 text-foreground-secondary cursor-not-allowed opacity-60"
                                        >
                                            <div className="flex items-center gap-3">
                                                <Icon className="w-5 h-5 text-foreground-secondary" />
                                                <span>{item.label}</span>
                                            </div>
                                            <span className="text-[10px] text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full">
                                                暂停服务
                                            </span>
                                        </div>
                                    );
                                }

                                return (
                                    <Link
                                        key={itemIndex}
                                        href={item.href}
                                        className="flex items-center justify-between px-4 py-3 hover:bg-background transition-colors border-b border-border last:border-b-0"
                                    >
                                        <div className="flex items-center gap-3">
                                            <Icon className="w-5 h-5 text-foreground-secondary" />
                                            <span>{item.label}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {showUnread && (
                                                <span className="min-w-[18px] h-[18px] px-1 text-[10px] font-bold bg-accent text-white rounded-full flex items-center justify-center">
                                                    {effectiveUnreadCount > 99 ? '99+' : effectiveUnreadCount}
                                                </span>
                                            )}
                                            <ChevronRight className="w-4 h-4 text-foreground-secondary" />
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                ))
            }

            {/* 帮助 */}
            <div className="mb-6">
                <h2 className="text-sm font-medium text-foreground-secondary mb-2 px-1">
                    帮助
                </h2>
                <div className="bg-background-secondary rounded-xl border border-border overflow-hidden">
                    <Link
                        href="/help"
                        className="flex items-center justify-between px-4 py-3 hover:bg-background transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <HelpCircle className="w-5 h-5 text-foreground-secondary" />
                            <span>帮助中心</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-foreground-secondary" />
                    </Link>
                </div>
            </div>

            {/* 退出登录 */}
            <button
                onClick={handleSignOut}
                disabled={signingOut}
                className="w-full py-3 rounded-xl border border-border text-foreground-secondary hover:border-red-500 hover:text-red-500 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {signingOut ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    <LogOut className="w-4 h-4" />
                )}
                {signingOut ? '正在退出...' : '退出登录'}
            </button>

            {/* 版本信息 */}
            <p className="text-center text-xs text-foreground-secondary mt-6">
                MingAI v1.9.0
            </p>

            {/* 弹窗 */}

        </div >
    );
}
