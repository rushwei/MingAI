import type { MembershipType } from '@/lib/user/membership';
import { dispatchUserDataInvalidate, type UserSettingsSnapshot } from '@/lib/user/settings';
import { normalizeBrowserApiError, requestBrowserJson } from '@/lib/browser-api';

export type UserProfile = {
  id: string;
  nickname: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  membership: MembershipType | null;
  membership_expires_at: string | null;
  ai_chat_count: number | null;
  last_credit_restore_at: string | null;
};

export type UserProfileBundle = {
  profile: UserProfile | null;
  settings: UserSettingsSnapshot | null;
};

export type ProfileUpdateInput = {
  profile?: {
    nickname?: string;
    avatar_url?: string | null;
  };
};

export type ProfileUpdateResult = {
  success: boolean;
  profile: UserProfile | null;
  settings: UserSettingsSnapshot | null;
  error?: { message: string; code?: string };
};

function toProfileUpdateResult(result: Awaited<ReturnType<typeof requestBrowserJson<UserProfileBundle>>>): ProfileUpdateResult {
  if (result.error) {
    return {
      success: false,
      profile: null,
      settings: null,
      error: {
        message: result.error.message || '更新用户资料失败',
        code: result.error.code,
      },
    };
  }

  return {
    success: true,
    profile: result.data?.profile ?? null,
    settings: result.data?.settings ?? null,
  };
}

export async function getCurrentUserProfileBundle(): Promise<UserProfileBundle | null> {
  const result = await requestBrowserJson<UserProfileBundle>('/api/user/profile', {
    method: 'GET',
  });

  if (result.error) {
    console.error('[user-profile] failed to load current user profile:', result.error.message);
    return null;
  }

  return result.data ?? null;
}

export async function getCurrentUserProfile(userId?: string): Promise<UserProfile | null> {
  const bundle = await getCurrentUserProfileBundle();
  const profile = bundle?.profile ?? null;

  if (!profile) return null;
  if (userId && profile.id !== userId) return null;
  return profile;
}

export async function updateCurrentUserProfile(input: ProfileUpdateInput): Promise<ProfileUpdateResult> {
  const payload: ProfileUpdateInput = {};

  if (input.profile) {
    payload.profile = {};
    if (typeof input.profile.nickname === 'string') {
      payload.profile.nickname = input.profile.nickname.trim();
    }
    if (typeof input.profile.avatar_url === 'string' || input.profile.avatar_url === null) {
      payload.profile.avatar_url = input.profile.avatar_url;
    }
  }

  const result = await requestBrowserJson<UserProfileBundle>('/api/user/profile', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

  const normalized = toProfileUpdateResult(result);
  if (normalized.success) {
    dispatchUserDataInvalidate('/api/user/profile');
  }

  return normalized;
}

export async function updateAvatarUrl(avatarUrl: string | null) {
  return updateCurrentUserProfile({
    profile: {
      avatar_url: avatarUrl,
    },
  });
}

export async function updateNickname(nickname: string) {
  return updateCurrentUserProfile({
    profile: {
      nickname,
    },
  });
}

export async function uploadAvatarForCurrentUser(userId: string, file: File | Blob): Promise<{
  success: boolean;
  publicUrl: string | null;
  error?: { message: string; code?: string };
}> {
  const formData = new FormData();
  const extension = file instanceof File && file.name.includes('.')
    ? file.name.split('.').pop()
    : 'png';
  const path = `${userId}-${Date.now()}.${extension}`;

  formData.append('file', file);
  formData.append('bucket', 'avatars');
  formData.append('path', path);
  formData.append('upsert', 'true');

  const uploadResult = await fetch('/api/supabase/storage', {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  const uploadPayload = await uploadResult.json().catch(() => null) as {
    data?: { publicUrl?: string | null } | null;
    error?: unknown;
  } | null;

  const uploadError = !uploadResult.ok
    ? normalizeBrowserApiError(uploadPayload?.error ?? null)
    : null;

  const publicUrl = uploadPayload?.data?.publicUrl ?? null;
  if (uploadError || !publicUrl) {
    return {
      success: false,
      publicUrl: null,
      error: uploadError || { message: '头像上传失败' },
    };
  }

  const profileUpdate = await updateAvatarUrl(publicUrl);
  if (!profileUpdate.success) {
    return {
      success: false,
      publicUrl: null,
      error: profileUpdate.error || { message: '头像保存失败' },
    };
  }

  return {
    success: true,
    publicUrl,
  };
}
