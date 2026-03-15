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
    Loader2,
    LogIn,
    Bell,
    Megaphone,
    Wallet,
    HelpCircle,
    CircleStar,
    Scroll,
    Trophy,
    Bot,
    BookOpenText,
    MessageCircleHeart,
    CalendarCheck,
    Plug,
} from 'lucide-react';
import { AuthModal } from '@/components/auth/AuthModal';
import { CheckinModal } from '@/components/checkin/CheckinModal';
import { CalendarModal } from '@/components/checkin/CalendarModal';
import { supabase } from '@/lib/supabase';
import { getUnreadCount } from '@/lib/notification';
import { signOut, getUserProfile, ensureUserRecord } from '@/lib/auth';
import { usePaymentPause } from '@/lib/hooks/usePaymentPause';
import { useFeatureToggles } from '@/lib/hooks/useFeatureToggles';
import { buildMembershipInfo, type MembershipInfo } from '@/lib/user/membership';
import { readLocalCache, writeLocalCache } from '@/lib/cache';
import { getUserEmailDisplay } from '@/lib/user-email';
import type { User as SupabaseUser } from '@/lib/supabase';

// 菜单项配置
const menuItems = [
    {
        section: '我的服务',
        items: [
            { icon: CircleStar, label: '订阅', href: '/user/upgrade', featureId: 'upgrade' },
            { icon: Scroll, label: '我的命盘', href: '/user/charts', featureId: 'charts' },
            { icon: Bell, label: '消息', href: '/user/notifications', showBadge: true, featureId: 'notifications' },
            { icon: CreditCard, label: '订单', href: '/user/orders', featureId: 'orders' },
        ],
    },
    {
        section: 'AI 设置',
        items: [
            { icon: MessageCircleHeart, label: '个性化', href: '/user/settings/ai', featureId: 'ai-personalization' },
            { icon: BookOpenText, label: '知识库', href: '/user/knowledge-base', requiresPlus: true, featureId: 'knowledge-base' },
            { icon: Plug, label: 'MCP 服务', href: '/user/mcp', featureId: 'mcp-service' },
        ],
    },
    {
        section: '账户设置',
        items: [
            { icon: Settings, label: '设置', href: '/user/settings' },
        ],
    },
];

const membershipLabels: Record<string, string> = {
    free: 'Free',
    plus: 'Plus',
    pro: 'Pro',
};

const Skeleton = ({ className }: { className: string }) => (
    <div className={`animate-pulse bg-background-secondary ${className}`} />
);

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

type LevelInfo = {
    level: number;
    experience: number;
    totalExperience: number;
    title: string;
};

type CheckinStatus = {
    todayCheckedIn: boolean;
    streakDays: number;
};

// 计算下一级所需经验
function getNextLevelXp(level: number): number {
    const xpTable: Record<number, number> = {
        1: 100, 2: 200, 3: 400, 4: 800, 5: 1600, 6: 3200, 7: 6400, 8: 12800
    };
    return xpTable[level] || 12800;
}

const getProfileCacheKey = (userId: string) => `mingai.profile.${userId}`;
const getMembershipCacheKey = (userId: string) => `mingai.membership.${userId}`;
const getLevelCacheKey = (userId: string) => `mingai.level.${userId}`;

type LevelSnapshot = LevelInfo & { cachedAt: number };

const readProfileCache = (userId: string): ProfileSnapshot | null => {
    const parsed = readLocalCache<ProfileSnapshot>(getProfileCacheKey(userId), 24 * 60 * 60 * 1000);
    if (!parsed) return null;
    return {
        nickname: parsed.nickname ?? null,
        avatar_url: parsed.avatar_url ?? null,
        is_admin: parsed.is_admin ?? false,
    };
};

const writeProfileCache = (userId: string, snapshot: ProfileSnapshot) => {
    writeLocalCache(getProfileCacheKey(userId), snapshot);
};

const readMembershipCache = (userId: string): MembershipInfo | null => {
    const parsed = readLocalCache<MembershipSnapshot>(getMembershipCacheKey(userId), 10 * 60 * 1000);
    if (!parsed) return null;
    const expiresAt = parsed.expiresAt ? new Date(parsed.expiresAt) : null;
    return {
        type: parsed.type,
        expiresAt,
        isActive: parsed.type === 'free' || (expiresAt !== null && expiresAt > new Date()),
        aiChatCount: parsed.aiChatCount,
        lastCreditRestoreAt: null,
    };
};

const toProfileSnapshot = (profile: {
    nickname: string | null;
    avatar_url: string | null;
    is_admin?: boolean | null;
} | null): ProfileSnapshot | null => {
    if (!profile) return null;
    return {
        nickname: profile.nickname ?? null,
        avatar_url: profile.avatar_url ?? null,
        is_admin: profile.is_admin ?? false,
    };
};

const writeMembershipCache = (userId: string, info: MembershipInfo) => {
    const snapshot: MembershipSnapshot = {
        type: info.type,
        aiChatCount: info.aiChatCount,
        expiresAt: info.expiresAt ? info.expiresAt.toISOString() : null,
    };
    writeLocalCache(getMembershipCacheKey(userId), snapshot);
};

const readLevelCache = (userId: string): LevelInfo | null => {
    const parsed = readLocalCache<LevelSnapshot>(getLevelCacheKey(userId), 10 * 60 * 1000);
    if (!parsed) return null;
    return {
        level: parsed.level,
        experience: parsed.experience,
        totalExperience: parsed.totalExperience,
        title: parsed.title,
    };
};

const writeLevelCache = (userId: string, info: LevelInfo) => {
    const snapshot: LevelSnapshot = { ...info, cachedAt: Date.now() };
    writeLocalCache(getLevelCacheKey(userId), snapshot);
};

const getPerfEnabled = () => {
    if (typeof window === 'undefined') return false;
    try {
        const params = new URLSearchParams(window.location.search);
        if (params.get('perf') === '1') return true;
    } catch {
        return window.localStorage.getItem('mingai.debug.perf') === '1';
    }
    return window.localStorage.getItem('mingai.debug.perf') === '1';
};

const perfNow = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

const logPerf = (label: string, start: number, data?: Record<string, unknown>) => {
    if (!getPerfEnabled()) return;
    const duration = Math.round(perfNow() - start);
    if (data) {
        console.info(`[perf:user] ${label} ${duration}ms`, data);
        return;
    }
    console.info(`[perf:user] ${label} ${duration}ms`);
};

export default function UserPage() {
    const [user, setUser] = useState<SupabaseUser | null>(null);
    const [profile, setProfile] = useState<ProfileSnapshot | null>(null);
    const [membership, setMembership] = useState<MembershipInfo | null>(null);
    const [level, setLevel] = useState<LevelInfo | null>(null);
    const [checkinStatus, setCheckinStatus] = useState<CheckinStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);
    const { isPaused: isPaymentPaused } = usePaymentPause();
    const { isFeatureEnabled } = useFeatureToggles();
    const effectiveUnreadCount = user ? unreadCount : 0;

    // 弹窗状态
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [showCheckinModal, setShowCheckinModal] = useState(false);
    const [showCalendarModal, setShowCalendarModal] = useState(false);

    // 获取用户信息 - 先读取本地 session，再监听后续变更
    useEffect(() => {
        let isMounted = true;
        let lastUserId: string | null = null;
        let hasResolvedSession = false;
        let hasUserSet = false;
        let lastDetailsLoadUserId: string | null = null;
        let lastDetailsLoadAt = 0;

        const loadUserDetails = async (currentUser: SupabaseUser, accessToken?: string) => {
            if (!isMounted) return;
            try {
                const totalStart = perfNow();
                const ensureStart = perfNow();
                const ensurePromise = ensureUserRecord(currentUser);
                const profileStart = perfNow();
                const profileData = await getUserProfile(currentUser.id);
                logPerf('profile:first', profileStart, { hasProfile: !!profileData });
                await ensurePromise;
                logPerf('ensure', ensureStart);
                const resolvedProfile = profileData || await getUserProfile(currentUser.id);
                if (!profileData) {
                    logPerf('profile:retry', profileStart, { hasProfile: !!resolvedProfile });
                }
                const profileSnapshot = toProfileSnapshot(resolvedProfile);
                const membershipData = buildMembershipInfo(resolvedProfile);
                if (isMounted) {
                    setProfile(profileSnapshot);
                    setMembership(membershipData);
                    if (profileSnapshot) {
                        writeProfileCache(currentUser.id, profileSnapshot);
                    }
                    if (membershipData) {
                        writeMembershipCache(currentUser.id, membershipData);
                    }
                    if (profileSnapshot?.nickname
                        && profileSnapshot.nickname !== currentUser.user_metadata?.nickname) {
                        supabase.auth.updateUser({ data: { nickname: profileSnapshot.nickname } }).catch(() => {
                            // 更新失败不影响页面展示
                        });
                    }
                }

                // 获取用户等级信息
                try {
                    const levelStart = perfNow();
                    const token = accessToken
                        || (await supabase.auth.getSession()).data.session?.access_token;
                    if (token && isMounted) {
                        const levelUrl = getPerfEnabled()
                            ? '/api/checkin?action=status&perf=1'
                            : '/api/checkin?action=status';
                        const levelRes = await fetch(levelUrl, {
                            headers: { Authorization: `Bearer ${token}` },
                        });
                        const levelData = await levelRes.json();
                        if (levelData.success && isMounted) {
                            const resolvedLevel = levelData.data?.level || {
                                level: 1,
                                experience: 0,
                                totalExperience: 0,
                                title: '初学者',
                            };
                            setLevel(resolvedLevel);
                            writeLevelCache(currentUser.id, resolvedLevel);
                            // 保存签到状态
                            if (levelData.data?.status) {
                                setCheckinStatus({
                                    todayCheckedIn: levelData.data.status.todayCheckedIn,
                                    streakDays: levelData.data.status.streakDays,
                                });
                            }
                        }
                    }
                    logPerf('level', levelStart);
                } catch (levelError) {
                    console.error('Error loading level:', levelError);
                    // 出错时也设置默认等级
                    if (isMounted) {
                        setLevel({
                            level: 1,
                            experience: 0,
                            totalExperience: 0,
                            title: '初学者',
                        });
                    }
                }
                logPerf('total', totalStart);
            } catch (error) {
                console.error('Error loading user data:', error);
            }
        };

        const handleSession = (
            session: { user: SupabaseUser; access_token?: string | null } | null,
            forceReload = false
        ) => {
            if (!isMounted) return;

            const currentUser = session?.user ?? null;
            const currentUserId = currentUser?.id ?? null;
            if (currentUserId === lastUserId && !forceReload) {
                if (currentUser && !hasUserSet) {
                    setUser(currentUser);
                    hasUserSet = true;
                }
                setLoading(false);
                return;
            }
            setUser(currentUser);
            hasUserSet = true;
            setLoading(false);

            if (currentUser) {
                if (currentUser.id !== lastUserId || forceReload) {
                    lastUserId = currentUser.id;
                    const cachedProfile = readProfileCache(currentUser.id);
                    const cachedMembership = readMembershipCache(currentUser.id);
                    const cachedLevel = readLevelCache(currentUser.id);
                    if (cachedProfile) {
                        setProfile(cachedProfile);
                    }
                    if (cachedMembership) {
                        setMembership(cachedMembership);
                    }
                    if (cachedLevel) {
                        setLevel(cachedLevel);
                    }
                    const now = perfNow();
                    if (currentUser.id !== lastDetailsLoadUserId || now - lastDetailsLoadAt > 1500) {
                        lastDetailsLoadUserId = currentUser.id;
                        lastDetailsLoadAt = now;
                        loadUserDetails(currentUser, session?.access_token ?? undefined);
                    }
                }
            } else {
                lastUserId = null;
                setProfile(null);
                setMembership(null);
            }
        };

        const resolveSession = async () => {
            const resolveStart = perfNow();
            for (let attempt = 0; attempt < 3; attempt += 1) {
                const attemptStart = perfNow();
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    logPerf(`session:attempt:${attempt + 1}`, attemptStart, { hasSession: true });
                    logPerf('session:resolve', resolveStart);
                    return session;
                }
                logPerf(`session:attempt:${attempt + 1}`, attemptStart, { hasSession: false });
                await new Promise(resolve => setTimeout(resolve, 200));
            }
            logPerf('session:resolve', resolveStart, { hasSession: false });
            return null;
        };

        resolveSession()
            .then((session) => {
                hasResolvedSession = true;
                handleSession(session);
            })
            .catch(() => {
                if (isMounted) {
                    setLoading(false);
                }
            });

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {
                if (event === 'INITIAL_SESSION' && hasResolvedSession) {
                    return;
                }
                const shouldReload = event === 'USER_UPDATED' || event === 'SIGNED_IN' || event === 'INITIAL_SESSION';
                handleSession(session, shouldReload);
            }
        );

        const handleUserDataInvalidate = () => {
            void resolveSession().then((session) => {
                handleSession(session, true);
            });
        };
        window.addEventListener('mingai:user-data:invalidate', handleUserDataInvalidate);

        return () => {
            isMounted = false;
            subscription.unsubscribe();
            window.removeEventListener('mingai:user-data:invalidate', handleUserDataInvalidate);
        };
    }, []);

    useEffect(() => {
        if (!user) {
            return;
        }

        let isActive = true;
        const fetchCount = async (options?: { bypassCache?: boolean }) => {
            const countStart = perfNow();
            const count = await getUnreadCount(user.id, options);
            if (isActive) {
                setUnreadCount(count);
            }
            logPerf('notifications:unread', countStart, { count });
        };

        fetchCount();

        const timer = window.setInterval(() => {
            void fetchCount({ bypassCache: true });
        }, 30_000);

        const handleDbWrite = (event: Event) => {
            const detail = (event as CustomEvent<{ table?: string }>).detail;
            if (detail?.table === 'notifications') {
                void fetchCount({ bypassCache: true });
            }
        };
        window.addEventListener('mingai:supabase-write', handleDbWrite);

        return () => {
            isActive = false;
            window.clearInterval(timer);
            window.removeEventListener('mingai:supabase-write', handleDbWrite);
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

    // 未登录状态
    if (!user && !loading) {
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

                <AuthModal
                    isOpen={showAuthModal}
                    onClose={() => setShowAuthModal(false)}
                />
            </div>
        );
    }

    if (!user && loading) {
        return (
            <div className="max-w-2xl mx-auto px-4 py-8 animate-fade-in">
                <div className="text-center py-16">
                    <Skeleton className="w-20 h-20 rounded-full mx-auto mb-6" />
                    <Skeleton className="h-6 w-40 rounded-lg mx-auto mb-3" />
                    <Skeleton className="h-4 w-56 rounded-md mx-auto mb-8" />
                    <Skeleton className="h-11 w-40 rounded-xl mx-auto" />
                </div>
                <Skeleton className="h-3 w-24 rounded-md mx-auto mt-6" />
            </div>
        );
    }

    const isProfileLoading = loading && !profile;
    const isMembershipLoading = loading && !membership;
    const isLevelLoading = loading && !level;
    const displayName = profile?.nickname
        || (user?.user_metadata?.nickname as string | undefined)
        || '命理爱好者';
    const avatarUrl = profile?.avatar_url
        || (user?.user_metadata?.avatar_url as string | undefined)
        || null;
    const userEmail = getUserEmailDisplay(user);
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
        <div className="max-w-2xl mx-auto px-4 py-2 md:py-8 animate-fade-in">
            {/* 用户信息卡片 */}
            <div className="bg-background rounded-2xl p-4 mb-2 md:mb-6">
                <Link
                    href="/user/profile"
                    className="flex items-center gap-4 hover:bg-background-secondary/50 transition-colors rounded-xl p-2 -m-2"
                >
                    <div className="w-14 h-14 rounded-full bg-background flex items-center justify-center overflow-hidden border border-border flex-shrink-0">
                        {isProfileLoading ? (
                            <Skeleton className="w-full h-full rounded-full" />
                        ) : avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={avatarUrl} alt="用户头像" className="w-full h-full object-cover" />
                        ) : (
                            <User className="w-7 h-7 text-foreground-secondary" />
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        {isProfileLoading ? (
                            <>
                                <Skeleton className="h-5 w-28 rounded-md" />
                                <Skeleton className="h-4 w-40 rounded-md mt-2" />
                            </>
                        ) : (
                            <>
                                <h1 className="text-lg font-bold truncate">{displayName}</h1>
                                <p className="text-sm text-foreground-secondary truncate">{userEmail}</p>
                            </>
                        )}
                        {!isMembershipLoading && expiryText && (
                            <p className="text-xs text-foreground-secondary mt-0.5">{expiryText}</p>
                        )}
                        {isMembershipLoading && (
                            <Skeleton className="h-3 w-24 rounded-md mt-2" />
                        )}
                    </div>
                    {isMembershipLoading ? (
                        <Skeleton className="h-7 w-16 rounded-xl flex-shrink-0" />
                    ) : (
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                window.location.href = '/user/upgrade';
                            }}
                            className={`px-4 py-1 rounded-xl text-sm font-bold flex-shrink-0 hover:opacity-80 transition-opacity cursor-pointer ${membership?.type === 'pro'
                                ? 'bg-purple-500/10 text-purple-500'
                                : membership?.type === 'plus'
                                    ? 'bg-amber-500/10 text-amber-500'
                                    : 'bg-gray-500/10 text-gray-500'
                                }`}>
                            {membershipLabel}
                        </button>
                    )}
                </Link>

                {/* 经验进度条（签到功能关闭时隐藏） */}
                {isFeatureEnabled('checkin') && level && (
                    <div className="mt-4 pt-4 border-t border-border">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <Trophy className="w-4 h-4 text-amber-500" />
                                <span className="text-sm font-medium">Lv.{level.level} {level.title}</span>
                                <button
                                    onClick={() => checkinStatus?.todayCheckedIn ? setShowCalendarModal(true) : setShowCheckinModal(true)}
                                    className={`px-2 py-0.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1 ${checkinStatus?.todayCheckedIn
                                            ? 'bg-green-500/10 text-green-600 border border-green-500/20'
                                            : 'bg-amber-500/10 text-amber-600 border border-amber-500/20 hover:bg-amber-500/20'
                                        }`}
                                >
                                    <CalendarCheck className="w-3 h-3" />
                                    {checkinStatus?.todayCheckedIn ? '已签到' : '签到'}
                                </button>
                            </div>
                            <span className="text-xs text-foreground-secondary">
                                {level.experience} / {getNextLevelXp(level.level)} XP
                            </span>
                        </div>
                        <div className="h-2 bg-background-secondary rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-500"
                                style={{ width: `${Math.min(level.experience / getNextLevelXp(level.level) * 100, 100)}%` }}
                            />
                        </div>
                    </div>
                )}
                {isFeatureEnabled('checkin') && !level && isLevelLoading && (
                    <div className="mt-4 pt-4 border-t border-border">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <Skeleton className="h-4 w-24 rounded-md" />
                                <Skeleton className="h-5 w-12 rounded-md" />
                            </div>
                            <Skeleton className="h-3 w-20 rounded-md" />
                        </div>
                        <Skeleton className="h-2 w-full rounded-full" />
                    </div>
                )}

                {/* 升级会员入口 */}
                {isMembershipLoading && (
                    <Skeleton className="h-11 w-full rounded-xl mt-4" />
                )}
                {!isMembershipLoading && membership?.type === 'free' && !isPaymentPaused && (
                    <Link
                        href="/user/upgrade"
                        className="w-full mt-4 py-3 rounded-xl bg-accent text-white font-medium hover:bg-accent/90 transition-colors flex items-center justify-center gap-2"
                    >
                        <span>升级会员，解锁全部功能</span>
                    </Link>
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
                            { icon: Wallet, label: '功能与支付管理', href: '/admin/features' },
                            { icon: Bot, label: 'AI 服务', href: '/admin/ai-services' },
                            { icon: Plug, label: 'MCP 管理', href: '/admin/mcp' },
                        ],
                    }]
                    : [])
                ].map((section, sectionIndex) => (
                    <div key={sectionIndex} className="mb-6">
                        <h2 className="text-sm font-medium text-foreground-secondary mb-2 px-1">
                            {section.section}
                        </h2>
                        <div className="bg-background rounded-xl border border-border overflow-hidden">
                            {section.items.map((item, itemIndex) => {
                                const featureId = 'featureId' in item ? (item as { featureId?: string }).featureId : undefined;
                                if (featureId && !isFeatureEnabled(featureId)) {
                                    return null;
                                }
                                const Icon = item.icon;
                                const showUnread = item.href === '/user/notifications' && effectiveUnreadCount > 0;
                                const isSubscription = item.href === '/user/upgrade';
                                const isDisabledByPayment = isSubscription && isPaymentPaused;
                                const requiresPlus = 'requiresPlus' in item && item.requiresPlus;
                                const isDisabledByMembership = requiresPlus && membership?.type === 'free';

                                if (isDisabledByPayment) {
                                    return null;
                                }

                                if (isDisabledByMembership) {
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
                                                Plus+
                                            </span>
                                        </div>
                                    );
                                }

                                return (
                                    <Link
                                        key={itemIndex}
                                        href={item.href!}
                                        className="flex items-center justify-between px-4 py-3 hover:bg-background-secondary transition-colors border-b border-border last:border-b-0"
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
            {isFeatureEnabled('help') && (
            <div className="mb-6">
                <h2 className="text-sm font-medium text-foreground-secondary mb-2 px-1">
                    帮助
                </h2>
                <div className="bg-background rounded-xl border border-border overflow-hidden">
                    <Link
                        href="/help"
                        className="flex items-center justify-between px-4 py-3 hover:bg-background-secondary transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <HelpCircle className="w-5 h-5 text-foreground-secondary" />
                            <span>帮助中心</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-foreground-secondary" />
                    </Link>
                </div>
            </div>
            )}

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

            {/* 弹窗 */}
            <CheckinModal
                isOpen={showCheckinModal}
                onClose={() => setShowCheckinModal(false)}
                onCheckinSuccess={() => setCheckinStatus(prev => prev ? { ...prev, todayCheckedIn: true } : { todayCheckedIn: true, streakDays: 1 })}
            />

            <CalendarModal
                isOpen={showCalendarModal}
                onClose={() => setShowCalendarModal(false)}
            />

        </div >
    );
}
