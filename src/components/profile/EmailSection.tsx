'use client';

import { useState, useEffect } from 'react';
import { Loader2, Mail, RefreshCw } from 'lucide-react';
import { sendOTP, verifyOTP } from '@/lib/auth';
import { VerificationCodeInput } from '@/components/auth/VerificationCodeInput';

type EmailChangeStep = 'idle' | 'input-email' | 'verify';

const EMAIL_SUFFIXES = [
    '@qq.com',
    '@163.com',
    '@126.com',
    '@gmail.com',
    '@outlook.com',
    '@icloud.com',
    '@foxmail.com',
];

export function EmailSection({
    currentEmail,
    onEmailChanged,
}: {
    currentEmail: string;
    onEmailChanged?: (newEmail: string) => void;
}) {
    const [step, setStep] = useState<EmailChangeStep>('idle');
    const [newEmail, setNewEmail] = useState('');
    const [newEmailPrefix, setNewEmailPrefix] = useState('');
    const [newEmailSuffix, setNewEmailSuffix] = useState('@qq.com');
    const [verificationCode, setVerificationCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [countdown, setCountdown] = useState(0);

    // 完整新邮箱
    const fullNewEmail = newEmailPrefix + newEmailSuffix;

    // 倒计时效果
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    // 重置状态
    const resetForm = () => {
        setStep('idle');
        setNewEmailPrefix('');
        setVerificationCode('');
        setError('');
        setSuccess('');
    };

    // 发送验证码到新邮箱
    const handleSendCode = async () => {
        if (!newEmailPrefix) {
            setError('请输入新邮箱地址');
            return;
        }

        if (fullNewEmail === currentEmail) {
            setError('新邮箱不能与当前邮箱相同');
            return;
        }

        setError('');
        setLoading(true);
        setNewEmail(fullNewEmail);

        try {
            const result = await sendOTP(currentEmail, 'email_change', fullNewEmail);
            if (result.success) {
                setCountdown(60);
                setStep('verify');
                setSuccess('验证码已发送到新邮箱');
            } else {
                setError(result.error?.message || '发送失败');
            }
        } catch {
            setError('发送失败，请重试');
        } finally {
            setLoading(false);
        }
    };

    // 验证验证码
    const handleVerifyCode = async () => {
        if (!verificationCode || verificationCode.length !== 6) {
            setError('请输入完整的6位验证码');
            return;
        }

        setError('');
        setLoading(true);

        try {
            const result = await verifyOTP(newEmail, verificationCode, 'email_change');
            if (result.success) {
                setSuccess('邮箱修改成功！');
                onEmailChanged?.(newEmail);
                setTimeout(() => {
                    resetForm();
                    setSuccess('');
                }, 2000);
            } else {
                setError(result.error?.message || '验证失败');
            }
        } catch {
            setError('验证失败，请重试');
        } finally {
            setLoading(false);
        }
    };

    // 重新发送验证码
    const handleResendCode = async () => {
        if (countdown > 0) return;

        setError('');
        setLoading(true);

        try {
            const result = await sendOTP(currentEmail, 'email_change', newEmail);
            if (result.success) {
                setCountdown(60);
                setSuccess('验证码已重新发送');
            } else {
                setError(result.error?.message || '发送失败');
            }
        } catch {
            setError('发送失败，请重试');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-2">
            <label className="text-sm font-medium text-foreground-secondary">
                邮箱
            </label>

            {/* 初始状态 - 显示当前邮箱 */}
            {step === 'idle' && (
                <div className="flex items-center gap-2">
                    <div className="flex-1 px-4 py-3 rounded-xl bg-background-secondary border border-border text-foreground-secondary">
                        {currentEmail}
                    </div>
                    <button
                        onClick={() => setStep('input-email')}
                        className="px-4 py-3.75 rounded-xl bg-accent/10 text-accent hover:bg-accent/20 transition-colors text-sm whitespace-nowrap"
                    >
                        修改邮箱
                    </button>
                </div>
            )}

            {/* 输入新邮箱步骤 */}
            {step === 'input-email' && (
                <div className="space-y-4 p-4 rounded-xl bg-background-secondary border border-border">
                    <p className="text-sm text-foreground-secondary">
                        当前邮箱：<span className="text-foreground">{currentEmail}</span>
                    </p>

                    {/* 新邮箱输入 */}
                    <div className="space-y-2">
                        <label className="text-xs text-foreground-secondary">新邮箱地址</label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-secondary" />
                                <input
                                    type="text"
                                    value={newEmailPrefix}
                                    onChange={(e) => setNewEmailPrefix(e.target.value)}
                                    placeholder="邮箱前缀"
                                    className="w-full pl-10 pr-4 py-3 rounded-lg bg-background border border-border focus:border-accent focus:outline-none transition-colors"
                                />
                            </div>
                            <select
                                value={newEmailSuffix}
                                onChange={(e) => setNewEmailSuffix(e.target.value)}
                                className="px-3 py-3 rounded-lg bg-background border border-border focus:border-accent focus:outline-none transition-colors text-sm"
                            >
                                {EMAIL_SUFFIXES.map(suffix => (
                                    <option key={suffix} value={suffix}>{suffix}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {error && (
                        <p className="text-sm text-red-500">{error}</p>
                    )}

                    <div className="flex gap-2">
                        <button
                            onClick={resetForm}
                            className="flex-1 py-2.5 rounded-lg border border-border hover:border-foreground-secondary transition-colors"
                        >
                            取消
                        </button>
                        <button
                            onClick={handleSendCode}
                            disabled={loading || !newEmailPrefix}
                            className="flex-1 py-2.5 rounded-lg bg-accent text-white font-medium hover:bg-accent/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                            发送验证码
                        </button>
                    </div>
                </div>
            )}

            {/* 验证码验证步骤 */}
            {step === 'verify' && (
                <div className="space-y-4 p-4 rounded-xl bg-background-secondary border border-border">
                    <p className="text-sm text-foreground-secondary text-center">
                        验证码已发送至 <span className="font-medium text-foreground">{newEmail}</span>
                    </p>

                    <VerificationCodeInput
                        value={verificationCode}
                        onChange={setVerificationCode}
                        onComplete={handleVerifyCode}
                        length={6}
                        disabled={loading}
                    />

                    {/* 重新发送 */}
                    <button
                        onClick={handleResendCode}
                        disabled={countdown > 0 || loading}
                        className="w-full flex items-center justify-center gap-2 text-sm text-accent hover:underline disabled:text-foreground-secondary disabled:no-underline disabled:cursor-not-allowed"
                    >
                        <RefreshCw className="w-4 h-4" />
                        {countdown > 0 ? `${countdown}秒后可重新发送` : '重新发送验证码'}
                    </button>

                    {success && (
                        <p className="text-sm text-green-500 text-center">{success}</p>
                    )}
                    {error && (
                        <p className="text-sm text-red-500 text-center">{error}</p>
                    )}

                    <div className="flex gap-2">
                        <button
                            onClick={resetForm}
                            className="flex-1 py-2.5 rounded-lg border border-border hover:border-foreground-secondary transition-colors"
                        >
                            取消
                        </button>
                        <button
                            onClick={handleVerifyCode}
                            disabled={loading || verificationCode.length !== 6}
                            className="flex-1 py-2.5 rounded-lg bg-accent text-white font-medium hover:bg-accent/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                            确认修改
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
