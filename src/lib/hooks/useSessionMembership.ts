'use client';

import { useCallback } from 'react';
import { useSessionSafe } from '@/components/providers/ClientProviders';
import { useAppBootstrap } from '@/lib/hooks/useAppBootstrap';

export function useSessionMembership() {
  const { session, user, loading: sessionLoading } = useSessionSafe();
  const bootstrap = useAppBootstrap();
  const membershipResolved = !user || bootstrap.data.viewerLoaded;

  const refreshMembership = useCallback(async (userId?: string | null) => {
    void userId;
    await bootstrap.refresh();
    return bootstrap.data.membership;
  }, [bootstrap]);

  return {
    session,
    user,
    userId: user?.id ?? null,
    sessionLoading,
    membershipInfo: bootstrap.data.membership,
    membershipLoading: sessionLoading || bootstrap.isLoading,
    membershipResolved,
    membershipError: bootstrap.error instanceof Error ? bootstrap.error : null,
    refreshMembership,
  };
}
