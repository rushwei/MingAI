import { getSystemAdminClient } from '@/lib/api-utils';
import type { Notification } from '@/lib/notification';

const NOTIFICATION_RETENTION_DAYS = 3;
const NOTIFICATION_RETENTION_MS = NOTIFICATION_RETENTION_DAYS * 24 * 60 * 60 * 1000;

export function getNotificationRetentionCutoffIso(now: Date = new Date()) {
    return new Date(now.getTime() - NOTIFICATION_RETENTION_MS).toISOString();
}

export async function pruneExpiredNotifications(options: { userId?: string } = {}) {
    const serviceClient = getSystemAdminClient();
    const cutoffIso = getNotificationRetentionCutoffIso();

    let deleteQuery = serviceClient
        .from('notifications')
        .delete()
        .lt('created_at', cutoffIso);

    if (options.userId) {
        deleteQuery = deleteQuery.eq('user_id', options.userId);
    }

    const { data, error } = await deleteQuery.select('id');
    if (error) {
        console.error('清理过期通知失败:', error);
        return 0;
    }

    return Array.isArray(data) ? data.length : 0;
}

export async function createNotification(
    userId: string,
    type: Notification['type'],
    title: string,
    content?: string,
    link?: string,
): Promise<boolean> {
    const serviceClient = getSystemAdminClient();
    const { error } = await serviceClient
        .from('notifications')
        .insert({
            user_id: userId,
            type,
            title,
            content,
            link,
        });

    if (error) {
        console.error('创建通知失败:', error);
        return false;
    }

    return true;
}
