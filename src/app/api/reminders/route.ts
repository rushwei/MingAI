/**
 * 提醒订阅 API
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import {
    getReminderSubscriptions,
    updateReminderSubscription,
    scheduleUpcomingSolarTermReminders,
    type ReminderType
} from '@/lib/reminders';

interface RemindersResponse {
    success: boolean;
    data?: {
        subscriptions?: Array<{
            reminderType: string;
            enabled: boolean;
            notifyEmail: boolean;
            notifySite: boolean;
        }>;
        scheduled?: number;
    };
    error?: string;
}

// GET - 获取提醒订阅设置
export async function GET(request: NextRequest): Promise<NextResponse<RemindersResponse>> {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader) {
            return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ success: false, error: '认证失败' }, { status: 401 });
        }

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

        return NextResponse.json({
            success: true,
            data: { subscriptions: result },
        });
    } catch (error) {
        console.error('[reminders API] 错误:', error);
        return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
    }
}

// POST - 更新提醒订阅设置
export async function POST(request: NextRequest): Promise<NextResponse<RemindersResponse>> {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader) {
            return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ success: false, error: '认证失败' }, { status: 401 });
        }

        const body = await request.json();
        const { reminderType, enabled, notifyEmail, notifySite } = body;

        if (!reminderType || !['solar_term', 'fortune', 'key_date'].includes(reminderType)) {
            return NextResponse.json({ success: false, error: '无效的提醒类型' }, { status: 400 });
        }

        const success = await updateReminderSubscription(
            user.id,
            reminderType as ReminderType,
            { enabled, notifyEmail, notifySite }
        );

        if (!success) {
            return NextResponse.json({ success: false, error: '更新失败' }, { status: 500 });
        }

        // 如果启用了节气提醒，安排下一个节气提醒
        let scheduled = 0;
        if (reminderType === 'solar_term' && enabled) {
            scheduled = await scheduleUpcomingSolarTermReminders(user.id);
        }

        return NextResponse.json({
            success: true,
            data: { scheduled },
        });
    } catch (error) {
        console.error('[reminders API] 更新错误:', error);
        return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
    }
}
