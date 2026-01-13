/**
 * 个人资料编辑页面
 * 支持：昵称修改、头像上传、密码修改
 */
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
    Loader2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { ensureUserRecord, getUserProfile, updateNickname } from '@/lib/auth';
import type { User } from '@supabase/supabase-js';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { AvatarSection } from '@/components/profile/AvatarSection';
import { StatusBanner } from '@/components/profile/StatusBanner';
import { NicknameField } from '@/components/profile/NicknameField';
import { EmailSection } from '@/components/profile/EmailSection';
import { PasswordSection } from '@/components/profile/PasswordSection';
import { CreatedAtField } from '@/components/profile/CreatedAtField';

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
        if (typeof window === 'undefined') return null;
        const raw = window.localStorage.getItem(`mingai.profile.${userId}`);
        if (!raw) return null;
        try {
            return JSON.parse(raw) as { nickname: string | null; avatar_url: string | null };
        } catch {
            return null;
        }
    };

    const writeProfileCache = (userId: string, nicknameValue: string | null, avatarValue: string | null) => {
        if (typeof window === 'undefined') return;
        const payload = { nickname: nicknameValue, avatar_url: avatarValue };
        window.localStorage.setItem(`mingai.profile.${userId}`, JSON.stringify(payload));
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

            await ensureUserRecord(session.user);
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
            supabase.auth.updateUser({ data: { nickname: nickname.trim() } }).catch(() => {
                // 更新失败不影响页面展示
            });
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
            writeProfileCache(user.id, nickname || null, publicUrl);
            supabase.auth.updateUser({ data: { avatar_url: publicUrl } }).catch(() => {
                // 更新失败不影响页面展示
            });
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

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto px-4 py-8 animate-fade-in">
            <ProfileHeader onBack={() => router.push('/user')} />

            <AvatarSection
                fileInputRef={fileInputRef}
                avatarUrl={avatarUrl}
                uploadingAvatar={uploadingAvatar}
                onAvatarClick={handleAvatarClick}
                onAvatarChange={handleAvatarChange}
            />

            {/* 表单 */}
            <div className="space-y-6">
                <StatusBanner error={error} success={success} />

                <NicknameField
                    nickname={nickname}
                    onChange={setNickname}
                    hasChanges={hasNicknameChanges}
                    onSave={handleSave}
                    saving={saving}
                />

                <EmailSection currentEmail={user?.email || ''} />

                <PasswordSection email={user?.email || ''} />

                <CreatedAtField createdAt={user?.created_at || null} />
            </div>
        </div>
    );
}
