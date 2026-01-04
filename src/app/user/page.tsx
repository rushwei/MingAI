/**
 * 用户中心页面
 * 
 * 集成真实的认证和会员系统
 */
'use client';

import { useState, useEffect } from 'react';
import {
    User,
    CreditCard,
    Settings,
    ChevronRight,
    LogOut,
    Moon,
    Sun,
    Crown,
    History,
    FileText,
    Loader2,
    LogIn
} from 'lucide-react';
import { useTheme } from '@/components/ui/ThemeProvider';
import { AuthModal } from '@/components/auth/AuthModal';
import { PricingModal } from '@/components/membership/PricingModal';
import { PaymentModal } from '@/components/membership/PaymentModal';
import { supabase } from '@/lib/supabase';
import { signOut, getUserProfile } from '@/lib/auth';
import { getMembershipInfo, type MembershipInfo, type PricingPlan } from '@/lib/membership';
import type { User as SupabaseUser } from '@supabase/supabase-js';

// 菜单项配置
const menuItems = [
    {
        section: '我的服务',
        items: [
            { icon: FileText, label: '我的命盘', href: '/user/charts' },
            { icon: History, label: '对话历史', href: '/chat', badge: 'P2' },
            { icon: CreditCard, label: '订单记录', href: '/user/orders' },
        ],
    },
    {
        section: '账户设置',
        items: [
            { icon: User, label: '个人资料', href: '/user/profile' },
            { icon: Settings, label: '偏好设置', href: '/user/settings' },
        ],
    },
];

const membershipLabels: Record<string, string> = {
    free: '免费用户',
    single: '单次解锁',
    monthly: '月度会员',
    yearly: '年度会员',
};

export default function UserPage() {
    const { theme, toggleTheme } = useTheme();
    const [user, setUser] = useState<SupabaseUser | null>(null);
    const [profile, setProfile] = useState<{
        nickname: string | null;
        avatar_url: string | null;
    } | null>(null);
    const [membership, setMembership] = useState<MembershipInfo | null>(null);
    const [loading, setLoading] = useState(true);

    // 弹窗状态
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [showPricingModal, setShowPricingModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);

    // 获取用户信息 - 优化版本：只使用 onAuthStateChange
    useEffect(() => {
        let isMounted = true;
        let lastUserId: string | null = null;

        // 使用 onAuthStateChange 统一处理（包含 INITIAL_SESSION 事件）
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (!isMounted) return;

                const currentUser = session?.user ?? null;
                setUser(currentUser);

                // 避免重复请求（相同用户ID不重复加载）
                if (currentUser && currentUser.id !== lastUserId) {
                    lastUserId = currentUser.id;
                    setLoading(false); // 先显示页面

                    // 异步加载详细信息
                    try {
                        const [profileData, membershipData] = await Promise.all([
                            getUserProfile(currentUser.id),
                            getMembershipInfo(currentUser.id),
                        ]);
                        if (isMounted) {
                            setProfile(profileData);
                            setMembership(membershipData);
                        }
                    } catch (error) {
                        console.error('Error loading user data:', error);
                    }
                } else if (!currentUser) {
                    lastUserId = null;
                    setProfile(null);
                    setMembership(null);
                    setLoading(false);
                }
            }
        );

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const handleSignOut = async () => {
        await signOut();
        setUser(null);
        setProfile(null);
        setMembership(null);
    };

    const handleSelectPlan = (plan: PricingPlan) => {
        setSelectedPlan(plan);
        setShowPricingModal(false);
        setShowPaymentModal(true);
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
                        登录后可保存命盘、享受更多AI对话次数
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
                    MingAI v1.0.0 · MVP 版本
                </p>

                <AuthModal
                    isOpen={showAuthModal}
                    onClose={() => setShowAuthModal(false)}
                />
            </div>
        );
    }

    // 已登录状态
    return (
        <div className="max-w-2xl mx-auto px-4 py-8 animate-fade-in">
            {/* 用户信息卡片 */}
            <div className="bg-gradient-to-r from-accent/10 via-accent/5 to-transparent rounded-2xl p-6 border border-accent/20 mb-6">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center">
                        <User className="w-8 h-8 text-accent" />
                    </div>
                    <div className="flex-1">
                        <h1 className="text-xl font-bold">{profile?.nickname || '命理爱好者'}</h1>
                        <p className="text-sm text-foreground-secondary mb-1">{user.email}</p>
                        <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/10 text-accent text-xs">
                                <Crown className="w-3 h-3" />
                                {membershipLabels[membership?.type || 'free']}
                            </span>
                            {membership?.type === 'free' && membership.aiChatCount !== undefined && (
                                <span className="text-xs text-foreground-secondary">
                                    剩余 {membership.aiChatCount} 次AI对话
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* 升级会员入口 */}
                {membership?.type === 'free' && (
                    <button
                        onClick={() => setShowPricingModal(true)}
                        className="w-full mt-4 py-3 rounded-xl bg-accent text-white font-medium hover:bg-accent/90 transition-colors"
                    >
                        升级会员，解锁全部功能
                    </button>
                )}
            </div>



            {/* 菜单列表 */}
            {menuItems.map((section, sectionIndex) => (
                <div key={sectionIndex} className="mb-6">
                    <h2 className="text-sm font-medium text-foreground-secondary mb-2 px-1">
                        {section.section}
                    </h2>
                    <div className="bg-background-secondary rounded-xl border border-border overflow-hidden">
                        {section.items.map((item, itemIndex) => {
                            const Icon = item.icon;
                            return (
                                <a
                                    key={itemIndex}
                                    href={item.href}
                                    className="flex items-center justify-between px-4 py-3 hover:bg-background transition-colors border-b border-border last:border-b-0"
                                >
                                    <div className="flex items-center gap-3">
                                        <Icon className="w-5 h-5 text-foreground-secondary" />
                                        <span>{item.label}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {item.badge && (
                                            <span className="w-5 h-5 rounded-full bg-accent text-white text-xs flex items-center justify-center">
                                                {item.badge}
                                            </span>
                                        )}
                                        <ChevronRight className="w-4 h-4 text-foreground-secondary" />
                                    </div>
                                </a>
                            );
                        })}
                    </div>
                </div>
            ))}

            {/* 退出登录 */}
            <button
                onClick={handleSignOut}
                className="w-full py-3 rounded-xl border border-border text-foreground-secondary hover:border-red-500 hover:text-red-500 transition-colors flex items-center justify-center gap-2"
            >
                <LogOut className="w-4 h-4" />
                退出登录
            </button>

            {/* 版本信息 */}
            <p className="text-center text-xs text-foreground-secondary mt-6">
                MingAI v1.0.0 · MVP 版本
            </p>

            {/* 弹窗 */}
            <PricingModal
                isOpen={showPricingModal}
                onClose={() => setShowPricingModal(false)}
                onSelectPlan={handleSelectPlan}
                currentPlan={membership?.type}
            />

            <PaymentModal
                isOpen={showPaymentModal}
                onClose={() => setShowPaymentModal(false)}
                plan={selectedPlan}
                userId={user.id}
                onSuccess={() => {
                    setShowPaymentModal(false);
                }}
            />
        </div>
    );
}
