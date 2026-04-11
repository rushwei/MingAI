/**
 * 订阅套餐展示组件
 *
 * 使用简洁的文档块布局展示 Free/Plus/Pro 三个套餐。
 */
'use client';

import { useState } from 'react';
import { Check, ChevronDown, Crown, Sparkles, Zap } from 'lucide-react';
import { pricingPlans, type PricingPlan, type MembershipType } from '@/lib/user/membership';

interface SubscriptionPlansProps {
    currentPlan: MembershipType;
    onSelectPlan: (plan: PricingPlan) => void;
}

const PLAN_COPY: Record<MembershipType, { summary: string; action: string }> = {
    free: {
        summary: '适合偶尔查看命盘与基础 AI 体验。',
        action: '免费使用',
    },
    plus: {
        summary: '适合稳定使用签到、知识库与更多 AI 能力。',
        action: '查看获取方式',
    },
    pro: {
        summary: '适合重度使用与更高积分上限需求。',
        action: '查看获取方式',
    },
};

function PlanIcon({ planId }: { planId: MembershipType }) {
    if (planId === 'pro') {
        return <Sparkles className="h-4 w-4" />;
    }
    if (planId === 'plus') {
        return <Crown className="h-4 w-4" />;
    }
    return <Zap className="h-4 w-4" />;
}

export function SubscriptionPlans({
    currentPlan,
    onSelectPlan,
}: SubscriptionPlansProps) {
    const [expandedPlans, setExpandedPlans] = useState<Set<MembershipType>>(new Set([currentPlan]));

    const toggleExpand = (planId: MembershipType) => {
        setExpandedPlans((prev) => {
            const next = new Set(prev);
            if (next.has(planId)) {
                next.delete(planId);
            } else {
                next.add(planId);
            }
            return next;
        });
    };

    return (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            {pricingPlans.map((plan, index) => {
                const isCurrent = currentPlan === plan.id;
                const isExpanded = expandedPlans.has(plan.id);

                return (
                    <section
                        key={plan.id}
                        className={`group relative transition-colors duration-150 hover:bg-[#efedea] ${
                            index > 0 ? 'border-t border-gray-200' : ''
                        }`}
                    >
                        <div className="pointer-events-none absolute left-3 top-4 text-xs tracking-[0.2em] text-[#37352f]/0 transition-opacity duration-150 group-hover:text-[#37352f]/30">
                            ⋮⋮
                        </div>

                        <div className="px-8 py-4 sm:px-10">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0 space-y-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#f7f6f3] text-[#37352f]/65">
                                            <PlanIcon planId={plan.id} />
                                        </span>
                                        <h3 className="text-base font-semibold text-[#37352f]">{plan.name}</h3>
                                    </div>

                                    <p className="text-sm text-[#37352f]/65">{PLAN_COPY[plan.id].summary}</p>
                                </div>

                                <div className="flex flex-col items-start gap-2 sm:items-end">
                                    <button
                                        type="button"
                                        onClick={() => onSelectPlan(plan)}
                                        disabled={isCurrent || plan.id === 'free'}
                                        className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors duration-150 ${
                                            plan.id === 'free'
                                                ? 'cursor-not-allowed border-gray-200 bg-[#f7f6f3] text-[#37352f]/45'
                                                : isCurrent
                                                    ? 'cursor-not-allowed border-[#d8e6df] bg-[#f2f8f5] text-[#0f7b6c]'
                                                    : 'border-gray-200 bg-transparent text-[#37352f] hover:bg-[#efedea] active:bg-[#e3e1db]'
                                        }`}
                                    >
                                        {isCurrent ? '已开通' : PLAN_COPY[plan.id].action}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => toggleExpand(plan.id)}
                                        className="inline-flex items-center gap-1 text-xs text-[#37352f]/55 transition-colors duration-150 hover:text-[#37352f]"
                                    >
                                        <span>{isExpanded ? '收起权益' : '展开权益'}</span>
                                        <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-150 ${isExpanded ? 'rotate-180' : ''}`} />
                                    </button>
                                </div>
                            </div>

                            {isExpanded ? (
                                <ul className="mt-4 grid gap-2 border-t border-dashed border-gray-200 pt-4 sm:grid-cols-2">
                                    {plan.features.map((feature, featureIndex) => (
                                        <li
                                            key={`${plan.id}-${featureIndex}`}
                                            className="flex items-start gap-2 text-sm text-[#37352f]/70"
                                        >
                                            <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#37352f]/45" />
                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : null}
                        </div>
                    </section>
                );
            })}
        </div>
    );
}
