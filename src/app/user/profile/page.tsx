'use client';

import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Camera, User as UserIcon } from 'lucide-react';
import { ensureUserRecord, updateNickname } from '@/lib/auth';
import { uploadAvatarForCurrentUser } from '@/lib/user/profile';
import { getUserEmailDisplay } from '@/lib/user-email';
import { useSessionSafe } from '@/components/providers/ClientProviders';
import { SoundWaveLoader } from '@/components/ui/SoundWaveLoader';
import { StatusBanner } from '@/components/profile/StatusBanner';
import { PasswordSection } from '@/components/profile/PasswordSection';
import { SettingsLoginRequired } from '@/components/settings/SettingsLoginRequired';
import { SettingsRouteLauncher } from '@/components/settings/SettingsRouteLauncher';
import { useCurrentUserProfile } from '@/lib/hooks/useCurrentUserProfile';

function Avatar({ src, alt }: { src: string | null; alt: string }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const shouldFallback = !src || failedSrc === src;

  if (shouldFallback) {
    return (
      <div className="flex h-24 w-24 items-center justify-center rounded-full border border-border/60 bg-background-secondary text-foreground/20">
        <UserIcon className="h-10 w-10" />
      </div>
    );
  }

  return (
    <div className="h-24 w-24 overflow-hidden rounded-full border border-border/60 bg-background-secondary">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="h-full w-full object-cover"
        onError={() => setFailedSrc(src)}
      />
    </div>
  );
}

function ProfileContent({ embedded = false }: { embedded?: boolean }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ensuredUserIdRef = useRef<string | null>(null);
  const { user, loading: sessionLoading } = useSessionSafe();
  const { profile, loading: profileLoading, resolved: profileResolved, error: profileError, refresh: refreshProfile } = useCurrentUserProfile({ enabled: !!user });
  const [nickname, setNickname] = useState('');
  const [originalNickname, setOriginalNickname] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (sessionLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    if (profileLoading) {
      return;
    }

    if (profile) {
      ensuredUserIdRef.current = null;
      setNickname(profile.nickname || '');
      setOriginalNickname(profile.nickname || '');
      setAvatarUrl(profile.avatar_url || null);
      setError('');
      setLoading(false);
      return;
    }

    setLoading(false);
    if (profileError) {
      setError(profileError.message || '加载个人资料失败');
      return;
    }
    if (!profileResolved) {
      return;
    }
    if (ensuredUserIdRef.current === user.id) {
      return;
    }
    ensuredUserIdRef.current = user.id;
    void ensureUserRecord(user).then(() => refreshProfile());
  }, [profile, profileError, profileLoading, profileResolved, refreshProfile, sessionLoading, user]);

  const handleSave = async () => {
    if (!user || !nickname.trim()) return;

    setSaving(true);
    setError('');
    setSuccess('');

    const result = await updateNickname(user.id, nickname.trim());
    if (result.success) {
      setOriginalNickname(nickname.trim());
      setSuccess('昵称已更新');
      window.setTimeout(() => setSuccess(''), 3000);
    } else {
      setError(result.error?.message || '保存失败');
    }

    setSaving(false);
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

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

      setAvatarUrl(uploadResult.publicUrl);
      setSuccess('头像已更新');
      window.setTimeout(() => setSuccess(''), 3000);
    } catch (uploadError) {
      console.error('Avatar upload error:', uploadError);
      setError('头像上传失败，请重试');
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (loading || sessionLoading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center rounded-lg border border-border bg-background">
        <SoundWaveLoader variant="inline" />
      </div>
    );
  }

  if (!user) {
    return <SettingsLoginRequired title="请先登录后查看个人资料" />;
  }

  const hasNicknameChanges = nickname !== originalNickname;
  const displayEmail = getUserEmailDisplay(user);

  return (
    <div className={embedded ? 'space-y-8' : 'mx-auto max-w-3xl space-y-8 px-4 py-6'}>
      <StatusBanner error={error} success={success} />

      <section className="space-y-3">
        <h2 className="px-1 text-xs font-semibold uppercase tracking-wider text-foreground/50">头像设置</h2>
        <div className="rounded-md border border-border bg-background p-6">
          <div className="flex flex-col items-center gap-4">
            <div className="group relative">
              <Avatar src={avatarUrl} alt={nickname || 'avatar'} />
              <button
                type="button"
                onClick={handleAvatarClick}
                className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100"
              >
                <Camera className="h-6 w-6" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>

            <div className="text-center">
              <p className="text-xs text-foreground-secondary">推荐使用 256x256px 以上的图片</p>
              {uploadingAvatar ? <p className="mt-1 text-xs text-accent">上传中...</p> : null}
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="px-1 text-xs font-semibold uppercase tracking-wider text-foreground/50">基本信息</h2>
        <div className="overflow-hidden rounded-md border border-border bg-background divide-y divide-border/60">
          <div className="flex flex-col justify-between gap-4 p-4 sm:flex-row sm:items-center">
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-foreground">显示昵称</p>
              <p className="text-xs text-foreground-secondary">公开显示的名称</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
                className="w-48 rounded-md border border-border bg-background-secondary px-3 py-2 text-sm outline-none transition-colors duration-150 focus:ring-2 focus:ring-blue-500/30"
              />
              {hasNicknameChanges ? (
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-md border border-border bg-transparent px-3 py-2 text-xs font-medium text-foreground transition-colors duration-150 hover:bg-[#efedea] active:bg-[#e3e1db] disabled:opacity-50 dark:hover:bg-background-secondary dark:active:bg-background-tertiary"
                >
                  {saving ? '保存中...' : '保存'}
                </button>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col justify-between gap-4 p-4 sm:flex-row sm:items-center">
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-foreground">电子邮箱</p>
              <p className="text-xs text-foreground-secondary">用于账户登录与重要通知</p>
            </div>
            <div className="rounded-md bg-background-secondary/50 px-3 py-2 font-mono text-sm text-foreground/50">
              {displayEmail}
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="px-1 text-xs font-semibold uppercase tracking-wider text-foreground/50">安全设置</h2>
        <div className="rounded-md border border-border bg-background p-4">
          <div className="mb-4 space-y-0.5">
            <p className="text-sm font-medium text-foreground">重置密码</p>
            <p className="text-xs text-foreground-secondary">定期更新密码以保障账户安全</p>
          </div>
          <PasswordSection email={user.email || ''} />
        </div>
      </section>
    </div>
  );
}

function ProfilePage() {
  return <SettingsRouteLauncher tab="profile" />;
}

const ProfilePageEntry = Object.assign(ProfilePage, { Content: ProfileContent });

export default ProfilePageEntry;
