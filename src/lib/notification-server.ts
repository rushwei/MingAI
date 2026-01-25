import { getServiceRoleClient } from './api-utils';
import type { Notification } from './notification';

export async function createNotification(
    userId: string,
    type: Notification['type'],
    title: string,
    content?: string,
    link?: string
): Promise<boolean> {
    const serviceClient = getServiceRoleClient();
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

export async function getFeatureSubscribers(featureKey: string): Promise<{
    userId: string;
    email: string | null;
    notifyEmail: boolean;
    notifySite: boolean;
}[]> {
    const serviceClient = getServiceRoleClient();
    const { data, error } = await serviceClient
        .from('feature_subscriptions')
        .select(`
            user_id,
            notify_email,
            notify_site,
            users:user_id (
                email
            )
        `)
        .eq('feature_key', featureKey);

    if (error) {
        console.error('获取订阅者列表失败:', error);
        return [];
    }

    return (data ?? []).map(item => ({
        userId: item.user_id,
        email: (item.users as unknown as { email: string })?.email ?? null,
        notifyEmail: item.notify_email,
        notifySite: item.notify_site,
    }));
}
