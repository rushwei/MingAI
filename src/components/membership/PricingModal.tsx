/**
 * 会员套餐选择弹窗
 */
'use client';

import { X, Check, Crown, Sparkles } from 'lucide-react';
import { pricingPlans, type PricingPlan } from '@/lib/membership';

interface PricingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectPlan: (plan: PricingPlan) => void;
    currentPlan?: string;
}

export function PricingModal({ isOpen, onClose, onSelectPlan, currentPlan }: PricingModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* 背景遮罩 */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* 弹窗内容 */}
            <div className="relative w-full max-w-4xl bg-background rounded-2xl border border-border shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
                {/* 头部 */}
                <div className="sticky top-0 bg-background flex items-center justify-between p-6 border-b border-border">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-accent/10">
                            <Crown className="w-6 h-6 text-accent" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">升级会员</h2>
                            <p className="text-sm text-foreground-secondary">解锁全部功能，尽享AI命理服务</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-background-secondary transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* 套餐列表 */}
                <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                                    onClick={() => onSelectPlan(plan)}
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
                    <p className="text-center text-sm text-foreground-secondary mt-6">
                        支付後可随时取消续订 · 7天无理由退款
                    </p>
                </div>
            </div>
        </div>
    );
}
