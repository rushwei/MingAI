'use client';

import { supabase } from '@/lib/auth';
import { requestBrowserJson } from '@/lib/browser-api';

export interface CheckinStatus {
  canCheckin: boolean;
  lastCheckin: string | null;
  todayCheckedIn: boolean;
  rewardRange: [number, number];
  currentCredits: number;
  creditLimit: number;
  blockedReason: 'already_checked_in' | 'credit_cap_reached' | null;
}

export interface CheckinActionResult {
  ok: boolean;
  rewardCredits: number;
  credits?: number;
  creditLimit?: number;
  blockedReason?: 'already_checked_in' | 'credit_cap_reached';
  message?: string;
}

async function getAccessToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

export async function fetchCheckinStatus(): Promise<CheckinStatus | null> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return null;
  }

  const result = await requestBrowserJson<{ status?: CheckinStatus }>('/api/checkin?action=status', {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (result.error || !result.data?.status) {
    return null;
  }

  return result.data.status;
}

export async function performCheckinAction(): Promise<CheckinActionResult> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return {
      ok: false,
      rewardCredits: 0,
      message: '请先登录',
    };
  }

  const result = await requestBrowserJson<{
    result?: {
      rewardCredits: number;
      credits?: number;
      creditLimit?: number;
      blockedReason?: 'already_checked_in' | 'credit_cap_reached';
    };
  }>('/api/checkin', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const checkinResult = result.data?.result;

  if (result.error || !checkinResult) {
    return {
      ok: false,
      rewardCredits: 0,
      credits: checkinResult?.credits,
      creditLimit: checkinResult?.creditLimit,
      blockedReason: checkinResult?.blockedReason,
      message: result.error?.message || '签到失败',
    };
  }

  return {
    ok: true,
    rewardCredits: checkinResult.rewardCredits,
    credits: checkinResult.credits,
    creditLimit: checkinResult.creditLimit,
  };
}
