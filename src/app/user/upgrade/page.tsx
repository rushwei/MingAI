/**
 * 升级套餐页面
 * 
 * 包含订阅套餐和按量付费两部分
 * 使用Key激活方式
 */
'use client';

import { useState, useEffect } from 'react';
import {
    Crown,
    Key,
    Sparkles,
    Zap,
    Check
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { supabase } from '@/lib/auth';
import { getMembershipInfo, type MembershipInfo, type PricingPlan } from '@/lib/user/membership';
import { AuthModal } from '@/components/auth/AuthModal';
import { KeyActivationModal } from '@/components/membership/KeyActivationModal';
import { SubscriptionPlans } from '@/components/membership/SubscriptionPlans';
import { CreditProgressBar } from '@/components/membership/CreditProgressBar';
import { useSessionSafe } from '@/components/providers/ClientProviders';
import { FeatureGate } from '@/components/layout/FeatureGate';
import { useFeatureToggles } from '@/lib/hooks/useFeatureToggles';

interface PurchaseLinks {
    plus?: string;
    pro?: string;
    credits?: string;
}

export default function UpgradePage() {
    return (
        <FeatureGate featureId="upgrade">
            <UpgradeContent />
        </FeatureGate>
    );
}

function UpgradeContent() {
    const { user, loading: sessionLoading } = useSessionSafe();
    const { isFeatureEnabled, isLoading: featureToggleLoading } = useFeatureToggles();
    const [membership, setMembership] = useState<MembershipInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [showKeyModal, setShowKeyModal] = useState(false);
    const [purchaseLinks, setPurchaseLinks] = useState<PurchaseLinks>({});
    const [level, setLevel] = useState<{ level: number } | null>(null);
    const [copiedLink, setCopiedLink] = useState<string | null>(null);
    const { showToast } = useToast();
    const checkinFeatureEnabled = !featureToggleLoading && isFeatureEnabled('checkin');
    const effectiveLevel = checkinFeatureEnabled ? level : null;

    const refreshMembership = async (userId: string) => {
        const info = await getMembershipInfo(userId);
        setMembership(info);
        return info;
    };

    const fetchPurchaseLinks = async () => {
        const response = await fetch('/api/purchase-links', {
            credentials: 'include',
        });
        if (!response.ok) {
            return;
        }

        const payload = await response.json() as {
            links?: Array<{ link_type: string; url: string }>;
        };
        if (payload.links) {
            const links: PurchaseLinks = {};
            payload.links.forEach((item) => {
                links[item.link_type as keyof PurchaseLinks] = item.url;
            });
            setPurchaseLinks(links);
        }
    };

    useEffect(() => {
        const init = async () => {
            if (sessionLoading) return;
            if (user) {
                await refreshMembership(user.id);
            } else {
                setMembership(null);
                setLevel(null);
            }
            await fetchPurchaseLinks();
            setLoading(false);
        };
        void init();
    }, [sessionLoading, user]);

    useEffect(() => {
        if (sessionLoading) {
            return;
        }
        if (!user || !checkinFeatureEnabled) {
            return;
        }

        let isActive = true;

        const loadCheckinLevel = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session?.access_token || !isActive) {
                    return;
                }
                const res = await fetch('/api/checkin?action=status', {
                    headers: { Authorization: `Bearer ${session.access_token}` },
                });
                const data = await res.json();
                if (isActive && data.success && data.data?.level?.level) {
                    setLevel({ level: data.data.level.level });
                }
            } catch {
            }
        };

        void loadCheckinLevel();

        return () => {
            isActive = false;
        };
    }, [checkinFeatureEnabled, sessionLoading, user]);

    const handleSelectPlan = (plan: PricingPlan) => {
        if (!user) {
            setShowAuthModal(true);
            return;
        }
        if (plan.id === 'free') return;
        if (membership?.type === plan.id) return;

        setShowKeyModal(true);
    };

    const handleKeySuccess = (info: MembershipInfo | null) => {
        setShowKeyModal(false);
        if (info) {
            setMembership(info);
            return;
        }
        if (user) {
            refreshMembership(user.id);
        }
    };

    const currentPlan = membership?.type || 'free';

    const copyToClipboard = async (url: string, type: string) => {
        try {
            await navigator.clipboard.writeText(url);
            setCopiedLink(type);
            showToast('success', '链接已复制，请前往闲鱼购买');
            setTimeout(() => setCopiedLink(null), 2000);
        } catch {
            showToast('error', '复制失败，请手动复制');
        }
    };

    // 格式化到期时间
    const formatExpiryDate = (date: Date | null) => {
        if (!date) return null;
        return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    if (loading) {
        return (
            <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-4 sm:py-8 sm:pb-8">
                {/* 头部骨架 */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2 sm:mb-8">
                    <div className="hidden md:block space-y-2">
                        <div className="h-7 w-32 rounded bg-foreground/10 animate-pulse" />
                        <div className="h-4 w-48 rounded bg-foreground/5 animate-pulse" />
                    </div>
                    <div className="h-8 w-20 rounded-full bg-foreground/10 animate-pulse" />
                </div>
                {/* 积分进度条骨架 */}
                <div className="mb-2 sm:mb-8">
                    <div className="h-20 rounded-2xl bg-foreground/5 animate-pulse" />
                </div>
                {/* 激活码模块骨架 */}
                <div className="mb-6 sm:mb-8 p-4 sm:p-6 rounded-2xl border border-border bg-background-secondary/50">
                    <div className="flex items-center justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-foreground/10 animate-pulse" />
                            <div className="space-y-1.5">
                                <div className="h-4 w-16 rounded bg-foreground/10 animate-pulse" />
                                <div className="h-3 w-32 rounded bg-foreground/5 animate-pulse" />
                            </div>
                        </div>
                        <div className="h-9 w-20 rounded-lg bg-foreground/10 animate-pulse" />
                    </div>
                </div>
                {/* 订阅套餐骨架 */}
                <div>
                    <div className="hidden sm:block h-6 w-24 rounded bg-foreground/10 animate-pulse mb-4 sm:mb-6" />
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-64 rounded-2xl bg-foreground/5 animate-pulse" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-4 sm:py-8 sm:pb-8">
                {/* 头部 - 包含当前套餐 */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-2 sm:mb-8">
                    <div className="hidden md:block">
                        <h1 className="text-xl sm:text-2xl font-bold">升级会员</h1>
                        <p className="text-sm sm:text-base text-foreground-secondary">解锁全部功能，尽享AI命理服务</p>
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
                                <span className="text-sm text-foreground-secondary whitespace-nowrap">
                                    {formatExpiryDate(membership.expiresAt)}
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* 积分进度条 */}
                {user && membership && (
                    <div className="mb-2 sm:mb-8">
                        <CreditProgressBar
                            credits={membership.aiChatCount}
                            membershipType={membership.type}
                            lastRestoreAt={membership.lastCreditRestoreAt}
                            extraLimit={Math.max(0, (effectiveLevel?.level || 1) - 1)}
                        />
                    </div>
                )}

                {/* 激活码模块 */}
                <div className="mb-6 sm:mb-8 p-4 sm:p-6 rounded-2xl border border-border bg-background-secondary/50">
                    <div className="flex items-center justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-accent/10 text-accent">
                            <Key className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-sm sm:text-base">激活码</h3>
                            <p className="text-xs text-foreground-secondary">输入激活码开通会员或获取积分</p>
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
                {(purchaseLinks.plus || purchaseLinks.pro || purchaseLinks.credits) && (
                    <div className="flex flex-wrap gap-2 pt-3 border-t border-border">
                        <span className="text-xs text-foreground-secondary mr-1 leading-7">点击前往购买：</span>
                        {purchaseLinks.plus && (
                            <button
                                onClick={() => copyToClipboard(purchaseLinks.plus!, 'plus')}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 transition-colors text-xs font-medium"
                            >
                                {copiedLink === 'plus' ? <Check className="w-3.5 h-3.5" /> : <Crown className="w-3.5 h-3.5" />}
                                Plus
                            </button>
                        )}
                        {purchaseLinks.pro && (
                            <button
                                onClick={() => copyToClipboard(purchaseLinks.pro!, 'pro')}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-600 hover:bg-purple-500/20 transition-colors text-xs font-medium"
                            >
                                {copiedLink === 'pro' ? <Check className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                                Pro
                            </button>
                        )}
                        {purchaseLinks.credits && (
                            <button
                                onClick={() => copyToClipboard(purchaseLinks.credits!, 'credits')}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 transition-colors text-xs font-medium"
                            >
                                {copiedLink === 'credits' ? <Check className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5" />}
                                积分
                            </button>
                        )}
                    </div>
                )}
                </div>

                {/* 订阅套餐 */}
                <div>
                    <h2 className="hidden sm:block text-lg sm:text-xl font-bold mb-4 sm:mb-6">订阅套餐</h2>
                    <SubscriptionPlans
                        currentPlan={currentPlan}
                        onSelectPlan={handleSelectPlan}
                    />
                    <p className="text-center text-xs sm:text-sm text-foreground-secondary mt-3 sm:mt-4">
                        点击套餐输入激活码开通
                    </p>
                </div>

                {/* 登录弹窗 */}
                <AuthModal
                    isOpen={showAuthModal}
                    onClose={() => setShowAuthModal(false)}
                />

                {/* Key激活弹窗 */}
                <KeyActivationModal
                    isOpen={showKeyModal}
                    onClose={() => setShowKeyModal(false)}
                    onSuccess={handleKeySuccess}
                    purchaseLinks={purchaseLinks}
                />
            </div>
        </div>
    );
}
