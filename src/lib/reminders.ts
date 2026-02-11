/**
 * 提醒系统
 * 
 * 管理节气提醒、运势提醒、关键日提醒等
 */

import { getServiceRoleClient } from '@/lib/api-utils';
import { createNotification } from '@/lib/notification-server';
import { getNextSolarTerm, getSolarTermMeaning } from '@/lib/solar-terms';
import { calculateDailyFortune, generateEnhancedKeyDates } from '@/lib/fortune';
import type { BaziChart } from '@/types';

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

const REMINDER_CLAIM_TTL_MS = 5 * 60 * 1000;

// ===== 订阅管理 =====

/**
 * 获取用户提醒订阅设置
 */
export async function getReminderSubscriptions(userId: string): Promise<ReminderSubscription[]> {
    // 使用 service client 绕过 RLS
    const serviceClient = getServiceRoleClient();
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
    const serviceClient = getServiceRoleClient();
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
    const serviceClient = getServiceRoleClient();
    const { data: subscription, error: subscriptionError } = await serviceClient
        .from('reminder_subscriptions')
        .select('enabled, notify_site')
        .eq('user_id', userId)
        .eq('reminder_type', reminderType)
        .maybeSingle();

    if (subscriptionError) {
        console.error('[reminders] 获取订阅状态失败:', subscriptionError);
        return false;
    }

    if (!subscription?.enabled || !subscription?.notify_site) {
        return false;
    }

    let notificationsEnabled = true;
    let settingsNotifySite = true;
    const { data: settings, error: settingsError } = await serviceClient
        .from('user_settings')
        .select('notifications_enabled, notify_site')
        .eq('user_id', userId)
        .maybeSingle();

    if (settingsError) {
        console.error('[reminders] 获取通知偏好失败:', settingsError);
    } else if (settings) {
        notificationsEnabled = settings.notifications_enabled ?? true;
        settingsNotifySite = settings.notify_site ?? true;
    }

    return !!subscription?.enabled && !!subscription?.notify_site && notificationsEnabled && settingsNotifySite;
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
    const serviceClient = getServiceRoleClient();
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
    const serviceClient = getServiceRoleClient();
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
    const now = new Date();
    const nowIso = now.toISOString();
    const claimStaleBefore = new Date(now.getTime() - REMINDER_CLAIM_TTL_MS).toISOString();

    // 获取待发送的提醒
    // 使用 service client 绕过 RLS
    const serviceClient = getServiceRoleClient();
    const { data: pendingReminders, error } = await serviceClient
        .from('scheduled_reminders')
        .select('*')
        .eq('sent', false)
        .lte('scheduled_for', nowIso)
        .or(`sent_at.is.null,sent_at.lte.${claimStaleBefore}`)
        .limit(100);

    if (error || !pendingReminders) {
        console.error('[reminders] 获取待处理提醒失败:', error);
        return 0;
    }

    let processed = 0;

    for (const reminder of pendingReminders) {
        const claimToken = await claimReminder(reminder.id, claimStaleBefore);
        if (!claimToken) {
            continue;
        }

        try {
            // 检查用户是否仍然订阅
            const subscribed = await isSubscribed(reminder.user_id, reminder.reminder_type);
            if (!subscribed) {
                // 已占用后发现用户取消订阅，标记为已发送避免重复处理
                await markReminderSent(reminder.id, claimToken);
                continue;
            }

            // 发送提醒
            const sent = await sendReminder(reminder);
            if (sent) {
                const marked = await markReminderSent(reminder.id, claimToken);
                if (marked) {
                    processed++;
                }
            } else {
                await releaseReminderClaim(reminder.id, claimToken);
            }
        } catch (err) {
            console.error(`[reminders] 处理提醒 ${reminder.id} 失败:`, err);
            await releaseReminderClaim(reminder.id, claimToken);
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
}): Promise<boolean> {
    const content = reminder.content || {};

    let title = '';
    let message = '';
    let link: string | undefined;

    switch (reminder.reminder_type) {
        case 'solar_term':
            title = `🌿 今日节气：${content.term_name}`;
            message = `${content.meaning}\n\n养生建议：${content.tips}`;
            link = '/daily';
            break;
        case 'fortune':
            title = '📅 今日运势提醒';
            message = typeof content.summary === 'string' ? content.summary : '查看您的今日运势分析';
            link = '/daily';
            break;
        case 'key_date':
            title = `🔔 重要日期提醒`;
            message = typeof content.description === 'string' ? content.description : '今天有重要事项';
            link = '/daily';
            break;
        default:
            title = '系统提醒';
            message = '您有一条新提醒';
    }

    const success = await createNotification(reminder.user_id, 'system', title, message, link);
    if (!success) {
        console.error('[reminders] 创建通知失败:', reminder.user_id, reminder.reminder_type);
    }
    return success;
}

/**
 * 抢占提醒处理权（Lease）
 */
async function claimReminder(reminderId: string, staleBefore: string): Promise<string | null> {
    // 使用 service client 绕过 RLS
    const serviceClient = getServiceRoleClient();
    const claimedAt = new Date().toISOString();
    const { data, error } = await serviceClient
        .from('scheduled_reminders')
        .update({
            sent_at: claimedAt,
        })
        .eq('id', reminderId)
        .eq('sent', false)
        .or(`sent_at.is.null,sent_at.lte.${staleBefore}`)
        .select('id')
        .maybeSingle();

    if (error) {
        console.error(`[reminders] 占用提醒 ${reminderId} 失败:`, error);
        return null;
    }

    return data ? claimedAt : null;
}

/**
 * 标记提醒已发送（仅当前 lease 持有者可提交）
 */
async function markReminderSent(reminderId: string, claimToken: string): Promise<boolean> {
    const serviceClient = getServiceRoleClient();
    const { data, error } = await serviceClient
        .from('scheduled_reminders')
        .update({
            sent: true,
            sent_at: new Date().toISOString(),
        })
        .eq('id', reminderId)
        .eq('sent', false)
        .eq('sent_at', claimToken)
        .select('id')
        .maybeSingle();

    if (error) {
        console.error(`[reminders] 标记提醒 ${reminderId} 已发送失败:`, error);
        return false;
    }

    return !!data;
}

/**
 * 释放提醒占用（发送失败时回滚）
 */
async function releaseReminderClaim(reminderId: string, claimToken: string): Promise<void> {
    const serviceClient = getServiceRoleClient();
    const { error } = await serviceClient
        .from('scheduled_reminders')
        .update({
            sent_at: null,
        })
        .eq('id', reminderId)
        .eq('sent', false)
        .eq('sent_at', claimToken);

    if (error) {
        console.error(`[reminders] 回滚提醒 ${reminderId} 失败:`, error);
    }
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
    const serviceClient = getServiceRoleClient();
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

/**
 * 为用户安排未来7天的运势波动提醒
 * 识别运势显著变化的日期并创建提醒
 */
export async function scheduleUpcomingFortuneReminders(
    userId: string,
    baziChart: BaziChart
): Promise<number> {
    const serviceClient = getServiceRoleClient();
    const now = new Date();
    let scheduled = 0;

    // 计算未来7天的运势
    for (let i = 1; i <= 7; i++) {
        const targetDate = new Date(now);
        targetDate.setDate(now.getDate() + i);

        const fortune = calculateDailyFortune(baziChart, targetDate);
        const dateStr = fortune.date;

        // 识别运势波动：极高（≥88）或极低（≤55）
        const isSignificant = fortune.overall >= 88 || fortune.overall <= 55;
        if (!isSignificant) continue;

        // 检查是否已经安排
        const { data: existing } = await serviceClient
            .from('scheduled_reminders')
            .select('id')
            .eq('user_id', userId)
            .eq('reminder_type', 'fortune')
            .eq('scheduled_for', `${dateStr}T07:00:00+08:00`)
            .limit(1);

        if (existing && existing.length > 0) continue;

        // 创建提醒
        const summaryType = fortune.overall >= 88 ? '大吉日' : '低谷日';
        const summary = fortune.overall >= 88
            ? `今日运势极佳（${fortune.overall}分），适合把握机会！`
            : `今日运势较低（${fortune.overall}分），建议谨慎行事。`;

        const success = await scheduleFortuneReminder(userId, dateStr, {
            summary,
            overall: fortune.overall,
            career: fortune.career,
            wealth: fortune.wealth,
            love: fortune.love,
            health: fortune.health,
            type: summaryType,
        });

        if (success) scheduled++;
    }

    return scheduled;
}

/**
 * 为用户安排当月的关键日提醒
 */
export async function scheduleKeyDateReminders(
    userId: string,
    baziChart: BaziChart
): Promise<number> {
    const serviceClient = getServiceRoleClient();
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    let scheduled = 0;

    // 获取当月关键日
    const keyDates = generateEnhancedKeyDates(baziChart, year, month);

    for (const keyDate of keyDates) {
        // 只安排未来的日期
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(keyDate.date).padStart(2, '0')}`;
        if (dateStr <= now.toISOString().split('T')[0]) continue;

        // 检查是否已经安排
        const { data: existing } = await serviceClient
            .from('scheduled_reminders')
            .select('id')
            .eq('user_id', userId)
            .eq('reminder_type', 'key_date')
            .eq('scheduled_for', `${dateStr}T07:00:00+08:00`)
            .limit(1);

        if (existing && existing.length > 0) continue;

        // 创建提醒
        const { error } = await serviceClient
            .from('scheduled_reminders')
            .insert({
                user_id: userId,
                reminder_type: 'key_date',
                scheduled_for: `${dateStr}T07:00:00+08:00`,
                content: {
                    date: keyDate.date,
                    type: keyDate.type,
                    summary: keyDate.summary,
                    recommendation: keyDate.recommendation,
                    scores: keyDate.scores,
                    description: `${month}月${keyDate.date}日：${keyDate.summary}`,
                },
            });

        if (!error) scheduled++;
    }

    return scheduled;
}

/**
 * 获取用户的主要八字命盘（用于运势计算）
 */
async function getUserPrimaryBaziChart(userId: string): Promise<BaziChart | null> {
    const serviceClient = getServiceRoleClient();

    // 查找用户最近保存的八字命盘
    const { data } = await serviceClient
        .from('bazi_charts')
        .select('chart_data')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (!data?.chart_data) return null;

    return data.chart_data as BaziChart;
}

/**
 * 为所有启用提醒的用户调度提醒（由 Cron 调用）
 */
export async function scheduleAllUsersReminders(): Promise<number> {
    const serviceClient = getServiceRoleClient();
    let totalScheduled = 0;

    // 获取所有启用了提醒的订阅
    const { data: subscriptions, error: subscriptionsError } = await serviceClient
        .from('reminder_subscriptions')
        .select('user_id, reminder_type, enabled, notify_site')
        .eq('enabled', true)
        .eq('notify_site', true);

    if (subscriptionsError) {
        console.error('[reminders] 获取订阅列表失败:', subscriptionsError);
        return 0;
    }

    if (!subscriptions || subscriptions.length === 0) return 0;

    const userIds = Array.from(new Set(subscriptions.map(sub => sub.user_id)));
    const settingsMap = new Map<string, { notifications_enabled?: boolean; notify_site?: boolean }>();
    if (userIds.length > 0) {
        const { data: settingsRows, error: settingsError } = await serviceClient
            .from('user_settings')
            .select('user_id, notifications_enabled, notify_site')
            .in('user_id', userIds);

        if (settingsError) {
            console.error('[reminders] 获取用户通知偏好失败:', settingsError);
        } else {
            (settingsRows || []).forEach((row: { user_id: string; notifications_enabled?: boolean; notify_site?: boolean }) => {
                settingsMap.set(row.user_id, {
                    notifications_enabled: row.notifications_enabled,
                    notify_site: row.notify_site,
                });
            });
        }
    }

    // 按用户分组
    const userSubscriptions = new Map<string, Set<string>>();
    for (const sub of subscriptions) {
        const settings = settingsMap.get(sub.user_id);
        const notificationsEnabled = settings?.notifications_enabled ?? true;
        const settingsNotifySite = settings?.notify_site ?? true;
        if (!notificationsEnabled || !settingsNotifySite) {
            continue;
        }
        if (!userSubscriptions.has(sub.user_id)) {
            userSubscriptions.set(sub.user_id, new Set());
        }
        userSubscriptions.get(sub.user_id)!.add(sub.reminder_type);
    }

    // 为每个用户调度提醒
    for (const [userId, types] of userSubscriptions) {
        try {
            // 节气提醒
            if (types.has('solar_term')) {
                const count = await scheduleUpcomingSolarTermReminders(userId);
                totalScheduled += count;
            }

            // 运势和关键日提醒需要八字数据
            if (types.has('fortune') || types.has('key_date')) {
                const baziChart = await getUserPrimaryBaziChart(userId);
                if (baziChart) {
                    if (types.has('fortune')) {
                        const count = await scheduleUpcomingFortuneReminders(userId, baziChart);
                        totalScheduled += count;
                    }
                    if (types.has('key_date')) {
                        const count = await scheduleKeyDateReminders(userId, baziChart);
                        totalScheduled += count;
                    }
                }
            }
        } catch (err) {
            console.error(`[reminders] 为用户 ${userId} 调度提醒失败:`, err);
        }
    }

    return totalScheduled;
}
