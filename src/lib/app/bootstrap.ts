import { requestBrowserJson } from '@/lib/browser-api';
import type { MembershipInfo, MembershipType } from '@/lib/user/membership';

export type AppBootstrapViewerSummary = {
  userId: string;
  nickname: string | null;
  avatarUrl: string | null;
  isAdmin: boolean;
  membershipType: MembershipType | null;
  membershipExpiresAt: string | null;
  aiChatCount: number | null;
};

export type AppBootstrapData = {
  viewerLoaded: boolean;
  viewerSummary: AppBootstrapViewerSummary | null;
  membership: MembershipInfo | null;
  featureToggles: Record<string, boolean>;
  featureTogglesLoaded: boolean;
  unreadCount: number;
};

export const EMPTY_APP_BOOTSTRAP: AppBootstrapData = {
  viewerLoaded: false,
  viewerSummary: null,
  membership: null,
  featureToggles: {},
  featureTogglesLoaded: false,
  unreadCount: 0,
};

export async function loadAppBootstrap(): Promise<AppBootstrapData> {
  const result = await requestBrowserJson<AppBootstrapData>('/api/app/bootstrap', {
    method: 'GET',
  });

  if (result.error) {
    throw new Error(result.error.message || '加载应用缓存引导数据失败');
  }

  if (!result.data) {
    throw new Error('应用缓存引导数据缺失');
  }

  if (result.data.featureTogglesLoaded !== true) {
    throw new Error('功能状态加载失败');
  }

  return {
    viewerLoaded: result.data.viewerLoaded === true,
    viewerSummary: result.data.viewerSummary ?? null,
    membership: result.data.membership ?? null,
    featureToggles: result.data.featureToggles ?? {},
    featureTogglesLoaded: result.data.featureTogglesLoaded === true,
    unreadCount: result.data.unreadCount ?? 0,
  };
}
