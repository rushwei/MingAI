import { getSystemAdminClient } from '@/lib/api-utils';
import type { Notification } from '@/lib/notification';

export async function createNotification(
    userId: string,
    type: Notification['type'],
    title: string,
    content?: string,
    link?: string
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
