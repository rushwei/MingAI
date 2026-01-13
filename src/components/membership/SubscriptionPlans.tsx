/**
 * 订阅套餐展示组件
 * 
 * 展示 Free/Plus/Pro 三个套餐 - 简洁版
 */
'use client';

import { Check, Crown, Sparkles, Zap } from 'lucide-react';
import { pricingPlans, type PricingPlan, type MembershipType } from '@/lib/membership';

interface SubscriptionPlansProps {
    currentPlan: MembershipType;
    onSelectPlan: (plan: PricingPlan) => void;
    isPaymentPaused?: boolean;
}

export function SubscriptionPlans({
    currentPlan,
    onSelectPlan,
    isPaymentPaused = false,
}: SubscriptionPlansProps) {
    const getIcon = (planId: MembershipType) => {
        switch (planId) {
            case 'free': return <Zap className="w-5 h-5" />;
            case 'plus': return <Crown className="w-5 h-5" />;
            case 'pro': return <Sparkles className="w-5 h-5" />;
        }
    };

    const getPlanColor = (planId: MembershipType) => {
        switch (planId) {
            case 'free': return 'gray';
            case 'plus': return 'amber';
            case 'pro': return 'purple';
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {pricingPlans.map((plan) => {
                const color = getPlanColor(plan.id);
                const isCurrent = currentPlan === plan.id;
                const isPaused = isPaymentPaused && plan.id !== 'free';

                return (
                    <div
                        key={plan.id}
                        className={`relative rounded-xl border p-5 pt-7 transition-all ${plan.popular
                                ? 'border-accent bg-accent/5'
                                : 'border-border hover:border-accent/50'
                            } ${isCurrent ? 'ring-2 ring-green-500' : ''}`}
                    >
                        {/* 推荐标签 */}
                        {plan.popular && (
                            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-accent text-white text-xs font-medium">
                                推荐
                            </div>
                        )}

                        {/* 头部 */}
                        <div className="flex items-center gap-2 mb-3">
                            <div className={`p-2 rounded-lg bg-${color}-500/10 text-${color}-500`}>
                                {getIcon(plan.id)}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="font-bold">{plan.name}</h3>
                                    {isPaused && (
                                        <span className="text-[10px] text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full">
                                            暂停服务
                                        </span>
                                    )}
                                </div>
                                {isCurrent && (
                                    <span className="text-xs text-green-500">当前</span>
                                )}
                            </div>
                        </div>

                        {/* 价格 */}
                        <div className="mb-4">
                            <span className="text-3xl font-bold">
                                {plan.price === 0 ? '免费' : `¥${plan.price}`}
                            </span>
                            {plan.price > 0 && (
                                <span className="text-foreground-secondary text-sm">/{plan.period}</span>
                            )}
                        </div>

                        {/* 简化功能列表 - 只显示前3条 */}
                        <ul className="space-y-2 mb-4 text-sm">
                            {plan.features.slice(0, 3).map((feature, index) => (
                                <li key={index} className="flex items-start gap-2">
                                    <Check className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                                    <span className="text-foreground-secondary">{feature}</span>
                                </li>
                            ))}
                            {plan.features.length > 3 && (
                                <li className="text-xs text-foreground-secondary pl-6">
                                    +{plan.features.length - 3} 更多特权
                                </li>
                            )}
                        </ul>

                        {/* 按钮 */}
                        <button
                            onClick={() => !isPaused && onSelectPlan(plan)}
                            disabled={isCurrent || plan.id === 'free' || isPaused}
                            className={`w-full py-2.5 rounded-lg font-medium text-sm transition-all ${plan.id === 'free'
                                ? 'bg-background text-foreground-secondary cursor-not-allowed'
                                : isPaused
                                    ? 'bg-amber-500/10 text-amber-600 cursor-not-allowed'
                                    : isCurrent
                                    ? 'bg-green-500/20 text-green-500 cursor-not-allowed'
                                    : plan.popular
                                        ? 'bg-accent text-white hover:bg-accent/90'
                                        : 'bg-background-secondary hover:bg-accent hover:text-white'
                                }`}
                        >
                            {plan.id === 'free' ? '免费使用' : isPaused ? '暂停服务' : isCurrent ? '已开通' : '立即开通'}
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
