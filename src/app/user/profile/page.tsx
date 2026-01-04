/**
 * 个人资料编辑页面
 */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    User as UserIcon,
    Mail,
    Loader2,
    Check,
    Camera
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getUserProfile, updateNickname } from '@/lib/auth';
import type { User } from '@supabase/supabase-js';

export default function ProfilePage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [nickname, setNickname] = useState('');
    const [originalNickname, setOriginalNickname] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchProfile = async () => {
            // 使用 getSession 从本地缓存读取
            const { data: { session } } = await supabase.auth.getSession();

            if (!session?.user) {
                router.push('/user');
                return;
            }

            setUser(session.user);

            const profile = await getUserProfile(session.user.id);
            if (profile) {
                setNickname(profile.nickname || '');
                setOriginalNickname(profile.nickname || '');
            }

            setLoading(false);
        };

        fetchProfile();
    }, [router]);

    const handleSave = async () => {
        if (!user || !nickname.trim()) return;

        setSaving(true);
        setError('');
        setSuccess(false);

        const result = await updateNickname(user.id, nickname.trim());

        if (result.success) {
            setOriginalNickname(nickname.trim());
            setSuccess(true);
            setTimeout(() => setSuccess(false), 2000);
        } else {
            setError(result.error?.message || '保存失败');
        }

        setSaving(false);
    };

    const hasChanges = nickname !== originalNickname;

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto px-4 py-8 animate-fade-in">
            {/* 头部 */}
            <div className="flex items-center gap-3 mb-6">
                <button
                    onClick={() => router.back()}
                    className="p-2 rounded-lg hover:bg-background-secondary transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-xl font-bold">个人资料</h1>
            </div>

            {/* 头像区域 */}
            <div className="flex justify-center mb-8">
                <div className="relative">
                    <div className="w-24 h-24 rounded-full bg-accent/20 flex items-center justify-center">
                        <UserIcon className="w-12 h-12 text-accent" />
                    </div>
                    <button
                        className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center shadow-lg"
                        title="更换头像（暂未开放）"
                        disabled
                    >
                        <Camera className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* 表单 */}
            <div className="space-y-6">
                {/* 错误/成功提示 */}
                {error && (
                    <div className="p-3 rounded-lg bg-red-500/10 text-red-500 text-sm">
                        {error}
                    </div>
                )}
                {success && (
                    <div className="p-3 rounded-lg bg-green-500/10 text-green-500 text-sm flex items-center gap-2">
                        <Check className="w-4 h-4" />
                        保存成功
                    </div>
                )}

                {/* 昵称 */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground-secondary">
                        昵称
                    </label>
                    <div className="relative">
                        <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-secondary" />
                        <input
                            type="text"
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                            placeholder="输入您的昵称"
                            maxLength={20}
                            className="w-full pl-10 pr-4 py-3 rounded-xl bg-background-secondary border border-border focus:border-accent focus:outline-none transition-colors"
                        />
                    </div>
                    <p className="text-xs text-foreground-secondary">
                        最多20个字符
                    </p>
                </div>

                {/* 邮箱（只读） */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground-secondary">
                        邮箱
                    </label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-secondary" />
                        <input
                            type="email"
                            value={user?.email || ''}
                            disabled
                            className="w-full pl-10 pr-4 py-3 rounded-xl bg-background-secondary border border-border text-foreground-secondary cursor-not-allowed"
                        />
                    </div>
                    <p className="text-xs text-foreground-secondary">
                        邮箱不可修改
                    </p>
                </div>

                {/* 注册时间 */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground-secondary">
                        注册时间
                    </label>
                    <div className="px-4 py-3 rounded-xl bg-background-secondary border border-border text-foreground-secondary">
                        {user?.created_at
                            ? new Date(user.created_at).toLocaleDateString('zh-CN', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                            })
                            : '未知'
                        }
                    </div>
                </div>

                {/* 保存按钮 */}
                <button
                    onClick={handleSave}
                    disabled={!hasChanges || saving}
                    className="w-full py-3 rounded-xl bg-accent text-white font-medium hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    {saving ? '保存中...' : '保存修改'}
                </button>
            </div>
        </div>
    );
}
