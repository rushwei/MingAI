/**
 * 升级套餐页面
 * 
 * 包含订阅套餐和按量付费两部分
 * 使用Key激活方式
 */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    Crown,
    Loader2,
    ArrowLeft,
    Key
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getMembershipInfo, type MembershipInfo, type PricingPlan } from '@/lib/membership';
import { AuthModal } from '@/components/auth/AuthModal';
import { KeyActivationModal } from '@/components/membership/KeyActivationModal';
import { SubscriptionPlans } from '@/components/membership/SubscriptionPlans';
import { CreditProgressBar } from '@/components/membership/CreditProgressBar';
import { useSessionSafe } from '@/components/providers/ClientProviders';

interface PurchaseLinks {
    plus?: string;
    pro?: string;
    credits?: string;
}

export default function UpgradePage() {
    const { user, loading: sessionLoading } = useSessionSafe();
    const [membership, setMembership] = useState<MembershipInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [showKeyModal, setShowKeyModal] = useState(false);
    const [purchaseLinks, setPurchaseLinks] = useState<PurchaseLinks>({});

    const refreshMembership = async (userId: string) => {
        const info = await getMembershipInfo(userId);
        setMembership(info);
        return info;
    };

    const fetchPurchaseLinks = async () => {
        const { data } = await supabase
            .from('purchase_links')
            .select('link_type, url');
        if (data) {
            const links: PurchaseLinks = {};
            data.forEach((item: { link_type: string; url: string }) => {
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
            }
            await fetchPurchaseLinks();
            setLoading(false);
        };
        void init();
    }, [sessionLoading, user]);

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

            {/* 激活入口 */}
            <div className="mb-8 p-6 rounded-2xl border border-accent/30 bg-accent/5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-accent text-white">
                            <Key className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold">已有激活码？</h3>
                            <p className="text-sm text-foreground-secondary">输入激活码立即开通会员或获取积分</p>
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
                        className="px-6 py-2.5 rounded-xl bg-accent text-white font-medium hover:bg-accent/90 transition-colors"
                    >
                        激活
                    </button>
                </div>
            </div>

            {/* 订阅套餐 */}
            <div className="mb-12">
                <h2 className="text-xl font-bold mb-6">订阅套餐</h2>
                <SubscriptionPlans
                    currentPlan={currentPlan}
                    onSelectPlan={handleSelectPlan}
                />
                <p className="text-center text-sm text-foreground-secondary mt-4">
                    点击套餐输入激活码开通
                </p>
            </div>

            {/* 获取激活码说明 */}
            {(purchaseLinks.plus || purchaseLinks.pro || purchaseLinks.credits) && (
                <div className="mb-8 p-6 rounded-2xl border border-border bg-background">
                    <h3 className="font-bold mb-4">获取激活码</h3>
                    <div className="flex flex-wrap gap-3">
                        {purchaseLinks.plus && (
                            <a
                                href={purchaseLinks.plus}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 transition-colors font-medium"
                            >
                                <Crown className="w-4 h-4" />
                                获取 Plus 会员
                            </a>
                        )}
                        {purchaseLinks.pro && (
                            <a
                                href={purchaseLinks.pro}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500/10 text-purple-600 hover:bg-purple-500/20 transition-colors font-medium"
                            >
                                <Crown className="w-4 h-4" />
                                获取 Pro 会员
                            </a>
                        )}
                        {purchaseLinks.credits && (
                            <a
                                href={purchaseLinks.credits}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 transition-colors font-medium"
                            >
                                <Key className="w-4 h-4" />
                                获取积分
                            </a>
                        )}
                    </div>
                </div>
            )}

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
    );
}
