/**
 * 通知服务
 *
 * 提供站内通知读取、未读状态同步与公告模板管理
 */

import { createMemoryCache, createSingleFlight } from '@/lib/cache';
import { requestBrowserJson } from '@/lib/browser-api';

const UNREAD_CACHE_TTL_MS = 2_000;
const unreadCountCache = createMemoryCache<number>(UNREAD_CACHE_TTL_MS);
const unreadCountSingleFlight = createSingleFlight<number>();
const invalidateUnreadCountCache = () => {
    unreadCountCache.clear();
    unreadCountSingleFlight.clear();
};

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

/**
 * 获取未读通知数量
 */
export async function getUnreadCount(
    userId: string,
    options: UnreadCountOptions = {}
): Promise<number> {
    if (!userId) return 0;
    if (!options.bypassCache) {
        const cached = unreadCountCache.get(userId);
        if (cached !== null) return cached;
    }
    return await unreadCountSingleFlight.run(userId, async () => {
            const result = await requestBrowserJson<{ count?: number }>('/api/notifications?count=1&unread=1', {
                method: 'GET',
            });

            if (result.error) {
                // 认证相关错误（session 未就绪或过期）静默处理，避免控制台噪音
                const msg = result.error.message ?? '';
                if (!msg.includes('登录') && !msg.includes('认证') && msg !== '获取通知失败') {
                    console.error('获取未读数量失败:', msg);
                }
                return 0;
            }

            return result.count ?? result.data?.count ?? 0;
        }).then((value) => {
            unreadCountCache.set(userId, value);
            return value;
        });
}

/**
 * 获取通知列表
 */
export async function getNotifications(
    userId: string,
    limit: number = 20
): Promise<Notification[]> {
    void userId;

    const result = await requestBrowserJson<{ notifications?: Notification[] }>(`/api/notifications?limit=${limit}`, {
        method: 'GET',
    });

    if (result.error) {
        console.error('获取通知列表失败:', result.error.message);
        return [];
    }

    return result.data?.notifications ?? [];
}

/**
 * 标记单条通知为已读
 */
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

    invalidateUnreadCountCache();
    return true;
}

/**
 * 标记所有通知为已读
 */
export async function markAllAsRead(userId: string): Promise<boolean> {
    void userId;

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

    invalidateUnreadCountCache();
    return true;
}

/**
 * 批量标记通知为已读
 */
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

    invalidateUnreadCountCache();
    return true;
}

/**
 * 删除单条通知
 */
export async function deleteNotification(notificationId: string): Promise<boolean> {
    const result = await requestBrowserJson<{ success?: boolean }>(`/api/notifications?id=${notificationId}`, {
        method: 'DELETE',
    });

    if (result.error) {
        console.error('删除通知失败:', result.error.message);
        return false;
    }

    invalidateUnreadCountCache();
    return true;
}

/**
 * 批量删除通知
 */
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

    invalidateUnreadCountCache();
    return true;
}
