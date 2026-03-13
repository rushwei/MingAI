/**
 * 认证弹窗组件
 * 
 * 支持登录、注册、忘记密码切换
 * Phase 3 增强：OTP验证码登录/注册、密码强度验证、登录限制
 */
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { X, Mail, Lock, User, Loader2, ArrowLeft, RefreshCw, Eye, EyeOff } from 'lucide-react';
import {
    signInWithEmailProtected,
    sendOTP,
    verifyOTP,
    recordLoginAttempt,
    resetPasswordWithOTP,
} from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { PasswordStrengthIndicator, validatePasswordStrength } from '@/components/auth/PasswordStrengthIndicator';
import { VerificationCodeInput } from '@/components/auth/VerificationCodeInput';

type AuthMode = 'login' | 'register' | 'forgot' | 'verify-register' | 'verify-login' | 'set-password' | 'verify-reset' | 'reset-password';
type LoginMethod = 'password' | 'otp';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
    const [mode, setMode] = useState<AuthMode>('login');
    const [loginMethod, setLoginMethod] = useState<LoginMethod>('password');
    const [emailPrefix, setEmailPrefix] = useState('');
    const [emailSuffix, setEmailSuffix] = useState('@qq.com');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [nickname, setNickname] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [sendingCode, setSendingCode] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [countdown, setCountdown] = useState(0);
    const verifyingRef = useRef(false);

    // 常用邮箱后缀
    const emailSuffixes = [
        '@qq.com',
        '@163.com',
        '@126.com',
        '@gmail.com',
        '@outlook.com',
        '@icloud.com',
        '@foxmail.com',
    ];

    // 完整邮箱地址
    const email = emailPrefix + emailSuffix;

    // 倒计时效果
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    // 重置表单
    const resetForm = useCallback(() => {
        setEmailPrefix('');
        setPassword('');
        setConfirmPassword('');
        setShowPassword(false);
        setShowConfirmPassword(false);
        setNickname('');
        setVerificationCode('');
        setError('');
        setSuccess('');
        setCountdown(0);
    }, []);

    // 切换模式
    const switchMode = useCallback((newMode: AuthMode) => {
        resetForm();
        setMode(newMode);
        if (newMode === 'login') {
            setLoginMethod('password');
        }
    }, [resetForm]);

    if (!isOpen) return null;

    // 发送验证码
    const handleSendOTP = async (type: 'signup' | 'magiclink') => {
        if (!emailPrefix) {
            setError('请输入邮箱地址');
            return;
        }

        setError('');
        setLoading(true);

        try {
            const result = await sendOTP(email, type);
            if (result.success) {
                setCountdown(60);
                if (type === 'signup') {
                    setMode('verify-register');
                    setSuccess('验证码已发送到您的邮箱');
                } else {
                    setMode('verify-login');
                    setSuccess('登录验证码已发送到您的邮箱');
                }
            } else {
                setError(result.error?.message || '发送失败');
            }
        } catch {
            setError('发送失败，请重试');
        } finally {
            setLoading(false);
        }
    };

    // 注册时发送验证码（不切换模式）
    const handleSendRegisterCode = async () => {
        if (!emailPrefix) {
            setError('请输入邮箱地址');
            return;
        }

        const { isValid } = validatePasswordStrength(password);
        if (!isValid) {
            setError('请先设置符合要求的密码');
            return;
        }

        if (password !== confirmPassword) {
            setError('两次输入的密码不一致');
            return;
        }

        setError('');
        setSendingCode(true);

        try {
            const result = await sendOTP(email, 'signup');
            if (result.success) {
                setCountdown(60);
                setSuccess('验证码已发送到您的邮箱');
            } else {
                setError(result.error?.message || '发送失败');
            }
        } catch {
            setError('发送失败，请重试');
        } finally {
            setSendingCode(false);
        }
    };

    // 重新发送验证码
    const handleResendOTP = async () => {
        if (countdown > 0) return;

        if (mode === 'verify-reset') {
            setError('');
            setLoading(true);
            try {
                const result = await sendOTP(email, 'recovery');
                if (result.success) {
                    setCountdown(60);
                    setSuccess('验证码已发送到您的邮箱');
                } else {
                    setError(result.error?.message || '发送失败');
                }
            } catch {
                setError('发送失败，请重试');
            } finally {
                setLoading(false);
            }
            return;
        }

        const type = mode === 'verify-register' ? 'signup' : 'magiclink';
        await handleSendOTP(type);
    };

    // 验证验证码
    const handleVerifyOTP = async (code?: string) => {
        if (verifyingRef.current) return;
        const codeToVerify = code || verificationCode;
        if (!codeToVerify || codeToVerify.length !== 6) {
            setError('请输入6位验证码');
            return;
        }

        // 重置密码流程：先进入设置密码界面，提交时再校验验证码，避免自动登录
        if (mode === 'verify-reset') {
            setError('');
            setVerificationCode(codeToVerify);
            setMode('reset-password');
            setSuccess('验证成功！请设置新密码');
            return;
        }

        setError('');
        setLoading(true);
        verifyingRef.current = true;
        const currentMode = mode;

        try {
            const verifyType = currentMode === 'verify-register' ? 'signup' : 'magiclink';
            const result = await verifyOTP(email, codeToVerify, verifyType);
            if (result.success) {
                // 如果是注册验证，进入设置密码步骤
                if (currentMode === 'verify-register') {
                    setMode('set-password');
                    setSuccess('验证成功！请设置您的密码');
                    setVerificationCode('');
                } else {
                    // 登录验证成功
                    onSuccess?.();
                    onClose();
                    window.location.reload();
                }
            } else {
                setError(result.error?.message || '验证失败');
            }
        } catch {
            setError('验证失败，请重试');
        } finally {
            setLoading(false);
            verifyingRef.current = false;
        }
    };

    // 提交处理
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            if (mode === 'login') {
                if (loginMethod === 'password') {
                    const result = await signInWithEmailProtected(email, password);
                    if (result.success) {
                        onSuccess?.();
                        onClose();
                        window.location.reload();
                    } else {
                        setError(result.error?.message || '登录失败');
                    }
                } else {
                    // OTP 登录：发送验证码
                    await handleSendOTP('magiclink');
                }
            } else if (mode === 'register') {
                // 注册流程：验证码 + 注册登录
                if (!verificationCode || verificationCode.length !== 6) {
                    setError('请输入6位验证码');
                    setLoading(false);
                    return;
                }

                const { isValid } = validatePasswordStrength(password);
                if (!isValid) {
                    setError('密码不符合强度要求');
                    setLoading(false);
                    return;
                }

                if (password !== confirmPassword) {
                    setError('两次输入的密码不一致');
                    setLoading(false);
                    return;
                }

                // 验证码验证并完成注册
                const verifyResult = await verifyOTP(email, verificationCode);
                if (verifyResult.success) {
                    // 设置密码和昵称
                    const { error: updateError } = await supabase.auth.updateUser({
                        password: password,
                        data: { nickname: nickname || '命理爱好者' },
                    });

                    if (updateError) {
                        setError('设置密码失败：' + updateError.message);
                    } else {
                        // 记录注册成功
                        await recordLoginAttempt(email, true);
                        setSuccess('注册成功！');
                        onSuccess?.();
                        onClose();
                        window.location.reload();
                    }
                } else {
                    setError(verifyResult.error?.message || '验证码验证失败');
                }
            } else if (mode === 'set-password') {
                // 设置密码
                const { isValid } = validatePasswordStrength(password);
                if (!isValid) {
                    setError('密码不符合强度要求');
                    setLoading(false);
                    return;
                }

                // 更新密码和昵称
                const { error: updateError } = await supabase.auth.updateUser({
                    password: password,
                    data: { nickname: nickname || '命理爱好者' },
                });

                if (updateError) {
                    setError('设置密码失败：' + updateError.message);
                } else {
                    onSuccess?.();
                    onClose();
                    window.location.reload();
                }
            } else if (mode === 'forgot') {
                // 发送重置密码验证码
                setError('');
                const result = await sendOTP(email, 'recovery');
                if (result.success) {
                    setCountdown(60);
                    setMode('verify-reset');
                    setSuccess('验证码已发送到您的邮箱');
                } else {
                    setError(result.error?.message || '发送失败');
                }
            } else if (mode === 'reset-password') {
                // 设置新密码
                const { isValid } = validatePasswordStrength(password);
                if (!isValid) {
                    setError('密码不符合强度要求');
                    setLoading(false);
                    return;
                }

                if (password !== confirmPassword) {
                    setError('两次输入的密码不一致');
                    setLoading(false);
                    return;
                }

                if (!verificationCode || verificationCode.length !== 6) {
                    setError('请输入6位验证码');
                    setLoading(false);
                    return;
                }

                const resetResult = await resetPasswordWithOTP(email, verificationCode, password);
                if (!resetResult.success) {
                    setError(resetResult.error?.message || '验证码已过期或无效');
                    setLoading(false);
                    return;
                }

                setSuccess('密码重置成功！请使用新密码登录');
                resetForm();
                setMode('login');
            } else if (mode === 'verify-register' || mode === 'verify-login' || mode === 'verify-reset') {
                await handleVerifyOTP();
            }
        } catch {
            setError('操作失败，请重试');
        } finally {
            setLoading(false);
        }
    };

    // 获取标题
    const getTitle = () => {
        switch (mode) {
            case 'login': return '登录';
            case 'register': return '注册';
            case 'forgot': return '重置密码';
            case 'verify-register': return '验证邮箱';
            case 'verify-login': return '验证登录';
            case 'verify-reset': return '验证身份';
            case 'set-password': return '设置密码';
            case 'reset-password': return '设置新密码';
        }
    };

    // 获取提交按钮文字
    const getSubmitText = () => {
        switch (mode) {
            case 'login': return loginMethod === 'password' ? '登录' : '发送验证码';
            case 'register': return '注册';
            case 'forgot': return '发送验证码';
            case 'verify-register':
            case 'verify-login':
            case 'verify-reset': return '验证';
            case 'set-password': return '完成注册';
            case 'reset-password': return '重置密码';
        }
    };

    // 是否显示返回按钮
    const showBackButton = mode === 'forgot' || mode === 'verify-register' || mode === 'verify-login' || mode === 'set-password' || mode === 'verify-reset' || mode === 'reset-password';

    // 返回上一步
    const handleBack = () => {
        if (mode === 'verify-register' || mode === 'set-password') {
            switchMode('register');
        } else if (mode === 'verify-login') {
            switchMode('login');
        } else if (mode === 'verify-reset' || mode === 'reset-password' || mode === 'forgot') {
            switchMode('login');
        } else {
            switchMode('login');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* 背景遮罩 */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* 弹窗内容 */}
            <div className="relative w-full max-w-md mx-4 bg-background rounded-2xl border border-border shadow-2xl animate-fade-in">
                {/* 头部 */}
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <div className="flex items-center gap-2">
                        {showBackButton && (
                            <button
                                onClick={handleBack}
                                className="p-1 rounded-lg hover:bg-background-secondary transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                        )}
                        <h2 className="text-xl font-bold">{getTitle()}</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-background-secondary transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* 表单 */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* 错误/成功提示 */}
                    {error && (
                        <div className="p-3 rounded-lg bg-red-500/10 text-red-500 text-sm">
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="p-3 rounded-lg bg-green-500/10 text-green-500 text-sm">
                            {success}
                        </div>
                    )}

                    {/* 登录方式切换（仅登录模式） */}
                    {mode === 'login' && (
                        <div className="flex gap-2 p-1 bg-background-secondary rounded-xl">
                            <button
                                type="button"
                                onClick={() => setLoginMethod('password')}
                                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${loginMethod === 'password'
                                    ? 'bg-background text-foreground shadow-sm'
                                    : 'text-foreground-secondary hover:text-foreground'
                                    }`}
                            >
                                密码登录
                            </button>
                            <button
                                type="button"
                                onClick={() => setLoginMethod('otp')}
                                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${loginMethod === 'otp'
                                    ? 'bg-background text-foreground shadow-sm'
                                    : 'text-foreground-secondary hover:text-foreground'
                                    }`}
                            >
                                验证码登录
                            </button>
                        </div>
                    )}

                    {/* 验证码输入（验证模式） */}
                    {(mode === 'verify-register' || mode === 'verify-login' || mode === 'verify-reset') && (
                        <div className="space-y-4">
                            <p className="text-sm text-foreground-secondary text-center">
                                验证码已发送至 <span className="font-medium text-foreground">{email}</span>
                            </p>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground-secondary text-center block">
                                    验证码
                                </label>
                                <VerificationCodeInput
                                    value={verificationCode}
                                    onChange={setVerificationCode}
                                    onComplete={handleVerifyOTP}
                                    length={6}
                                    disabled={loading}
                                />
                            </div>
                            <button
                                type="button"
                                onClick={handleResendOTP}
                                disabled={countdown > 0}
                                className="flex items-center justify-center gap-2 w-full py-2 text-sm text-foreground-secondary hover:text-foreground disabled:opacity-50 transition-colors"
                            >
                                <RefreshCw className="w-4 h-4" />
                                {countdown > 0 ? `${countdown}秒后可重新发送` : '重新发送验证码'}
                            </button>
                        </div>
                    )}

                    {/* 设置密码模式 */}
                    {mode === 'set-password' && (
                        <>
                            {/* 昵称 */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground-secondary">
                                    昵称
                                </label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-secondary" />
                                    <input
                                        type="text"
                                        value={nickname}
                                        onChange={(e) => setNickname(e.target.value)}
                                        placeholder="输入您的昵称"
                                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-background-secondary border border-border focus:border-accent focus:outline-none transition-colors"
                                    />
                                </div>
                            </div>

                            {/* 密码 */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground-secondary">
                                    设置密码
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-secondary" />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="设置登录密码"
                                        required
                                        minLength={8}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-background-secondary border border-border focus:border-accent focus:outline-none transition-colors"
                                    />
                                </div>
                                <PasswordStrengthIndicator password={password} />
                            </div>
                        </>
                    )}

                    {/* 重置密码模式 */}
                    {mode === 'reset-password' && (
                        <>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground-secondary">
                                    新密码
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-secondary" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="设置新密码"
                                        required
                                        minLength={8}
                                        className="w-full pl-10 pr-10 py-3 rounded-xl bg-background-secondary border border-border focus:border-accent focus:outline-none transition-colors"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-secondary hover:text-foreground transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                                <PasswordStrengthIndicator password={password} />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground-secondary">
                                    确认新密码
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-secondary" />
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="再次输入新密码"
                                        required
                                        minLength={8}
                                        className={`w-full pl-10 pr-10 py-3 rounded-xl bg-background-secondary border focus:outline-none transition-colors ${confirmPassword && password !== confirmPassword
                                            ? 'border-red-500 focus:border-red-500'
                                            : 'border-border focus:border-accent'
                                            }`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-secondary hover:text-foreground transition-colors"
                                    >
                                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                                {confirmPassword && password !== confirmPassword && (
                                    <p className="text-xs text-red-500">两次输入的密码不一致</p>
                                )}
                            </div>
                        </>
                    )}

                    {/* 常规输入区域 */}
                    {mode !== 'verify-register' && mode !== 'verify-login' && mode !== 'verify-reset' && mode !== 'set-password' && mode !== 'reset-password' && (
                        <>
                            {/* 昵称（仅注册） */}
                            {mode === 'register' && (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-foreground-secondary">
                                        昵称
                                    </label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-secondary" />
                                        <input
                                            type="text"
                                            value={nickname}
                                            onChange={(e) => setNickname(e.target.value)}
                                            placeholder="输入您的昵称"
                                            className="w-full pl-10 pr-4 py-3 rounded-xl bg-background-secondary border border-border focus:border-accent focus:outline-none transition-colors"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* 邮箱 */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground-secondary">
                                    邮箱
                                </label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-secondary" />
                                        <input
                                            type="text"
                                            value={emailPrefix}
                                            onChange={(e) => setEmailPrefix(e.target.value)}
                                            placeholder="邮箱前缀"
                                            required
                                            className="w-full pl-10 pr-4 py-3 rounded-xl bg-background-secondary border border-border focus:border-accent focus:outline-none transition-colors"
                                        />
                                    </div>
                                    <select
                                        value={emailSuffix}
                                        onChange={(e) => setEmailSuffix(e.target.value)}
                                        className="px-3 py-3 rounded-xl bg-background-secondary border border-border focus:border-accent focus:outline-none transition-colors text-sm"
                                    >
                                        {emailSuffixes.map(suffix => (
                                            <option key={suffix} value={suffix}>{suffix}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* 密码（登录密码方式和注册） */}
                            {(mode === 'register' || (mode === 'login' && loginMethod === 'password')) && (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-foreground-secondary">
                                        密码
                                    </label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-secondary" />
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder={mode === 'register' ? '设置密码' : '输入密码'}
                                            required
                                            minLength={mode === 'register' ? 8 : 6}
                                            className="w-full pl-10 pr-10 py-3 rounded-xl bg-background-secondary border border-border focus:border-accent focus:outline-none transition-colors"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-secondary hover:text-foreground transition-colors"
                                        >
                                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                    {/* 密码强度指示器（仅注册） */}
                                    {mode === 'register' && (
                                        <PasswordStrengthIndicator password={password} />
                                    )}
                                </div>
                            )}

                            {/* 确认密码（仅注册） */}
                            {mode === 'register' && (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-foreground-secondary">
                                        确认密码
                                    </label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-secondary" />
                                        <input
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="再次输入密码"
                                            required
                                            minLength={8}
                                            className={`w-full pl-10 pr-10 py-3 rounded-xl bg-background-secondary border focus:outline-none transition-colors ${confirmPassword && password !== confirmPassword
                                                ? 'border-red-500 focus:border-red-500'
                                                : 'border-border focus:border-accent'
                                                }`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-secondary hover:text-foreground transition-colors"
                                        >
                                            {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                    {confirmPassword && password !== confirmPassword && (
                                        <p className="text-xs text-red-500">两次输入的密码不一致</p>
                                    )}
                                </div>
                            )}

                            {/* 注册验证码输入和发送按钮 */}
                            {mode === 'register' && (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-medium text-foreground-secondary">
                                            邮箱验证码
                                        </label>
                                        <button
                                            type="button"
                                            onClick={handleSendRegisterCode}
                                            disabled={sendingCode || countdown > 0}
                                            className="px-3 py-1.5 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                                        >
                                            {sendingCode ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : countdown > 0 ? (
                                                `${countdown}s 后重发`
                                            ) : (
                                                '发送验证码'
                                            )}
                                        </button>
                                    </div>
                                    <VerificationCodeInput
                                        value={verificationCode}
                                        onChange={setVerificationCode}
                                        length={6}
                                        disabled={loading}
                                    />
                                </div>
                            )}

                            {/* 忘记密码链接 */}
                            {mode === 'login' && loginMethod === 'password' && (
                                <div className="text-right">
                                    <button
                                        type="button"
                                        onClick={() => switchMode('forgot')}
                                        className="text-sm text-accent hover:underline"
                                    >
                                        忘记密码？
                                    </button>
                                </div>
                            )}
                        </>
                    )}

                    {/* 提交按钮 */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 rounded-xl bg-accent text-white font-medium hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                        {getSubmitText()}
                    </button>

                    {/* 第三方登录分隔线 */}
                    {(mode === 'login' || mode === 'register') && (
                        <>
                            <div className="relative flex items-center gap-4 py-1">
                                <div className="flex-1 border-t border-border" />
                                <span className="text-xs text-foreground-secondary">或</span>
                                <div className="flex-1 border-t border-border" />
                            </div>
                            <button
                                type="button"
                                onClick={() => { window.location.href = '/api/auth/linuxdo'; }}
                                className="w-full py-3 rounded-xl border border-border bg-background-secondary hover:bg-background-secondary/80 font-medium transition-colors flex items-center justify-center gap-2 text-sm"
                            >
                                <svg width="20" height="20" viewBox="5 5 90 90" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                    <circle fill="#efefef" cx="50" cy="50" r="45"/>
                                    <path fill="#feb005" d="M50,92.3c16.64,0,31.03-9.61,37.94-23.57H12.06c6.91,13.97,21.3,23.57,37.94,23.57Z"/>
                                    <path fill="#1e1e20" d="M50,7.7c-16.64,0-31.03,9.61-37.94,23.57h75.88c-6.91-13.97-21.3-23.57-37.94-23.57Z"/>
                                </svg>
                                Linux DO 登录
                            </button>
                        </>
                    )}

                    {/* 切换登录/注册 */}
                    {(mode === 'login' || mode === 'register') && (
                        <div className="text-center text-sm text-foreground-secondary">
                            {mode === 'login' ? (
                                <>
                                    还没有账号？
                                    <button
                                        type="button"
                                        onClick={() => switchMode('register')}
                                        className="text-accent hover:underline ml-1"
                                    >
                                        立即注册
                                    </button>
                                </>
                            ) : (
                                <>
                                    已有账号？
                                    <button
                                        type="button"
                                        onClick={() => switchMode('login')}
                                        className="text-accent hover:underline ml-1"
                                    >
                                        立即登录
                                    </button>
                                </>
                            )}
                        </div>
                    )}

                    {/* 法律声明 */}
                    <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-foreground-secondary pt-2">
                        <span>登录即表示同意</span>
                        <Link
                            href="/terms"
                            target="_blank"
                            className="text-accent hover:underline"
                            onClick={(e) => e.stopPropagation()}
                        >
                            《服务条款》
                        </Link>
                        <span>和</span>
                        <Link
                            href="/privacy"
                            target="_blank"
                            className="text-accent hover:underline"
                            onClick={(e) => e.stopPropagation()}
                        >
                            《隐私政策》
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
