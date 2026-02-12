import { getServiceRoleClient } from '@/lib/api-utils';
import type { Notification } from '@/lib/notification';

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
        .select('user_id, notify_email, notify_site')
        .eq('feature_key', featureKey);

    if (error) {
        console.error('获取订阅者列表失败:', error);
        return [];
    }

    const rows = data ?? [];
    const userIds = rows.map(item => item.user_id).filter(Boolean);
    const { data: emailRows, error: emailError } = await serviceClient.rpc('admin_get_auth_user_emails', {
        p_user_ids: userIds,
    });
    if (emailError) {
        console.error('获取订阅用户邮箱失败:', emailError);
    }

    const emailMap = new Map(
        ((emailRows as Array<{ user_id: string; email: string | null }> | null) || [])
            .map(result => [result.user_id, result.email])
    );

    return rows.map(item => ({
        userId: item.user_id,
        email: emailMap.get(item.user_id) ?? null,
        notifyEmail: item.notify_email,
        notifySite: item.notify_site,
    }));
}
