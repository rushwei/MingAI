/**
 * 按量付费组件
 * 
 * 9.9元 = 1积分
 */
'use client';

import { useState } from 'react';
import { Coins, Plus, Minus } from 'lucide-react';
import { PaymentModal } from './PaymentModal';
import type { PricingPlan } from '@/lib/membership';

interface PayPerUseProps {
    userId: string;
    currentCredits: number;
    onSuccess?: () => void;
    isPaymentPaused?: boolean;
}

const PRICE_PER_CREDIT = 9.9;

const presetAmounts = [
    { count: 1, price: 9.9 },
    { count: 5, price: 45, discount: '省¥4.5' },
    { count: 10, price: 89, discount: '省¥10' },
    { count: 20, price: 168, discount: '省¥30' },
];

export function PayPerUse({
    userId,
    currentCredits,
    onSuccess,
    isPaymentPaused = false,
}: PayPerUseProps) {
    const [selectedCount, setSelectedCount] = useState(1);
    const [isCustom, setIsCustom] = useState(false);
    const [customAmount, setCustomAmount] = useState(1);
    const [showPaymentModal, setShowPaymentModal] = useState(false);

    const getSelectedCount = () => {
        return isCustom ? customAmount : selectedCount;
    };

    const getPrice = () => {
        if (isCustom) {
            return Math.round(customAmount * PRICE_PER_CREDIT * 10) / 10;
        }
        const preset = presetAmounts.find(p => p.count === selectedCount);
        return preset?.price || PRICE_PER_CREDIT;
    };

    const createPayPerUsePlan = (): PricingPlan => ({
        id: 'free',
        name: `${getSelectedCount()}积分`,
        price: getPrice(),
        period: '次',
        features: [`获得${getSelectedCount()}积分`],
        initialCredits: getSelectedCount(),
        restoreCredits: 0,
        restorePeriod: 'daily',
        creditLimit: 0,
    });

    const handleSelectPreset = (count: number) => {
        setSelectedCount(count);
        setIsCustom(false);
    };

    const handleCustomChange = (value: number) => {
        setCustomAmount(Math.max(1, Math.min(999, value)));
        setIsCustom(true);
    };

    const handlePurchase = () => {
        if (isPaymentPaused) return;
        setShowPaymentModal(true);
    };

    const handlePaymentSuccess = () => {
        setShowPaymentModal(false);
        onSuccess?.();
    };

    return (
        <div className="rounded-2xl border border-border p-6">
            {/* 标题 */}
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
                    <Coins className="w-5 h-5" />
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold">按量付费</h3>
                        {isPaymentPaused && (
                            <span className="text-[10px] text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full">
                                暂停服务
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-foreground-secondary">
                        当前积分：{currentCredits}
                    </p>
                </div>
            </div>

            {/* 预设金额 + 自定义数量 - 同一排 */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                {presetAmounts.map((preset) => (
                    <button
                        key={preset.count}
                        onClick={() => handleSelectPreset(preset.count)}
                        className={`relative p-3 rounded-xl border-2 transition-all text-center ${!isCustom && selectedCount === preset.count
                                ? 'border-accent bg-accent/5'
                                : 'border-border hover:border-accent/50'
                            }`}
                    >
                        {preset.discount && (
                            <span className="absolute -top-2 right-1 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px]">
                                {preset.discount}
                            </span>
                        )}
                        <div className="text-base font-bold">{preset.count}积分</div>
                        <div className="text-accent text-sm font-medium">¥{preset.price}</div>
                    </button>
                ))}

                {/* 自定义数量 */}
                <div
                    className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center justify-center ${isCustom ? 'border-accent bg-accent/5' : 'border-border'
                        }`}
                >
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => handleCustomChange(customAmount - 1)}
                            className="p-1 rounded-md bg-background-secondary hover:bg-accent hover:text-white transition-colors"
                        >
                            <Minus className="w-3 h-3" />
                        </button>
                        <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={customAmount}
                            onChange={(e) => handleCustomChange(parseInt(e.target.value) || 1)}
                            onFocus={() => setIsCustom(true)}
                            className="w-10 text-center text-base font-bold bg-transparent border-none outline-none"
                        />
                        <button
                            onClick={() => handleCustomChange(customAmount + 1)}
                            className="p-1 rounded-md bg-background-secondary hover:bg-accent hover:text-white transition-colors"
                        >
                            <Plus className="w-3 h-3" />
                        </button>
                    </div>
                    {isCustom && (
                        <div className="text-accent text-sm font-medium mt-1">
                            ¥{getPrice()}
                        </div>
                    )}
                    {!isCustom && (
                        <div className="text-foreground-secondary text-xs mt-1">自定义</div>
                    )}
                </div>
            </div>

            {/* 购买按钮 */}
            <button
                onClick={handlePurchase}
                disabled={isPaymentPaused}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <Coins className="w-5 h-5" />
                购买 {getSelectedCount()} 积分 · ¥{getPrice()}
            </button>

            {/* 说明 */}
            <p className="text-center text-xs text-foreground-secondary mt-4">
                按量付费积分永久有效，不受会员等级限制
            </p>

            {/* 支付弹窗 */}
            <PaymentModal
                isOpen={showPaymentModal}
                onClose={() => setShowPaymentModal(false)}
                plan={createPayPerUsePlan()}
                userId={userId}
                onSuccess={handlePaymentSuccess}
                isPayPerUse={true}
                creditCount={getSelectedCount()}
                isPaymentPaused={isPaymentPaused}
            />
        </div>
    );
}
