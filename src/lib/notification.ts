/**
 * 通知服务
 * 
 * 提供站内通知和功能订阅的管理
 */

import { supabase } from './supabase';

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

export interface FeatureSubscription {
    id: string;
    user_id: string;
    feature_key: string;
    notify_email: boolean;
    notify_site: boolean;
    created_at: string;
}

/**
 * 获取未读通知数量
 */
export async function getUnreadCount(userId: string): Promise<number> {
    const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

    if (error) {
        console.error('获取未读数量失败:', error);
        return 0;
    }

    return count ?? 0;
}

/**
 * 获取通知列表
 */
export async function getNotifications(
    userId: string,
    limit: number = 20
): Promise<Notification[]> {
    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('获取通知列表失败:', error);
        return [];
    }

    return data ?? [];
}

/**
 * 标记单条通知为已读
 */
export async function markAsRead(notificationId: string): Promise<boolean> {
    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

    if (error) {
        console.error('标记已读失败:', error);
        return false;
    }

    return true;
}

/**
 * 标记所有通知为已读
 */
export async function markAllAsRead(userId: string): Promise<boolean> {
    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);

    if (error) {
        console.error('标记全部已读失败:', error);
        return false;
    }

    return true;
}

/**
 * 批量标记通知为已读
 */
export async function markSelectedAsRead(notificationIds: string[]): Promise<boolean> {
    if (notificationIds.length === 0) return true;

    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', notificationIds);

    if (error) {
        console.error('批量标记已读失败:', error);
        return false;
    }

    return true;
}

/**
 * 删除单条通知
 */
export async function deleteNotification(notificationId: string): Promise<boolean> {
    const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

    if (error) {
        console.error('删除通知失败:', error);
        return false;
    }

    return true;
}

/**
 * 批量删除通知
 */
export async function deleteNotifications(notificationIds: string[]): Promise<boolean> {
    if (notificationIds.length === 0) return true;

    const { error } = await supabase
        .from('notifications')
        .delete()
        .in('id', notificationIds);

    if (error) {
        console.error('批量删除通知失败:', error);
        return false;
    }

    return true;
}

/**
 * 创建通知（服务端使用）
 */
export async function createNotification(
    userId: string,
    type: Notification['type'],
    title: string,
    content?: string,
    link?: string
): Promise<boolean> {
    const { error } = await supabase
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

/**
 * 检查功能订阅状态
 */
export async function checkSubscription(
    userId: string,
    featureKey: string
): Promise<boolean> {
    const { data, error } = await supabase
        .from('feature_subscriptions')
        .select('id')
        .eq('user_id', userId)
        .eq('feature_key', featureKey)
        .maybeSingle();

    if (error) {
        console.error('检查订阅状态失败:', error);
        return false;
    }

    return !!data;
}

/**
 * 订阅功能上线提醒
 */
export async function subscribeFeature(
    userId: string,
    featureKey: string,
    notifyEmail: boolean = true,
    notifySite: boolean = true
): Promise<boolean> {
    const { error } = await supabase
        .from('feature_subscriptions')
        .upsert({
            user_id: userId,
            feature_key: featureKey,
            notify_email: notifyEmail,
            notify_site: notifySite,
        }, {
            onConflict: 'user_id,feature_key'
        });

    if (error) {
        console.error('订阅失败:', error);
        return false;
    }

    return true;
}

/**
 * 取消功能订阅
 */
export async function unsubscribeFeature(
    userId: string,
    featureKey: string
): Promise<boolean> {
    const { error } = await supabase
        .from('feature_subscriptions')
        .delete()
        .eq('user_id', userId)
        .eq('feature_key', featureKey);

    if (error) {
        console.error('取消订阅失败:', error);
        return false;
    }

    return true;
}

/**
 * 获取功能所有订阅者（服务端用于批量通知）
 */
export async function getFeatureSubscribers(featureKey: string): Promise<{
    userId: string;
    email: string | null;
    notifyEmail: boolean;
    notifySite: boolean;
}[]> {
    const { data, error } = await supabase
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

/**
 * 功能名称映射
 */
export const FEATURE_NAMES: Record<string, string> = {
    liuyao: '六爻占卜',
    tarot: '塔罗占卜',
    face: '面相分析',
    palm: '手相分析',
};
