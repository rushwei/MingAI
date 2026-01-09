/**
 * 模拟支付弹窗
 * 
 * MVP阶段使用模拟支付流程
 * 支持订阅套餐和按量付费
 */
'use client';

import { useState } from 'react';
import { X, CreditCard, Loader2, CheckCircle, QrCode } from 'lucide-react';
import { type PricingPlan } from '@/lib/membership';
import { supabase } from '@/lib/supabase';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    plan: PricingPlan | null;
    userId: string;
    onSuccess?: () => void;
    /** 是否为按量付费模式 */
    isPayPerUse?: boolean;
    /** 按量付费的次数 */
    creditCount?: number;
}

type PaymentStep = 'select' | 'processing' | 'success';

export function PaymentModal({
    isOpen,
    onClose,
    plan,
    userId,
    onSuccess,
    isPayPerUse = false,
    creditCount = 0,
}: PaymentModalProps) {
    const [step, setStep] = useState<PaymentStep>('select');
    const [paymentMethod, setPaymentMethod] = useState<'wechat' | 'alipay'>('wechat');
    const [error, setError] = useState('');

    if (!isOpen || !plan) return null;

    const handlePayment = async () => {
        setStep('processing');
        setError('');

        // 模拟支付处理延迟
        await new Promise(resolve => setTimeout(resolve, 2000));

        try {
            // 使用 supabase.auth.getSession() 获取 access token
            const { data: { session } } = await supabase.auth.getSession();
            const accessToken = session?.access_token || '';

            if (!accessToken) {
                setError('请先登录');
                setStep('select');
                return;
            }

            let response: Response;

            if (isPayPerUse) {
                // 按量付费 - 调用服务端 API
                response = await fetch('/api/membership/purchase-credits', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${accessToken}`,
                    },
                    body: JSON.stringify({ count: creditCount, amount: plan.price }),
                });
            } else {
                // 订阅套餐 - 调用服务端 API
                response = await fetch('/api/membership/upgrade', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${accessToken}`,
                    },
                    body: JSON.stringify({ planId: plan.id }),
                });
            }

            const result = await response.json();

            if (response.ok && result.success) {
                setStep('success');
                setTimeout(() => {
                    onSuccess?.();
                    onClose();
                    window.location.reload();
                }, 1500);
            } else {
                setError(result.error || '支付失败');
                setStep('select');
            }
        } catch (err) {
            console.error('Payment error:', err);
            setError('网络错误，请重试');
            setStep('select');
        }
    };

    const handleClose = () => {
        if (step !== 'processing') {
            setStep('select');
            setError('');
            onClose();
        }
    };

    const successMessage = isPayPerUse
        ? `已获得 ${creditCount} 次对话额度`
        : `已成功开通 ${plan.name}`;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* 背景遮罩 */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={handleClose}
            />

            {/* 弹窗内容 */}
            <div className="relative w-full max-w-md bg-background rounded-2xl border border-border shadow-2xl animate-fade-in">
                {/* 头部 */}
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <h2 className="text-xl font-bold">
                        {step === 'success' ? '支付成功' : '确认支付'}
                    </h2>
                    {step !== 'processing' && (
                        <button
                            onClick={handleClose}
                            className="p-2 rounded-lg hover:bg-background-secondary transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>

                <div className="p-6">
                    {/* 成功状态 */}
                    {step === 'success' && (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                                <CheckCircle className="w-8 h-8 text-green-500" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">支付成功！</h3>
                            <p className="text-foreground-secondary">
                                {successMessage}
                            </p>
                        </div>
                    )}

                    {/* 处理中状态 */}
                    {step === 'processing' && (
                        <div className="text-center py-8">
                            <Loader2 className="w-12 h-12 animate-spin text-accent mx-auto mb-4" />
                            <h3 className="text-xl font-bold mb-2">支付处理中</h3>
                            <p className="text-foreground-secondary">
                                请稍候...
                            </p>
                        </div>
                    )}

                    {/* 选择支付方式 */}
                    {step === 'select' && (
                        <>
                            {/* 错误提示 */}
                            {error && (
                                <div className="p-3 rounded-lg bg-red-500/10 text-red-500 text-sm mb-4">
                                    {error}
                                </div>
                            )}

                            {/* 订单信息 */}
                            <div className="bg-background-secondary rounded-xl p-4 mb-6">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-foreground-secondary">
                                        {isPayPerUse ? '商品' : '套餐'}
                                    </span>
                                    <span className="font-medium">{plan.name}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-foreground-secondary">金额</span>
                                    <span className="text-2xl font-bold text-accent">¥{plan.price}</span>
                                </div>
                            </div>

                            {/* 支付方式 */}
                            <div className="space-y-3 mb-6">
                                <p className="text-sm font-medium text-foreground-secondary">选择支付方式</p>

                                <button
                                    onClick={() => setPaymentMethod('wechat')}
                                    className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-colors ${paymentMethod === 'wechat'
                                        ? 'border-green-500 bg-green-500/5'
                                        : 'border-border hover:border-green-500/50'
                                        }`}
                                >
                                    <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center">
                                        <QrCode className="w-5 h-5 text-white" />
                                    </div>
                                    <span className="font-medium">微信支付</span>
                                    {paymentMethod === 'wechat' && (
                                        <CheckCircle className="w-5 h-5 text-green-500 ml-auto" />
                                    )}
                                </button>

                                <button
                                    onClick={() => setPaymentMethod('alipay')}
                                    className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-colors ${paymentMethod === 'alipay'
                                        ? 'border-blue-500 bg-blue-500/5'
                                        : 'border-border hover:border-blue-500/50'
                                        }`}
                                >
                                    <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
                                        <CreditCard className="w-5 h-5 text-white" />
                                    </div>
                                    <span className="font-medium">支付宝</span>
                                    {paymentMethod === 'alipay' && (
                                        <CheckCircle className="w-5 h-5 text-blue-500 ml-auto" />
                                    )}
                                </button>
                            </div>

                            {/* 模拟支付提示 */}
                            <div className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 rounded-lg p-3 text-sm mb-6">
                                ⚠️ 当前为模拟支付，点击下方按钮将直接完成支付
                            </div>

                            {/* 支付按钮 */}
                            <button
                                onClick={handlePayment}
                                className="w-full py-4 rounded-xl bg-accent text-white font-medium hover:bg-accent/90 transition-colors"
                            >
                                立即支付 ¥{plan.price}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
