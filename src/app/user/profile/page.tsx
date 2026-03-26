/**
 * 个人资料编辑页面
 * 支持：昵称修改、头像上传、密码修改
 */
'use client';

import { useState, useEffect, useRef } from 'react';
import { Camera, User as UserIcon } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/auth';
import { ensureUserRecord, getUserProfile, updateNickname } from '@/lib/auth';
import { readLocalCache, writeLocalCache } from '@/lib/cache';
import type { User } from '@/lib/auth';
import { uploadAvatarForCurrentUser } from '@/lib/user/profile';
import { StatusBanner } from '@/components/profile/StatusBanner';
import { PasswordSection } from '@/components/profile/PasswordSection';
import { getUserEmailDisplay } from '@/lib/user-email';

export default function ProfilePage() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // useState 管理用户档案与表单状态，确保交互时及时刷新 UI
    const [user, setUser] = useState<User | null>(null);
    const [nickname, setNickname] = useState('');
    const [originalNickname, setOriginalNickname] = useState('');
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    // 头像上传状态
    const [uploadingAvatar, setUploadingAvatar] = useState(false);

    const readProfileCache = (userId: string) => {
        return readLocalCache<{ nickname: string | null; avatar_url: string | null }>(
            `mingai.profile.${userId}`,
            24 * 60 * 60 * 1000
        );
    };

    const writeProfileCache = (userId: string, nicknameValue: string | null, avatarValue: string | null) => {
        const payload = { nickname: nicknameValue, avatar_url: avatarValue };
        writeLocalCache(`mingai.profile.${userId}`, payload);
    };

    // useEffect 用于首次加载用户资料与头像信息
    useEffect(() => {
        const fetchProfile = async () => {
            const { data: { session } } = await supabase.auth.getSession();

            if (!session?.user) {
                router.push('/user');
                return;
            }

            setUser(session.user);
            const cachedProfile = readProfileCache(session.user.id);
            if (cachedProfile) {
                setNickname(cachedProfile.nickname || '');
                setOriginalNickname(cachedProfile.nickname || '');
                setAvatarUrl(cachedProfile.avatar_url || null);
            }

            await ensureUserRecord(session.user, session.access_token);
            const profile = await getUserProfile(session.user.id);
            if (profile) {
                setNickname(profile.nickname || '');
                setOriginalNickname(profile.nickname || '');
                setAvatarUrl(profile.avatar_url || null);
                writeProfileCache(session.user.id, profile.nickname || null, profile.avatar_url || null);
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
            writeProfileCache(user.id, nickname.trim(), avatarUrl);
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
            const uploadResult = await uploadAvatarForCurrentUser(user.id, file);
            if (!uploadResult.success || !uploadResult.publicUrl) {
                throw new Error(uploadResult.error?.message || '头像上传失败');
            }
            const publicUrl = uploadResult.publicUrl;

            setAvatarUrl(publicUrl);
            writeProfileCache(user.id, nickname || null, publicUrl);
            setSuccess('头像已更新');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            console.error('Avatar upload error:', err);
            setError('头像上传失败，请重试');
        } finally {
            setUploadingAvatar(false);
        }
    };

    const hasNicknameChanges = nickname !== originalNickname;
    const displayEmail = getUserEmailDisplay(user);

    if (loading) {
        return (
            <div className="min-h-screen bg-background text-foreground">
                <div className="max-w-2xl mx-auto px-4 py-8">
                    {/* 标题骨架 */}
                    <div className="mb-8">
                        <div className="h-7 w-24 rounded bg-gray-200 animate-pulse" />
                        <div className="h-4 w-40 rounded bg-gray-200 animate-pulse mt-2" />
                    </div>
                    {/* 头像骨架 */}
                    <div className="flex justify-center mb-8">
                        <div className="w-24 h-24 rounded-full bg-gray-200 animate-pulse" />
                    </div>
                    {/* 表单骨架 */}
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <div className="h-4 w-12 rounded bg-gray-200 animate-pulse" />
                            <div className="h-11 w-full rounded-md bg-gray-200 animate-pulse" />
                        </div>
                        <div className="space-y-2">
                            <div className="h-4 w-12 rounded bg-gray-200 animate-pulse" />
                            <div className="h-11 w-full rounded-md bg-gray-200 animate-pulse" />
                        </div>
                        <div className="space-y-2">
                            <div className="h-4 w-12 rounded bg-gray-200 animate-pulse" />
                            <div className="h-11 w-full rounded-md bg-gray-200 animate-pulse" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-2xl mx-auto px-4 py-8 animate-fade-in text-foreground space-y-10">
                {/* 标题 */}
                <header className="space-y-1">
                    <h1 className="text-2xl font-bold">个人资料</h1>
                    <p className="text-sm text-foreground/50">管理您的账户信息与公开偏好</p>
                </header>

                <StatusBanner error={error} success={success} />

                <div className="space-y-8">
                    {/* 头像区域 */}
                    <section className="space-y-4">
                        <h2 className="text-[11px] font-semibold text-foreground/40 uppercase tracking-widest px-1">头像设置</h2>
                        <div className="bg-background border border-gray-200 rounded-md p-6 flex flex-col items-center gap-4">
                            <div className="relative group">
                                <div className="w-24 h-24 rounded-full overflow-hidden bg-[#efedea] border border-gray-100">
                                    {avatarUrl ? (
                                        <Image
                                            src={avatarUrl}
                                            alt="Avatar"
                                            width={96}
                                            height={96}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-foreground/20">
                                            <UserIcon className="w-10 h-10" />
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={handleAvatarClick}
                                    className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-full transition-opacity"
                                >
                                    <Camera className="w-6 h-6" />
                                </button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleAvatarChange}
                                    className="hidden"
                                    accept="image/*"
                                />
                            </div>
                            <div className="text-center">
                                <p className="text-xs text-foreground/40">推荐使用 256x256px 以上的图片</p>
                                {uploadingAvatar && <p className="text-xs text-[#2eaadc] mt-1 animate-pulse">上传中...</p>}
                            </div>
                        </div>
                    </section>

                    {/* 基本信息 */}
                    <section className="space-y-4">
                        <h2 className="text-[11px] font-semibold text-foreground/40 uppercase tracking-widest px-1">基本信息</h2>
                        <div className="bg-background border border-gray-200 rounded-md overflow-hidden divide-y divide-gray-100">
                            {/* 昵称 */}
                            <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="space-y-0.5">
                                    <p className="text-sm font-medium">显示昵称</p>
                                    <p className="text-xs text-foreground/40">公开显示的名称</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={nickname}
                                        onChange={(e) => setNickname(e.target.value)}
                                        className="px-3 py-1.5 bg-[#efedea] rounded-md text-sm border-none focus:outline-none w-48"
                                    />
                                    {hasNicknameChanges && (
                                        <button
                                            onClick={handleSave}
                                            disabled={saving}
                                            className="px-3 py-1.5 bg-[#2383e2] text-white text-xs font-medium rounded-md hover:bg-[#2383e2]/90 transition-colors disabled:opacity-50"
                                        >
                                            {saving ? '保存中...' : '保存'}
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* 邮箱 */}
                            <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="space-y-0.5">
                                    <p className="text-sm font-medium">电子邮箱</p>
                                    <p className="text-xs text-foreground/40">用于账户登录与重要通知</p>
                                </div>
                                <div className="px-3 py-1.5 bg-[#efedea]/50 rounded-md text-sm text-foreground/40 font-mono">
                                    {displayEmail}
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* 账号安全 */}
                    <section className="space-y-4">
                        <h2 className="text-[11px] font-semibold text-foreground/40 uppercase tracking-widest px-1">安全设置</h2>
                        <div className="bg-background border border-gray-200 rounded-md p-4">
                            <div className="mb-4 space-y-0.5">
                                <p className="text-sm font-medium">重置密码</p>
                                <p className="text-xs text-foreground/40">定期更新密码以保障账户安全</p>
                            </div>
                            <PasswordSection email={user?.email || ''} />
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
