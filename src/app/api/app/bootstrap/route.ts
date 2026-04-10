import { NextRequest } from 'next/server';
import { getAuthContext, jsonOk } from '@/lib/api-utils';
import { readFeatureTogglesState } from '@/lib/app-settings';
import { getNotificationRetentionCutoffIso } from '@/lib/notification-server';
import { buildMembershipInfo, type MembershipInfo, type MembershipInfoSource } from '@/lib/user/membership';
import type { AppBootstrapData, AppBootstrapViewerSummary } from '@/lib/app/bootstrap';

type UserRow = {
  id: string;
  nickname: string | null;
  avatar_url: string | null;
  is_admin: boolean | null;
  membership: MembershipInfoSource['membership'];
  membership_expires_at: string | null;
  ai_chat_count: number | null;
};

function buildFallbackViewerSummary(user: {
  id: string;
  user_metadata?: Record<string, unknown>;
}): AppBootstrapViewerSummary {
  return {
    userId: user.id,
    nickname: typeof user.user_metadata?.nickname === 'string' ? user.user_metadata.nickname : null,
    avatarUrl: typeof user.user_metadata?.avatar_url === 'string' ? user.user_metadata.avatar_url : null,
    isAdmin: false,
    membershipType: 'free',
    membershipExpiresAt: null,
    aiChatCount: 1,
  };
}

function buildViewerSummary(row: UserRow, membership: MembershipInfo): AppBootstrapViewerSummary {
  return {
    userId: row.id,
    nickname: row.nickname,
    avatarUrl: row.avatar_url,
    isAdmin: !!row.is_admin,
    membershipType: membership.type,
    membershipExpiresAt: membership.expiresAt ? membership.expiresAt.toISOString() : null,
    aiChatCount: membership.aiChatCount,
  };
}

async function loadViewerState(auth: Awaited<ReturnType<typeof getAuthContext>>) {
  if (!auth.user) {
    return {
      viewerLoaded: true,
      viewerSummary: null,
      membership: null,
      unreadCount: 0,
    };
  }

  const [profileResult, unreadResult] = await Promise.all([
    auth.supabase
      .from('users')
      .select('id, nickname, avatar_url, is_admin, membership, membership_expires_at, ai_chat_count')
      .eq('id', auth.user.id)
      .maybeSingle(),
    auth.supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', auth.user.id)
      .gte('created_at', getNotificationRetentionCutoffIso())
      .eq('is_read', false),
  ]);

  if (profileResult.error) {
    return {
      viewerLoaded: false,
      viewerSummary: null,
      membership: null,
      unreadCount: unreadResult.count ?? 0,
    };
  }

  const row = (profileResult.data ?? null) as UserRow | null;
  const membership = row
    ? buildMembershipInfo({
      membership: row.membership,
      membership_expires_at: row.membership_expires_at,
      ai_chat_count: row.ai_chat_count,
    })
    : buildMembershipInfo(null);
  const viewerSummary = row ? buildViewerSummary(row, membership) : buildFallbackViewerSummary(auth.user);

  return {
    viewerLoaded: true,
    viewerSummary,
    membership,
    unreadCount: unreadResult.count ?? 0,
  };
}

export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request);

  const [featureToggleState, viewerState] = await Promise.all([
    readFeatureTogglesState(),
    loadViewerState(auth),
  ]);

  const data: AppBootstrapData = {
    viewerLoaded: viewerState.viewerLoaded,
    viewerSummary: viewerState.viewerSummary,
    membership: viewerState.membership,
    featureToggles: featureToggleState.toggles,
    featureTogglesLoaded: featureToggleState.loaded,
    unreadCount: viewerState.unreadCount,
  };

  return jsonOk({ data });
}
