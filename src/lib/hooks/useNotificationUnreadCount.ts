'use client';

import { useQuery } from '@tanstack/react-query';
import { getUnreadCount } from '@/lib/notification';
import { useAppBootstrap } from '@/lib/hooks/useAppBootstrap';
import { queryKeys } from '@/lib/query/keys';

type UseNotificationUnreadCountOptions = {
  enabled?: boolean;
};

export function useNotificationUnreadCount(
  userId: string | null,
  options: UseNotificationUnreadCountOptions = {},
) {
  const enabled = options.enabled ?? true;
  const bootstrap = useAppBootstrap({ enabled });
  const bootstrapUnreadCount = userId && bootstrap.data.viewerLoaded
    ? bootstrap.data.unreadCount
    : 0;

  const query = useQuery({
    queryKey: queryKeys.notificationsUnread(userId),
    queryFn: () => getUnreadCount(userId ?? ''),
    enabled: enabled && !!userId,
    staleTime: 5_000,
    refetchOnWindowFocus: true,
    refetchInterval: userId ? 30_000 : false,
    refetchIntervalInBackground: false,
  });

  return enabled && userId ? (query.data ?? bootstrapUnreadCount) : 0;
}
