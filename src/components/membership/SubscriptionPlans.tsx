/**
 * 订阅套餐展示组件
 *
 * 展示 Free/Plus/Pro 三个套餐
 * 手机端支持 Tab 切换选择
 */
'use client';

import { useState, useCallback, useMemo } from 'react';
import { Check, ChevronDown, Crown, Sparkles, Zap } from 'lucide-react';
import { pricingPlans, type PricingPlan, type MembershipType } from '@/lib/user/membership';

interface SubscriptionPlansProps {
    currentPlan: MembershipType;
    onSelectPlan: (plan: PricingPlan) => void;
}

export function SubscriptionPlans({
    currentPlan,
    onSelectPlan,
}: SubscriptionPlansProps) {
    // 手机端默认选中推荐的套餐
    const getDefaultTab = (): MembershipType => {
        if (currentPlan === 'free') return 'plus';
        if (currentPlan === 'plus') return 'pro';
        return 'pro';
    };
    const [selectedTab, setSelectedTab] = useState<MembershipType>(getDefaultTab);
    const [expandedPlans, setExpandedPlans] = useState<Set<MembershipType>>(new Set());

    const toggleExpand = useCallback((planId: MembershipType) => {
        setExpandedPlans(prev => {
            const next = new Set(prev);
            if (next.has(planId)) {
                next.delete(planId);
            } else {
                next.add(planId);
            }
            return next;
        });
    }, []);

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

    // 根据当前会员等级确定推荐的套餐
    const recommendedPlan = useMemo((): MembershipType | null => {
        switch (currentPlan) {
            case 'free': return 'plus';
            case 'plus': return 'pro';
            case 'pro': return null; // 已是最高级
        }
    }, [currentPlan]);

    // 渲染单个套餐卡片
    const renderPlanCard = (plan: PricingPlan) => {
        const color = getPlanColor(plan.id);
        const isCurrent = currentPlan === plan.id;
        const isRecommended = plan.id === recommendedPlan;

        return (
            <div
                key={plan.id}
                className={`relative rounded-xl border p-4 transition-all ${
                    isRecommended ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50'
                } ${isCurrent ? 'ring-2 ring-green-500' : ''}`}
            >
                {isRecommended && (
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-accent text-white text-xs font-medium whitespace-nowrap z-10">
                        推荐升级
                    </div>
                )}
                {/* 头部：图标、名称、价格同一排 */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg bg-${color}-500/10 text-${color}-500`}>
                            {getIcon(plan.id)}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-base">{plan.name}</h3>
                                {isCurrent && (
                                    <span className="text-xs text-green-500">当前</span>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-sm font-semibold text-foreground">
                            {plan.id === 'free' ? '常驻' : '月度权益'}
                        </div>
                        <div className="text-foreground-secondary text-xs">{plan.period}</div>
                    </div>
                </div>
                <ul className="space-y-1.5 mb-3 text-sm">
                    {(expandedPlans.has(plan.id) ? plan.features : plan.features.slice(0, 3)).map((feature, index) => (
                        <li key={index} className="flex items-start gap-2">
                            <Check className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                            <span className="text-foreground-secondary leading-tight">{feature}</span>
                        </li>
                    ))}
                    {plan.features.length > 3 && (
                        <li
                            onClick={() => toggleExpand(plan.id)}
                            className="flex items-center gap-1 text-xs text-accent cursor-pointer hover:text-accent/80 pl-6"
                        >
                            <span>{expandedPlans.has(plan.id) ? '收起' : `+${plan.features.length - 3} 项更多功能`}</span>
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expandedPlans.has(plan.id) ? 'rotate-180' : ''}`} />
                        </li>
                    )}
                </ul>
                <button
                    onClick={() => onSelectPlan(plan)}
                    disabled={isCurrent || plan.id === 'free'}
                    className={`w-full py-2.5 rounded-lg font-medium text-sm transition-all ${plan.id === 'free'
                        ? 'bg-background text-foreground-secondary cursor-not-allowed'
                        : isCurrent
                            ? 'bg-green-500/20 text-green-500 cursor-not-allowed'
                            : isRecommended
                                ? 'bg-accent text-white hover:bg-accent/90'
                                : 'bg-background-secondary hover:bg-accent hover:text-white'
                        }`}
                >
                    {plan.id === 'free' ? '免费' : isCurrent ? '已开通' : '查看获取方式'}
                </button>
            </div>
        );
    };

    return (
        <>
            {/* 手机端 Tab 切换 */}
            <div className="sm:hidden">
                {/* Tab 选择器 */}
                <div className="flex bg-background-secondary rounded-xl p-1 mb-4">
                    {pricingPlans.map((plan) => {
                        const isSelected = selectedTab === plan.id;
                        const isCurrentPlan = currentPlan === plan.id;
                        return (
                            <button
                                key={plan.id}
                                onClick={() => setSelectedTab(plan.id)}
                                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                                    isSelected
                                        ? 'bg-background shadow-sm text-foreground'
                                        : 'text-foreground-secondary'
                                }`}
                            >
                                <span className="flex items-center justify-center gap-1.5">
                                    {plan.name}
                                    {isCurrentPlan && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                    )}
                                </span>
                            </button>
                        );
                    })}
                </div>
                {/* 选中的套餐卡片 */}
                <div className="pt-2">
                    {pricingPlans
                        .filter((plan) => plan.id === selectedTab)
                        .map((plan) => renderPlanCard(plan))}
                </div>
            </div>

            {/* 桌面端网格布局 */}
            <div className="hidden sm:grid sm:grid-cols-3 gap-4 max-w-5xl mx-auto pt-4">
                {pricingPlans.map((plan) => renderPlanCard(plan))}
            </div>
        </>
    );
}
