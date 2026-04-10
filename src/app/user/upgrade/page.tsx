/**
 * 会员中心页面
 */
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
    Key,
    ShieldCheck,
    RefreshCw,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { getMembershipInfo, type MembershipInfo, type PricingPlan } from '@/lib/user/membership';
import { AuthModal } from '@/components/auth/AuthModal';
import { KeyActivationModal } from '@/components/membership/KeyActivationModal';
import { SubscriptionPlans } from '@/components/membership/SubscriptionPlans';
import { CreditProgressBar } from '@/components/membership/CreditProgressBar';
import { useSessionSafe } from '@/components/providers/ClientProviders';
import { FeatureGate } from '@/components/layout/FeatureGate';

type ClaimStatus =
    | 'ok'
    | 'cooldown'
    | 'lower_tier_ignored'
    | 'no_eligibility'
    | 'claim_failed'
    | 'missing_linuxdo';

export default function UpgradePage() {
    return (
        <FeatureGate featureId="upgrade">
            <UpgradeContent />
        </FeatureGate>
    );
}

function UpgradeContent() {
    const { user, loading: sessionLoading } = useSessionSafe();
    const searchParams = useSearchParams();
    const [membership, setMembership] = useState<MembershipInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [showKeyModal, setShowKeyModal] = useState(false);
    const { showToast } = useToast();

    const refreshMembership = useCallback(async (userId: string) => {
        const info = await getMembershipInfo(userId);
        setMembership(info);
        return info;
    }, []);

    useEffect(() => {
        const init = async () => {
            if (sessionLoading) return;
            if (user) {
                await refreshMembership(user.id);
            } else {
                setMembership(null);
            }
            setLoading(false);
        };
        void init();
    }, [refreshMembership, sessionLoading, user]);

    useEffect(() => {
        const claim = searchParams.get('claim') as ClaimStatus | null;
        if (!claim) return;

        const nextUrl = new URL(window.location.href);
        nextUrl.searchParams.delete('claim');
        nextUrl.searchParams.delete('next_available_at');
        window.history.replaceState({}, '', nextUrl.toString());

        if (claim === 'ok') {
            showToast('success', 'Linux.do 月度会员已领取');
            return;
        }

        if (claim === 'cooldown') {
            const nextAvailableAt = searchParams.get('next_available_at');
            const formatted = nextAvailableAt
                ? new Date(nextAvailableAt).toLocaleString('zh-CN', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                })
                : null;
            showToast('info', formatted ? `本月已领取，请在 ${formatted} 后再试` : '本月已领取，请下次再来');
            return;
        }

        if (claim === 'lower_tier_ignored') {
            showToast('info', '当前已有更高等级会员，本次 Linux.do 月领未覆盖');
            return;
        }

        if (claim === 'no_eligibility') {
            showToast('info', '当前 Linux.do 等级不足，无法领取本月会员');
            return;
        }

        if (claim === 'missing_linuxdo') {
            showToast('error', '请使用 Linux.do 账号重新登录后再领取');
            return;
        }

        showToast('error', '领取会员失败，请稍后重试');
    }, [refreshMembership, searchParams, showToast, user]);

    const handleSelectPlan = (plan: PricingPlan) => {
        if (plan.id === 'free') return;
        if (!user) {
            setShowAuthModal(true);
            return;
        }
        setShowKeyModal(true);
    };

    const handleKeySuccess = (info: MembershipInfo | null) => {
        setShowKeyModal(false);
        if (info) {
            setMembership(info);
            return;
        }
        if (user) {
            void refreshMembership(user.id);
        }
    };

    const currentPlan = membership?.type || 'free';
    const canShowMembership = !!user && !!membership;

    const linuxdoClaimUrl = useMemo(() => {
        const params = new URLSearchParams({
            intent: 'membership-claim',
            returnTo: '/user/upgrade',
        });
        return `/api/auth/linuxdo?${params.toString()}`;
    }, []);

    const formatExpiryDate = (date: Date | null) => {
        if (!date) return null;
        return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    if (loading) {
        return (
            <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-4 sm:py-8 sm:pb-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2 sm:mb-8">
                    <div className="hidden md:block space-y-2">
                        <div className="h-7 w-32 rounded bg-foreground/10 animate-pulse" />
                        <div className="h-4 w-48 rounded bg-foreground/5 animate-pulse" />
                    </div>
                    <div className="h-8 w-20 rounded-full bg-foreground/10 animate-pulse" />
                </div>
                <div className="mb-2 sm:mb-8">
                    <div className="h-20 rounded-2xl bg-foreground/5 animate-pulse" />
                </div>
                <div className="mb-6 sm:mb-8 h-40 rounded-2xl bg-foreground/5 animate-pulse" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[1, 2, 3].map((item) => (
                        <div key={item} className="h-64 rounded-2xl bg-foreground/5 animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-4 sm:py-8 sm:pb-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2 sm:mb-8">
                    <div className="hidden md:block">
                        <h1 className="text-xl sm:text-2xl font-bold">会员中心</h1>
                        <p className="text-sm sm:text-base text-foreground-secondary">
                            管理会员权益、积分余额和 Linux.do 月度领取资格
                        </p>
                    </div>
                    {canShowMembership && (
                        <div className="flex items-center gap-3">
                            <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                                membership.type === 'pro'
                                    ? 'bg-purple-500/10 text-purple-500'
                                    : membership.type === 'plus'
                                        ? 'bg-amber-500/10 text-amber-500'
                                        : 'bg-gray-500/10 text-gray-500'
                            }`}>
                                {currentPlan.toUpperCase()}
                            </span>
                            {membership.type !== 'free' && membership.expiresAt && (
                                <span className="text-sm text-foreground-secondary whitespace-nowrap">
                                    到期：{formatExpiryDate(membership.expiresAt)}
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {canShowMembership && (
                    <div className="mb-2 sm:mb-8">
                        <CreditProgressBar
                            credits={membership.aiChatCount}
                            membershipType={membership.type}
                        />
                    </div>
                )}

                <div className="mb-6 sm:mb-8 grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-4">
                    <div className="p-5 sm:p-6 rounded-2xl border border-border bg-background-secondary/50">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
                                <ShieldCheck className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm sm:text-base">Linux.do 月度会员</h3>
                                <p className="text-xs text-foreground-secondary">
                                    每次领取前都会强制重新登录 Linux.do，以最新等级为准
                                </p>
                            </div>
                        </div>

                        <ul className="text-sm text-foreground-secondary space-y-2 mb-5">
                            <li>• Linux.do `trust_level = 2` 可领取 30 天 Plus</li>
                            <li>• Linux.do `trust_level &gt;= 3` 可领取 30 天 Pro</li>
                            <li>• 30 天内仅可领取 1 次；同档顺延 30 天，低档不会覆盖高档</li>
                            <li>• 领取会员不会额外补积分，激活码会员仍可继续使用</li>
                        </ul>

                        <a
                            href={linuxdoClaimUrl}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-accent text-white font-medium hover:bg-accent/90 transition-colors text-sm"
                        >
                            <RefreshCw className="w-4 h-4" />
                            重新登录 Linux.do 并领取本月会员
                        </a>
                    </div>

                    <div className="p-5 sm:p-6 rounded-2xl border border-border bg-background-secondary/50">
                        <div className="flex items-center justify-between gap-3 mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-accent/10 text-accent">
                                    <Key className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm sm:text-base">激活码</h3>
                                    <p className="text-xs text-foreground-secondary">
                                        可用于开通会员或增加积分
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    if (!user) {
                                        setShowAuthModal(true);
                                        return;
                                    }
                                    setShowKeyModal(true);
                                }}
                                className="px-4 py-2 rounded-lg bg-accent text-white font-medium hover:bg-accent/90 transition-colors text-sm"
                            >
                                立即激活
                            </button>
                        </div>
                        <div className="text-sm text-foreground-secondary space-y-2">
                            <p>• 会员激活码支持 Plus / Pro，和 Linux.do 月领共用同一套会员规则</p>
                            <p>• 积分激活码会直接增加余额，并写入积分流水</p>
                        </div>
                    </div>
                </div>

                <div>
                    <h2 className="hidden sm:block text-lg sm:text-xl font-bold mb-4 sm:mb-6">会员档位</h2>
                    <SubscriptionPlans
                        currentPlan={currentPlan}
                        onSelectPlan={handleSelectPlan}
                    />
                    <p className="text-center text-xs sm:text-sm text-foreground-secondary mt-3 sm:mt-4">
                        套餐卡片仅展示权益说明；会员通过 Linux.do 月领或激活码开通
                    </p>
                </div>

                <AuthModal
                    isOpen={showAuthModal}
                    onClose={() => setShowAuthModal(false)}
                />

                <KeyActivationModal
                    isOpen={showKeyModal}
                    onClose={() => setShowKeyModal(false)}
                    onSuccess={handleKeySuccess}
                />
            </div>
        </div>
    );
}
