/**
 * 通知服务
 * 
 * 提供站内通知和功能订阅的管理
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
                if (!msg.includes('登录') && !msg.includes('认证')) {
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

/**
 * 功能名称映射
 */
export const FEATURE_NAMES: Record<string, string> = {
    liuyao: '六爻占卜',
    tarot: '塔罗占卜',
    face: '面相分析',
    palm: '手相分析',
    qimen: '奇门遁甲',
};

/**
 * 通知模板
 */
export interface NotificationTemplate {
    id: string;
    name: string;
    type: Notification['type'];
    title: string;
    content: string;
    linkPlaceholder?: string;
}

export const NOTIFICATION_TEMPLATES: NotificationTemplate[] = [
    // 功能上线模板
    {
        id: 'feature_launch_new',
        name: '新功能上线',
        type: 'feature_launch',
        title: '🎉 新功能上线：{{feature_name}}',
        content: '{{feature_name}}功能现已上线！立即体验全新功能，探索更多可能。',
        linkPlaceholder: '/feature-url',
    },
    {
        id: 'feature_launch_upgrade',
        name: '功能升级',
        type: 'feature_launch',
        title: '✨ 功能升级：{{feature_name}}',
        content: '{{feature_name}}功能已全面升级，新增多项实用功能，快来体验吧！',
        linkPlaceholder: '/feature-url',
    },
    // 系统通知模板
    {
        id: 'system_maintenance',
        name: '系统维护',
        type: 'system',
        title: '🔧 系统维护通知',
        content: '系统将于 {{time}} 进行维护升级，预计持续 {{duration}}，届时服务可能短暂不可用，敬请谅解。',
    },
    {
        id: 'system_update',
        name: '系统更新',
        type: 'system',
        title: '📢 系统更新公告',
        content: '系统已完成更新，新增以下功能：{{features}}。感谢您的支持！',
    },
    {
        id: 'system_welcome',
        name: '欢迎新用户',
        type: 'system',
        title: '🎊 欢迎加入 MingAI',
        content: '感谢您注册 MingAI！开始您的命理探索之旅吧。如有问题，欢迎联系我们。',
        linkPlaceholder: '/help',
    },
    // 促销活动模板
    {
        id: 'promo_discount',
        name: '限时优惠',
        type: 'promotion',
        title: '🔥 限时优惠：{{discount}}',
        content: '限时特惠！{{description}}，活动截止至 {{end_date}}，抓紧时间！',
        linkPlaceholder: '/user/upgrade',
    },
    {
        id: 'promo_vip',
        name: '会员推荐',
        type: 'promotion',
        title: '👑 升级 VIP 专享特权',
        content: '升级 VIP 会员，解锁无限 AI 对话、专属分析等更多特权功能！',
        linkPlaceholder: '/user/upgrade',
    },
    {
        id: 'promo_event',
        name: '节日活动',
        type: 'promotion',
        title: '🎁 {{holiday}} 特别活动',
        content: '{{holiday}}来临！参与活动即可获得{{reward}}，快来参加吧！',
        linkPlaceholder: '/event',
    },
];

/**
 * 根据模板ID获取模板
 */
export function getNotificationTemplate(templateId: string): NotificationTemplate | undefined {
    return NOTIFICATION_TEMPLATES.find(t => t.id === templateId);
}

/**
 * 替换模板中的占位符
 */
export function fillTemplate(
    template: NotificationTemplate,
    variables: Record<string, string>
): { title: string; content: string } {
    let title = template.title;
    let content = template.content;

    for (const [key, value] of Object.entries(variables)) {
        const placeholder = `{{${key}}}`;
        title = title.split(placeholder).join(value);
        content = content.split(placeholder).join(value);
    }

    return { title, content };
}
