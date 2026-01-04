/**
 * 认证弹窗组件
 * 
 * 支持登录、注册、忘记密码切换
 */
'use client';

import { useState } from 'react';
import { X, Mail, Lock, User, Loader2, ArrowLeft } from 'lucide-react';
import { signInWithEmail, signUpWithEmail, resetPassword } from '@/lib/auth';

type AuthMode = 'login' | 'register' | 'forgot';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
    const [mode, setMode] = useState<AuthMode>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [nickname, setNickname] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            if (mode === 'login') {
                const result = await signInWithEmail(email, password);
                if (result.success) {
                    onSuccess?.();
                    onClose();
                    // 刷新页面以更新用户状态
                    window.location.reload();
                } else {
                    setError(result.error?.message || '登录失败');
                }
            } else if (mode === 'register') {
                const result = await signUpWithEmail(email, password, nickname);
                if (result.success) {
                    setSuccess('注册成功！请查看邮箱完成验证');
                    setMode('login');
                } else {
                    setError(result.error?.message || '注册失败');
                }
            } else if (mode === 'forgot') {
                const result = await resetPassword(email);
                if (result.success) {
                    setSuccess('重置邮件已发送，请查看邮箱');
                } else {
                    setError(result.error?.message || '发送失败');
                }
            }
        } catch {
            setError('操作失败，请重试');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setEmail('');
        setPassword('');
        setNickname('');
        setError('');
        setSuccess('');
    };

    const switchMode = (newMode: AuthMode) => {
        resetForm();
        setMode(newMode);
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
                        {mode === 'forgot' && (
                            <button
                                onClick={() => switchMode('login')}
                                className="p-1 rounded-lg hover:bg-background-secondary transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                        )}
                        <h2 className="text-xl font-bold">
                            {mode === 'login' && '登录'}
                            {mode === 'register' && '注册'}
                            {mode === 'forgot' && '重置密码'}
                        </h2>
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
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-secondary" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="your@email.com"
                                required
                                className="w-full pl-10 pr-4 py-3 rounded-xl bg-background-secondary border border-border focus:border-accent focus:outline-none transition-colors"
                            />
                        </div>
                    </div>

                    {/* 密码（登录和注册） */}
                    {mode !== 'forgot' && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground-secondary">
                                密码
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-secondary" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="至少6个字符"
                                    required
                                    minLength={6}
                                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-background-secondary border border-border focus:border-accent focus:outline-none transition-colors"
                                />
                            </div>
                        </div>
                    )}

                    {/* 忘记密码链接 */}
                    {mode === 'login' && (
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

                    {/* 提交按钮 */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 rounded-xl bg-accent text-white font-medium hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                        {mode === 'login' && '登录'}
                        {mode === 'register' && '注册'}
                        {mode === 'forgot' && '发送重置邮件'}
                    </button>

                    {/* 切换登录/注册 */}
                    {mode !== 'forgot' && (
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
                </form>
            </div>
        </div>
    );
}
