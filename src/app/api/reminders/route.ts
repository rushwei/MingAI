/**
 * 提醒订阅 API
 */
import { NextRequest } from 'next/server';
import {
    getReminderSubscriptions,
    updateReminderSubscription,
    scheduleUpcomingSolarTermReminders,
    scheduleUpcomingFortuneReminders,
    scheduleKeyDateReminders,
    type ReminderType
} from '@/lib/reminders';
import { getSystemAdminClient, jsonError, jsonOk, requireUserContext } from '@/lib/api-utils';
import type { BaziChart } from '@/types';

// GET - 获取提醒订阅设置
export async function GET(request: NextRequest) {
    try {
        const auth = await requireUserContext(request);
        if ('error' in auth) {
            return jsonError(auth.error.message, auth.error.status, { success: false });
        }
        const user = auth.user;

        const subscriptions = await getReminderSubscriptions(user.id);

        // 确保所有类型都有记录
        const allTypes: ReminderType[] = ['solar_term', 'fortune', 'key_date'];
        const result = allTypes.map(type => {
            const existing = subscriptions.find(s => s.reminderType === type);
            return {
                reminderType: type,
                enabled: existing?.enabled ?? false,
                notifyEmail: existing?.notifyEmail ?? false,
                notifySite: existing?.notifySite ?? true,
            };
        });

        return jsonOk({
            success: true,
            data: { subscriptions: result },
        });
    } catch (error) {
        console.error('[reminders API] 错误:', error);
        return jsonError('服务器错误', 500, { success: false });
    }
}

// POST - 更新提醒订阅设置
export async function POST(request: NextRequest) {
    try {
        const auth = await requireUserContext(request);
        if ('error' in auth) {
            return jsonError(auth.error.message, auth.error.status, { success: false });
        }
        const user = auth.user;

        const body = await request.json();
        const { reminderType, enabled, notifyEmail, notifySite } = body;

        if (!reminderType || !['solar_term', 'fortune', 'key_date'].includes(reminderType)) {
            return jsonError('无效的提醒类型', 400, { success: false });
        }

        const success = await updateReminderSubscription(
            user.id,
            reminderType as ReminderType,
            { enabled, notifyEmail, notifySite }
        );

        if (!success) {
            return jsonError('更新失败', 500, { success: false });
        }

        // 如果启用了提醒，安排对应类型的提醒
        let scheduled = 0;
        if (enabled) {
            if (reminderType === 'solar_term') {
                scheduled = await scheduleUpcomingSolarTermReminders(user.id);
            } else if (reminderType === 'fortune' || reminderType === 'key_date') {
                // 获取用户的八字命盘
                const serviceClient = getSystemAdminClient();
                const { data: chartData } = await serviceClient
                    .from('bazi_charts')
                    .select('chart_data')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (chartData?.chart_data) {
                    const baziChart = chartData.chart_data as BaziChart;
                    if (reminderType === 'fortune') {
                        scheduled = await scheduleUpcomingFortuneReminders(user.id, baziChart);
                    } else {
                        scheduled = await scheduleKeyDateReminders(user.id, baziChart);
                    }
                }
            }
        }

        return jsonOk({
            success: true,
            data: { scheduled },
        });
    } catch (error) {
        console.error('[reminders API] 更新错误:', error);
        return jsonError('服务器错误', 500, { success: false });
    }
}
