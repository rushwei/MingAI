'use client';

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSessionSafe } from '@/components/providers/ClientProviders';
import { EMPTY_APP_BOOTSTRAP, loadAppBootstrap } from '@/lib/app/bootstrap';
import { queryKeys } from '@/lib/query/keys';

export function useAppBootstrap(options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true;
  const queryClient = useQueryClient();
  const { user, loading: sessionLoading } = useSessionSafe();
  const queryKey = queryKeys.appBootstrap(user?.id ?? null);
  const cachedData = queryClient.getQueryData<typeof EMPTY_APP_BOOTSTRAP>(queryKey);

  const query = useQuery({
    queryKey,
    queryFn: loadAppBootstrap,
    enabled: enabled && !sessionLoading,
    staleTime: 30_000,
    ...(cachedData ? { initialData: cachedData } : {}),
  });

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.appBootstrapPrefix() });
  }, [queryClient]);

  const markCreditsExhausted = useCallback(() => {
    queryClient.setQueryData(queryKey, (previous: typeof EMPTY_APP_BOOTSTRAP | undefined) => ({
      ...(previous ?? EMPTY_APP_BOOTSTRAP),
      membership: previous?.membership
        ? {
          ...previous.membership,
          aiChatCount: 0,
        }
        : previous?.membership ?? null,
      viewerSummary: previous?.viewerSummary
        ? {
          ...previous.viewerSummary,
          aiChatCount: 0,
        }
        : previous?.viewerSummary ?? null,
    }));
  }, [queryClient, queryKey]);

  return {
    ...query,
    data: query.data ?? EMPTY_APP_BOOTSTRAP,
    refresh,
    markCreditsExhausted,
  };
}
