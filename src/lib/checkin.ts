/**
 * 签到系统
 * 
 * 管理每日签到、连续签到奖励等
 */

import { getServiceRoleClient } from '@/lib/api-utils';
import { addExperience } from '@/lib/gamification';

// ===== 签到奖励配置 =====

/**
 * 获取签到奖励积分（新规则）
 * - 每7天连续签到 +1 积分（第7、14、21、28...天）
 * - 每30天连续签到 +5 积分（第30、60、90...天）
 * - 积分可叠加（第30天同时满足7天倍数和30天倍数）
 */
export function getCheckinReward(streakDays: number): number {
    let reward = 0;

    // 30天周期奖励
    if (streakDays > 0 && streakDays % 30 === 0) {
        reward += 5;
    }

    // 7天周期奖励
    if (streakDays > 0 && streakDays % 7 === 0) {
        reward += 1;
    }

    return reward;
}

/**
 * 获取签到经验值
 * - 连续签到30天以上，每日经验从10变为11
 * - 中断后回到10
 */
export function getCheckinXp(streakDays: number): number {
    return streakDays >= 30 ? 11 : 10;
}

// ===== 签到记录类型 =====

export interface CheckinRecord {
    id: string;
    userId: string;
    checkinDate: string;
    streakDays: number;
    rewardCredits: number;
    createdAt: string;
}

export interface CheckinStatus {
    canCheckin: boolean;
    lastCheckin: string | null;
    streakDays: number;
    todayCheckedIn: boolean;
}

// ===== 签到功能 =====

/**
 * 获取签到状态
 */
export async function getCheckinStatus(userId: string): Promise<CheckinStatus> {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // 获取今天的签到记录
    const supabase = getServiceRoleClient();
    const { data: todayRecord } = await supabase
        .from('daily_checkins')
        .select('*')
        .eq('user_id', userId)
        .eq('checkin_date', today)
        .maybeSingle();

    // 获取最近的签到记录
    const { data: lastRecord } = await supabase
        .from('daily_checkins')
        .select('*')
        .eq('user_id', userId)
        .order('checkin_date', { ascending: false })
        .limit(1)
        .maybeSingle();

    const todayCheckedIn = !!todayRecord;
    let streakDays = 0;

    if (lastRecord) {
        if (lastRecord.checkin_date === today) {
            streakDays = lastRecord.streak_days;
        } else if (lastRecord.checkin_date === yesterday) {
            streakDays = lastRecord.streak_days;
        }
        // 如果最后签到不是今天或昨天，连续天数重置为0
    }

    return {
        canCheckin: !todayCheckedIn,
        lastCheckin: lastRecord?.checkin_date || null,
        streakDays,
        todayCheckedIn,
    };
}

/**
 * 执行签到
 */
export async function performCheckin(userId: string): Promise<{
    success: boolean;
    streakDays: number;
    rewardCredits: number;
    rewardXp: number;
    leveledUp: boolean;
    error?: string;
}> {
    const status = await getCheckinStatus(userId);

    if (!status.canCheckin) {
        return {
            success: false,
            streakDays: status.streakDays,
            rewardCredits: 0,
            rewardXp: 0,
            leveledUp: false,
            error: '今日已签到',
        };
    }

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // 计算连续天数
    let newStreakDays = 1;
    if (status.lastCheckin === yesterday) {
        newStreakDays = status.streakDays + 1;
    }

    // 计算奖励积分（里程碑奖励）
    let rewardCredits = getCheckinReward(newStreakDays);

    // 计算经验值（30天后+11，否则+10）
    const rewardXp = getCheckinXp(newStreakDays);

    // 插入签到记录
    const supabase = getServiceRoleClient();
    const { error: insertError } = await supabase
        .from('daily_checkins')
        .insert({
            user_id: userId,
            checkin_date: today,
            streak_days: newStreakDays,
            reward_credits: rewardCredits,
        });

    if (insertError) {
        console.error('[checkin] 签到失败:', insertError);
        return {
            success: false,
            streakDays: status.streakDays,
            rewardCredits: 0,
            rewardXp: 0,
            leveledUp: false,
            error: '签到失败，请稍后重试',
        };
    }

    // 增加经验值（使用动态XP）
    const xpResult = await addExperience(userId, rewardXp, 'checkin');

    // 如果升级，额外奖励1积分
    if (xpResult.leveledUp) {
        rewardCredits += 1;
        console.log(`[checkin] 用户 ${userId} 升级到 Lv.${xpResult.newLevel}，额外奖励1积分`);
    }

    // 记录积分交易（如果有积分奖励）
    if (rewardCredits > 0) {
        await supabase
            .from('credit_transactions')
            .insert({
                user_id: userId,
                amount: rewardCredits,
                type: 'earn',
                source: 'checkin',
                description: xpResult.leveledUp
                    ? `连续签到第${newStreakDays}天 + 升级奖励`
                    : `连续签到第${newStreakDays}天`,
            });

        // 增加用户积分
        const { addCredits } = await import('@/lib/credits');
        await addCredits(userId, rewardCredits);
    }

    console.log(`[checkin] 用户 ${userId} 签到成功, 连续${newStreakDays}天, 奖励${rewardCredits}积分, ${rewardXp}经验`);

    return {
        success: true,
        streakDays: newStreakDays,
        rewardCredits,
        rewardXp,
        leveledUp: xpResult.leveledUp,
    };
}

/**
 * 获取签到日历（某月）
 */
export async function getCheckinCalendar(
    userId: string,
    year: number,
    month: number
): Promise<string[]> {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    // 使用 Date 对象计算月末日期，避免无效日期（如 2月31日）
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const supabase = getServiceRoleClient();
    const { data, error } = await supabase
        .from('daily_checkins')
        .select('checkin_date')
        .eq('user_id', userId)
        .gte('checkin_date', startDate)
        .lte('checkin_date', endDate)
        .order('checkin_date', { ascending: true });

    if (error) {
        console.error('[checkin] 获取签到日历失败:', error);
        return [];
    }

    const calendarRows = (data || []) as Array<{ checkin_date: string }>;
    return calendarRows.map(d => d.checkin_date);
}

/**
 * 获取签到统计
 */
export async function getCheckinStats(userId: string): Promise<{
    totalDays: number;
    currentStreak: number;
    longestStreak: number;
    thisMonthDays: number;
}> {
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // 获取所有签到记录
    const supabase = getServiceRoleClient();
    const { data, error } = await supabase
        .from('daily_checkins')
        .select('checkin_date, streak_days')
        .eq('user_id', userId)
        .order('checkin_date', { ascending: false });

    if (error || !data) {
        return { totalDays: 0, currentStreak: 0, longestStreak: 0, thisMonthDays: 0 };
    }

    const rows = (data || []) as Array<{ checkin_date: string; streak_days: number }>;
    const totalDays = rows.length;
    const currentStreak = rows[0]?.streak_days || 0;
    const longestStreak = Math.max(...rows.map(d => d.streak_days), 0);
    const thisMonthDays = rows.filter(d => d.checkin_date.startsWith(thisMonth)).length;

    return { totalDays, currentStreak, longestStreak, thisMonthDays };
}
