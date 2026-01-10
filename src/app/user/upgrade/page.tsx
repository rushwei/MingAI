/**
 * 升级套餐页面
 * 
 * 包含订阅套餐和按量付费两部分
 */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    Crown,
    Loader2,
    ArrowLeft
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getMembershipInfo, type MembershipInfo, type PricingPlan } from '@/lib/membership';
import { AuthModal } from '@/components/auth/AuthModal';
import { PaymentModal } from '@/components/membership/PaymentModal';
import { SubscriptionPlans } from '@/components/membership/SubscriptionPlans';
import { PayPerUse } from '@/components/membership/PayPerUse';
import { CreditProgressBar } from '@/components/membership/CreditProgressBar';
import type { User as SupabaseUser } from '@supabase/supabase-js';

export default function UpgradePage() {
    const [user, setUser] = useState<SupabaseUser | null>(null);
    const [membership, setMembership] = useState<MembershipInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);

    const refreshMembership = async (userId: string) => {
        const info = await getMembershipInfo(userId);
        setMembership(info);
        return info;
    };

    useEffect(() => {
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setUser(session?.user ?? null);
            if (session?.user) {
                await refreshMembership(session.user.id);
            }
            setLoading(false);
        };
        init();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_, session) => {
            setUser(session?.user ?? null);
            if (session?.user) {
                await refreshMembership(session.user.id);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleSelectPlan = (plan: PricingPlan) => {
        if (!user) {
            setShowAuthModal(true);
            return;
        }
        if (plan.id === 'free') return;
        if (membership?.type === plan.id) return;

        setSelectedPlan(plan);
        setShowPaymentModal(true);
    };

    const handlePaymentSuccess = () => {
        setShowPaymentModal(false);
        setSelectedPlan(null);
        if (user) {
            refreshMembership(user.id);
        }
    };

    const handlePayPerUseSuccess = () => {
        if (user) {
            refreshMembership(user.id);
        }
    };

    const currentPlan = membership?.type || 'free';

    // 格式化到期时间
    const formatExpiryDate = (date: Date | null) => {
        if (!date) return null;
        return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto px-4 py-8">
            {/* 返回按钮 */}
            <Link
                href="/user"
                className="inline-flex items-center gap-2 text-foreground-secondary hover:text-foreground transition-colors mb-6"
            >
                <ArrowLeft className="w-4 h-4" />
                返回用户中心
            </Link>

            {/* 头部 - 包含当前套餐 */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-accent to-accent/80 text-white">
                        <Crown className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">升级会员</h1>
                        <p className="text-foreground-secondary">解锁全部功能，尽享AI命理服务</p>
                    </div>
                </div>
                {user && membership && (
                    <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${membership.type === 'pro'
                            ? 'bg-purple-500/10 text-purple-500'
                            : membership.type === 'plus'
                                ? 'bg-amber-500/10 text-amber-500'
                                : 'bg-gray-500/10 text-gray-500'
                            }`}>
                            {currentPlan.toUpperCase()}
                        </span>
                        {membership.type !== 'free' && membership.expiresAt && (
                            <span className="text-sm text-foreground-secondary">
                                {formatExpiryDate(membership.expiresAt)}
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* 积分进度条 */}
            {user && membership && (
                <div className="mb-8">
                    <CreditProgressBar
                        credits={membership.aiChatCount}
                        membershipType={membership.type}
                        lastRestoreAt={membership.lastCreditRestoreAt}
                    />
                </div>
            )}

            {/* 订阅套餐 */}
            <div className="mb-12">
                <h2 className="text-xl font-bold mb-6">订阅套餐</h2>
                <SubscriptionPlans
                    currentPlan={currentPlan}
                    onSelectPlan={handleSelectPlan}
                />
                <p className="text-center text-sm text-foreground-secondary mt-4">
                    支付后可随时取消续订
                </p>
            </div>

            {/* 分隔线 */}
            <div className="flex items-center gap-4 my-8">
                <div className="flex-1 h-px bg-border" />
                <span className="text-foreground-secondary text-sm">或者</span>
                <div className="flex-1 h-px bg-border" />
            </div>

            {/* 按量付费 */}
            <div className="mb-8">
                <h2 className="text-xl font-bold mb-6">按量付费</h2>
                {user ? (
                    <PayPerUse
                        userId={user.id}
                        currentCredits={membership?.aiChatCount || 0}
                        onSuccess={handlePayPerUseSuccess}
                    />
                ) : (
                    <div className="rounded-2xl border border-border p-8 text-center">
                        <p className="text-foreground-secondary mb-4">登录后即可按量购买积分</p>
                        <button
                            onClick={() => setShowAuthModal(true)}
                            className="px-6 py-2.5 rounded-xl bg-accent text-white font-medium hover:bg-accent/90 transition-colors"
                        >
                            立即登录
                        </button>
                    </div>
                )}
            </div>

            {/* 登录弹窗 */}
            <AuthModal
                isOpen={showAuthModal}
                onClose={() => setShowAuthModal(false)}
            />

            {/* 支付弹窗 */}
            {selectedPlan && user && (
                <PaymentModal
                    isOpen={showPaymentModal}
                    onClose={() => {
                        setShowPaymentModal(false);
                        setSelectedPlan(null);
                    }}
                    plan={selectedPlan}
                    userId={user.id}
                    onSuccess={handlePaymentSuccess}
                />
            )}
        </div>
    );
}
