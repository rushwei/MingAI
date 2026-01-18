/**
 * 签到系统
 * 
 * 管理每日签到、连续签到奖励等
 */

import { supabase } from './supabase';
import { addExperience, XP_REWARDS } from './gamification';

// ===== 签到奖励配置 =====

/** 获取签到奖励积分 */
export function getCheckinReward(streakDays: number): number {
    if (streakDays === 7) return 5;      // 周奖励
    if (streakDays === 30) return 20;    // 月奖励
    if (streakDays >= 8) return 2;       // 连续8天以上
    return 1;                             // 默认奖励
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
    leveledUp: boolean;
    error?: string;
}> {
    const status = await getCheckinStatus(userId);

    if (!status.canCheckin) {
        return {
            success: false,
            streakDays: status.streakDays,
            rewardCredits: 0,
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

    // 计算奖励
    const rewardCredits = getCheckinReward(newStreakDays);

    // 插入签到记录
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
            leveledUp: false,
            error: '签到失败，请稍后重试',
        };
    }

    // 记录积分交易
    await supabase
        .from('credit_transactions')
        .insert({
            user_id: userId,
            amount: rewardCredits,
            type: 'earn',
            source: 'checkin',
            description: `连续签到第${newStreakDays}天`,
        });

    // 增加用户积分 (复用 credits 系统)
    const { addCredits } = await import('./credits');
    await addCredits(userId, rewardCredits);

    // 增加经验值
    const xpResult = await addExperience(userId, XP_REWARDS.checkin, 'checkin');

    console.log(`[checkin] 用户 ${userId} 签到成功, 连续${newStreakDays}天, 奖励${rewardCredits}积分`);

    return {
        success: true,
        streakDays: newStreakDays,
        rewardCredits,
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
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

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

    return data?.map(d => d.checkin_date) || [];
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
    const { data, error } = await supabase
        .from('daily_checkins')
        .select('checkin_date, streak_days')
        .eq('user_id', userId)
        .order('checkin_date', { ascending: false });

    if (error || !data) {
        return { totalDays: 0, currentStreak: 0, longestStreak: 0, thisMonthDays: 0 };
    }

    const totalDays = data.length;
    const currentStreak = data[0]?.streak_days || 0;
    const longestStreak = Math.max(...data.map(d => d.streak_days), 0);
    const thisMonthDays = data.filter(d => d.checkin_date.startsWith(thisMonth)).length;

    return { totalDays, currentStreak, longestStreak, thisMonthDays };
}
