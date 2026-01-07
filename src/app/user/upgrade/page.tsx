/**
 * 升级套餐页面
 * 
 * 使用与 PricingModal 相同的套餐配置，但作为独立页面展示
 */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    Check,
    Crown,
    Sparkles,
    Loader2,
    ArrowLeft
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getMembershipInfo, pricingPlans, type MembershipInfo, type PricingPlan } from '@/lib/membership';
import { AuthModal } from '@/components/auth/AuthModal';
import { PaymentModal } from '@/components/membership/PaymentModal';
import type { User as SupabaseUser } from '@supabase/supabase-js';

export default function UpgradePage() {
    const router = useRouter();
    const [user, setUser] = useState<SupabaseUser | null>(null);
    const [membership, setMembership] = useState<MembershipInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            if (session?.user) {
                getMembershipInfo(session.user.id).then(setMembership);
            }
            setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
            setUser(session?.user ?? null);
            if (session?.user) {
                getMembershipInfo(session.user.id).then(setMembership);
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
        // 刷新会员信息
        if (user) {
            getMembershipInfo(user.id).then(setMembership);
        }
    };

    const currentPlan = membership?.type || 'free';

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

            {/* 头部 */}
            <div className="flex items-center gap-3 mb-8">
                <div className="p-2 rounded-xl bg-accent/10">
                    <Crown className="w-6 h-6 text-accent" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold">升级会员</h1>
                    <p className="text-foreground-secondary">解锁全部功能，尽享AI命理服务</p>
                </div>
            </div>

            {/* 套餐列表 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {pricingPlans.map((plan) => (
                    <div
                        key={plan.id}
                        className={`relative rounded-2xl border-2 p-6 transition-all ${plan.popular
                            ? 'border-accent bg-accent/5'
                            : 'border-border hover:border-accent/50'
                            } ${currentPlan === plan.id
                                ? 'ring-2 ring-accent ring-offset-2 ring-offset-background'
                                : ''
                            }`}
                    >
                        {/* 推荐标签 */}
                        {plan.popular && (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-accent text-white text-xs font-medium flex items-center gap-1">
                                <Sparkles className="w-3 h-3" />
                                推荐
                            </div>
                        )}

                        {/* 当前套餐标签 */}
                        {currentPlan === plan.id && (
                            <div className="absolute -top-3 right-4 px-3 py-1 rounded-full bg-green-500 text-white text-xs font-medium">
                                当前
                            </div>
                        )}

                        {/* 套餐名称 */}
                        <h3 className="text-lg font-bold mb-2">{plan.name}</h3>

                        {/* 价格 */}
                        <div className="mb-4">
                            <span className="text-3xl font-bold">
                                ¥{plan.price}
                            </span>
                            <span className="text-foreground-secondary text-sm">
                                /{plan.period}
                            </span>
                        </div>

                        {/* 功能列表 */}
                        <ul className="space-y-2 mb-6">
                            {plan.features.map((feature, index) => (
                                <li key={index} className="flex items-start gap-2 text-sm">
                                    <Check className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                                    <span>{feature}</span>
                                </li>
                            ))}
                        </ul>

                        {/* 选择按钮 */}
                        <button
                            onClick={() => handleSelectPlan(plan)}
                            disabled={currentPlan === plan.id || plan.id === 'free'}
                            className={`w-full py-3 rounded-xl font-medium transition-colors ${plan.id === 'free'
                                ? 'bg-background-secondary text-foreground-secondary cursor-not-allowed'
                                : currentPlan === plan.id
                                    ? 'bg-green-500/20 text-green-500 cursor-not-allowed'
                                    : plan.popular
                                        ? 'bg-accent text-white hover:bg-accent/90'
                                        : 'bg-background-secondary hover:bg-accent hover:text-white'
                                }`}
                        >
                            {plan.id === 'free'
                                ? '免费使用'
                                : currentPlan === plan.id
                                    ? '已开通'
                                    : '立即开通'}
                        </button>
                    </div>
                ))}
            </div>

            {/* 提示信息 */}
            <p className="text-center text-sm text-foreground-secondary">
                支付後可随时取消续订 · 7天无理由退款
            </p>

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
