/**
 * 通知服务
 *
 * 浏览器侧仅保留纯 fetcher；缓存由 TanStack Query 统一管理。
 */

import { requestBrowserPayloadOrThrow, requestBrowserJson } from '@/lib/browser-api';

export type UnreadCountOptions = {
  bypassCache?: boolean;
};

export interface Notification {
  id: string;
  user_id: string;
  type: 'feature_launch' | 'system' | 'promotion';
  title: string;
  content: string | null;
  is_read: boolean;
  link: string | null;
  created_at: string;
}

export interface NotificationPagination {
  hasMore: boolean;
  nextOffset: number | null;
}

export interface NotificationPageResult {
  notifications: Notification[];
  pagination: NotificationPagination;
}

async function requestNotificationJson<T>(
  url: string,
  init: RequestInit,
  fallbackMessage: string,
) {
  return await requestBrowserPayloadOrThrow<T>(url, init, fallbackMessage);
}

export async function getUnreadCount(
  userId: string,
  options: UnreadCountOptions = {},
): Promise<number> {
  void options;
  if (!userId) return 0;

  const result = await requestNotificationJson<{ count?: number }>(
    '/api/notifications?count=1&unread=1',
    { method: 'GET' },
    '获取未读数量失败',
  );

  return result.count ?? result.data?.count ?? 0;
}

export async function getNotifications(
  userId: string,
  limit: number = 20,
): Promise<Notification[]> {
  const page = await getNotificationsPage(userId, { limit });
  return page.notifications;
}

export async function getNotificationsPage(
  userId: string,
  options: {
    limit?: number;
    offset?: number;
  } = {},
): Promise<NotificationPageResult> {
  void userId;
  const limit = options.limit ?? 20;
  const offset = options.offset ?? 0;

  const result = await requestNotificationJson<{
    notifications?: Notification[];
    pagination?: NotificationPagination;
  }>(
    `/api/notifications?limit=${limit}&offset=${offset}`,
    { method: 'GET' },
    '获取通知列表失败',
  );

  return {
    notifications: result.data?.notifications ?? [],
    pagination: result.data?.pagination ?? {
      hasMore: false,
      nextOffset: null,
    },
  };
}

export async function markAsRead(notificationId: string): Promise<boolean> {
  const result = await requestBrowserJson<{ success?: boolean }>('/api/notifications', {
    method: 'PATCH',
    body: JSON.stringify({
      action: 'mark-one',
      id: notificationId,
    }),
  });

  if (result.error) {
    console.error('标记已读失败:', result.error.message);
    return false;
  }

  return true;
}

export async function markAllAsRead(): Promise<boolean> {
  const result = await requestBrowserJson<{ success?: boolean }>('/api/notifications', {
    method: 'PATCH',
    body: JSON.stringify({
      action: 'mark-all',
    }),
  });

  if (result.error) {
    console.error('标记全部已读失败:', result.error.message);
    return false;
  }

  return true;
}

export async function markSelectedAsRead(notificationIds: string[]): Promise<boolean> {
  if (notificationIds.length === 0) return true;

  const result = await requestBrowserJson<{ success?: boolean }>('/api/notifications', {
    method: 'PATCH',
    body: JSON.stringify({
      action: 'mark-selected',
      ids: notificationIds,
    }),
  });

  if (result.error) {
    console.error('批量标记已读失败:', result.error.message);
    return false;
  }

  return true;
}

export async function deleteNotification(notificationId: string): Promise<boolean> {
  const result = await requestBrowserJson<{ success?: boolean }>(`/api/notifications?id=${notificationId}`, {
    method: 'DELETE',
  });

  if (result.error) {
    console.error('删除通知失败:', result.error.message);
    return false;
  }

  return true;
}

export async function deleteNotifications(notificationIds: string[]): Promise<boolean> {
  if (notificationIds.length === 0) return true;

  const query = new URLSearchParams();
  for (const id of notificationIds) {
    query.append('id', id);
  }

  const result = await requestBrowserJson<{ success?: boolean }>(`/api/notifications?${query.toString()}`, {
    method: 'DELETE',
  });

  if (result.error) {
    console.error('批量删除通知失败:', result.error.message);
    return false;
  }

  return true;
}
