/**
 * 提醒系统
 * 
 * 管理节气提醒、运势提醒、关键日提醒等
 */

import { getServiceClient } from './supabase-server';
import { createNotification } from './notification';
import { getNextSolarTerm, getSolarTermMeaning } from './solar-terms';

// ===== 提醒类型 =====

export type ReminderType = 'solar_term' | 'fortune' | 'key_date';

export interface ReminderSubscription {
    id: string;
    userId: string;
    reminderType: ReminderType;
    enabled: boolean;
    notifyEmail: boolean;
    notifySite: boolean;
}

export interface ScheduledReminder {
    id: string;
    userId: string;
    reminderType: ReminderType;
    scheduledFor: string;
    content: Record<string, unknown>;
    sent: boolean;
    sentAt: string | null;
}

// ===== 订阅管理 =====

/**
 * 获取用户提醒订阅设置
 */
export async function getReminderSubscriptions(userId: string): Promise<ReminderSubscription[]> {
    // 使用 service client 绕过 RLS
    const serviceClient = getServiceClient();
    const { data, error } = await serviceClient
        .from('reminder_subscriptions')
        .select('*')
        .eq('user_id', userId);

    if (error) {
        console.error('[reminders] 获取订阅设置失败:', error);
        return [];
    }

    return (data || []).map(d => ({
        id: d.id,
        userId: d.user_id,
        reminderType: d.reminder_type as ReminderType,
        enabled: d.enabled,
        notifyEmail: d.notify_email,
        notifySite: d.notify_site,
    }));
}

/**
 * 更新提醒订阅设置
 */
export async function updateReminderSubscription(
    userId: string,
    reminderType: ReminderType,
    settings: { enabled?: boolean; notifyEmail?: boolean; notifySite?: boolean }
): Promise<boolean> {
    // 使用 service client 绕过 RLS
    const serviceClient = getServiceClient();
    const { error } = await serviceClient
        .from('reminder_subscriptions')
        .upsert({
            user_id: userId,
            reminder_type: reminderType,
            enabled: settings.enabled ?? true,
            notify_email: settings.notifyEmail ?? false,
            notify_site: settings.notifySite ?? true,
            updated_at: new Date().toISOString(),
        }, {
            onConflict: 'user_id,reminder_type'
        });

    if (error) {
        console.error('[reminders] 更新订阅设置失败:', error);
        return false;
    }

    return true;
}

/**
 * 检查用户是否订阅了某类型提醒
 */
export async function isSubscribed(userId: string, reminderType: ReminderType): Promise<boolean> {
    // 使用 service client 绕过 RLS
    const serviceClient = getServiceClient();
    const { data } = await serviceClient
        .from('reminder_subscriptions')
        .select('enabled')
        .eq('user_id', userId)
        .eq('reminder_type', reminderType)
        .maybeSingle();

    return data?.enabled ?? false;
}

// ===== 提醒调度 =====

/**
 * 安排节气提醒
 */
export async function scheduleSolarTermReminder(
    userId: string,
    termDate: string,
    termName: string
): Promise<boolean> {
    const meaning = getSolarTermMeaning(termName);

    // 使用 service client 绕过 RLS
    const serviceClient = getServiceClient();
    const { error } = await serviceClient
        .from('scheduled_reminders')
        .insert({
            user_id: userId,
            reminder_type: 'solar_term',
            scheduled_for: `${termDate}T08:00:00+08:00`, // 早上8点提醒
            content: {
                term_name: termName,
                meaning: meaning.meaning,
                tips: meaning.tips,
            },
        });

    if (error) {
        console.error('[reminders] 安排节气提醒失败:', error);
        return false;
    }

    return true;
}

/**
 * 安排运势提醒
 */
export async function scheduleFortuneReminder(
    userId: string,
    date: string,
    fortuneData: Record<string, unknown>
): Promise<boolean> {
    // 使用 service client 绕过 RLS
    const serviceClient = getServiceClient();
    const { error } = await serviceClient
        .from('scheduled_reminders')
        .insert({
            user_id: userId,
            reminder_type: 'fortune',
            scheduled_for: `${date}T07:00:00+08:00`, // 早上7点提醒
            content: fortuneData,
        });

    if (error) {
        console.error('[reminders] 安排运势提醒失败:', error);
        return false;
    }

    return true;
}

/**
 * 处理到期提醒（由 Cron Job 调用）
 * 返回处理的提醒数量
 */
export async function processScheduledReminders(): Promise<number> {
    const now = new Date().toISOString();

    // 获取待发送的提醒
    // 使用 service client 绕过 RLS
    const serviceClient = getServiceClient();
    const { data: pendingReminders, error } = await serviceClient
        .from('scheduled_reminders')
        .select('*')
        .eq('sent', false)
        .lte('scheduled_for', now)
        .limit(100);

    if (error || !pendingReminders) {
        console.error('[reminders] 获取待处理提醒失败:', error);
        return 0;
    }

    let processed = 0;

    for (const reminder of pendingReminders) {
        try {
            // 检查用户是否仍然订阅
            const subscribed = await isSubscribed(reminder.user_id, reminder.reminder_type);
            if (!subscribed) {
                // 标记为已处理（跳过）
                await markReminderSent(reminder.id);
                continue;
            }

            // 发送提醒
            await sendReminder(reminder);
            await markReminderSent(reminder.id);
            processed++;
        } catch (err) {
            console.error(`[reminders] 处理提醒 ${reminder.id} 失败:`, err);
        }
    }

    console.log(`[reminders] 处理了 ${processed} 条提醒`);
    return processed;
}

/**
 * 发送提醒通知
 */
async function sendReminder(reminder: {
    user_id: string;
    reminder_type: string;
    content: Record<string, unknown>;
}): Promise<void> {
    const content = reminder.content || {};

    let title = '';
    let message = '';
    let link: string | undefined;

    switch (reminder.reminder_type) {
        case 'solar_term':
            title = `🌿 今日节气：${content.term_name}`;
            message = `${content.meaning}\n\n养生建议：${content.tips}`;
            link = '/fortune';
            break;
        case 'fortune':
            title = '📅 今日运势提醒';
            message = typeof content.summary === 'string' ? content.summary : '查看您的今日运势分析';
            link = '/fortune';
            break;
        case 'key_date':
            title = `🔔 重要日期提醒`;
            message = typeof content.description === 'string' ? content.description : '今天有重要事项';
            break;
        default:
            title = '系统提醒';
            message = '您有一条新提醒';
    }

    await createNotification(reminder.user_id, 'system', title, message, link);
}

/**
 * 标记提醒已发送
 */
async function markReminderSent(reminderId: string): Promise<void> {
    // 使用 service client 绕过 RLS
    const serviceClient = getServiceClient();
    await serviceClient
        .from('scheduled_reminders')
        .update({
            sent: true,
            sent_at: new Date().toISOString(),
        })
        .eq('id', reminderId);
}

// ===== 自动调度 =====

/**
 * 为用户安排未来的节气提醒
 */
export async function scheduleUpcomingSolarTermReminders(userId: string): Promise<number> {
    const nextTerm = getNextSolarTerm();
    if (!nextTerm) return 0;

    // 检查是否已经安排
    // 使用 service client 绕过 RLS
    const serviceClient = getServiceClient();
    const { data: existing } = await serviceClient
        .from('scheduled_reminders')
        .select('id')
        .eq('user_id', userId)
        .eq('reminder_type', 'solar_term')
        .gte('scheduled_for', new Date().toISOString())
        .eq('sent', false)
        .limit(1);

    if (existing && existing.length > 0) {
        return 0; // 已有待发送的提醒
    }

    const success = await scheduleSolarTermReminder(userId, nextTerm.date, nextTerm.name);
    return success ? 1 : 0;
}
