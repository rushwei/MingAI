/**
 * 个人资料编辑页面
 * 支持：昵称修改、头像上传、密码修改
 */
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    User as UserIcon,
    Mail,
    Loader2,
    Check,
    Camera,
    Lock,
    Eye,
    EyeOff,
    AlertCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getUserProfile, updateNickname } from '@/lib/auth';
import type { User } from '@supabase/supabase-js';

export default function ProfilePage() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [user, setUser] = useState<User | null>(null);
    const [nickname, setNickname] = useState('');
    const [originalNickname, setOriginalNickname] = useState('');
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    // 密码修改状态
    const [showPasswordSection, setShowPasswordSection] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);

    // 头像上传状态
    const [uploadingAvatar, setUploadingAvatar] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
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
                setAvatarUrl(profile.avatar_url || null);
            }

            setLoading(false);
        };

        fetchProfile();
    }, [router]);

    const handleSave = async () => {
        if (!user || !nickname.trim()) return;

        setSaving(true);
        setError('');
        setSuccess('');

        const result = await updateNickname(user.id, nickname.trim());

        if (result.success) {
            setOriginalNickname(nickname.trim());
            setSuccess('昵称已更新');
            setTimeout(() => setSuccess(''), 3000);
        } else {
            setError(result.error?.message || '保存失败');
        }

        setSaving(false);
    };

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        // 验证文件类型和大小
        if (!file.type.startsWith('image/')) {
            setError('请选择图片文件');
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            setError('图片大小不能超过 2MB');
            return;
        }

        setUploadingAvatar(true);
        setError('');

        try {
            // 上传到 Supabase Storage
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}-${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, { upsert: true });

            if (uploadError) throw uploadError;

            // 获取公开 URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            // 更新用户资料
            const { error: updateError } = await supabase
                .from('users')
                .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
                .eq('id', user.id);

            if (updateError) throw updateError;

            setAvatarUrl(publicUrl);
            setSuccess('头像已更新');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            console.error('Avatar upload error:', err);
            setError('头像上传失败，请重试');
        } finally {
            setUploadingAvatar(false);
        }
    };

    const handlePasswordChange = async () => {
        if (!newPassword || !confirmPassword) {
            setError('请填写新密码');
            return;
        }
        if (newPassword.length < 6) {
            setError('密码至少需要6个字符');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('两次输入的密码不一致');
            return;
        }

        setChangingPassword(true);
        setError('');

        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            setSuccess('密码已更新');
            setNewPassword('');
            setConfirmPassword('');
            setShowPasswordSection(false);
            setTimeout(() => setSuccess(''), 3000);
        } catch (err: unknown) {
            console.error('Password change error:', err);
            if (err instanceof Error) {
                setError(err.message || '密码修改失败');
            } else {
                setError('密码修改失败');
            }
        } finally {
            setChangingPassword(false);
        }
    };

    const hasNicknameChanges = nickname !== originalNickname;

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
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        className="hidden"
                    />
                    <div
                        className="w-24 h-24 rounded-full bg-accent/20 flex items-center justify-center overflow-hidden cursor-pointer"
                        onClick={handleAvatarClick}
                    >
                        {uploadingAvatar ? (
                            <Loader2 className="w-8 h-8 animate-spin text-accent" />
                        ) : avatarUrl ? (
                            <img src={avatarUrl} alt="头像" className="w-full h-full object-cover" />
                        ) : (
                            <UserIcon className="w-12 h-12 text-accent" />
                        )}
                    </div>
                    <button
                        onClick={handleAvatarClick}
                        disabled={uploadingAvatar}
                        className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center shadow-lg hover:bg-accent/90 transition-colors disabled:opacity-50"
                    >
                        <Camera className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* 表单 */}
            <div className="space-y-6">
                {/* 错误/成功提示 */}
                {error && (
                    <div className="p-3 rounded-lg bg-red-500/10 text-red-500 text-sm flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        {error}
                    </div>
                )}
                {success && (
                    <div className="p-3 rounded-lg bg-green-500/10 text-green-500 text-sm flex items-center gap-2">
                        <Check className="w-4 h-4 flex-shrink-0" />
                        {success}
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
                    <div className="flex items-center justify-between">
                        <p className="text-xs text-foreground-secondary">
                            最多20个字符
                        </p>
                        {hasNicknameChanges && (
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="text-sm text-accent hover:text-accent/80 disabled:opacity-50"
                            >
                                {saving ? '保存中...' : '保存'}
                            </button>
                        )}
                    </div>
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
                </div>

                {/* 修改密码 */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground-secondary">
                        密码
                    </label>
                    {!showPasswordSection ? (
                        <button
                            onClick={() => setShowPasswordSection(true)}
                            className="w-full px-4 py-3 rounded-xl bg-background-secondary border border-border text-left flex items-center gap-3 hover:border-accent transition-colors"
                        >
                            <Lock className="w-5 h-5 text-foreground-secondary" />
                            <span>修改密码</span>
                        </button>
                    ) : (
                        <div className="space-y-3 p-4 rounded-xl bg-background-secondary border border-border">
                            {/* 新密码 */}
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-secondary" />
                                <input
                                    type={showNewPassword ? 'text' : 'password'}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="新密码（至少6位）"
                                    className="w-full pl-10 pr-10 py-3 rounded-lg bg-background border border-border focus:border-accent focus:outline-none transition-colors"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-secondary"
                                >
                                    {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                            {/* 确认密码 */}
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-secondary" />
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="确认新密码"
                                    className="w-full pl-10 pr-10 py-3 rounded-lg bg-background border border-border focus:border-accent focus:outline-none transition-colors"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-secondary"
                                >
                                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                            {/* 操作按钮 */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        setShowPasswordSection(false);
                                        setNewPassword('');
                                        setConfirmPassword('');
                                        setError('');
                                    }}
                                    className="flex-1 py-2 rounded-lg border border-border hover:border-foreground-secondary transition-colors"
                                >
                                    取消
                                </button>
                                <button
                                    onClick={handlePasswordChange}
                                    disabled={changingPassword || !newPassword || !confirmPassword}
                                    className="flex-1 py-2 rounded-lg bg-accent text-white font-medium hover:bg-accent/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {changingPassword && <Loader2 className="w-4 h-4 animate-spin" />}
                                    {changingPassword ? '修改中...' : '确认修改'}
                                </button>
                            </div>
                        </div>
                    )}
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
            </div>
        </div>
    );
}
