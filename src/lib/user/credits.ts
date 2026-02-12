/**
 * 用户积分/次数管理模块
 * 
 * 使用服务端 Supabase 客户端绕过 RLS
 * 注意：积分存储在 users 表的 ai_chat_count 字段
 * 
 * 积分恢复规则：
 * - Free: 每日+1次，上限3次
 * - Plus: 每日+5次，上限50次
 * - Pro: 每小时+1次，上限200次
 */

import { type MembershipType, getPlanConfig } from './membership';
import { getServiceRoleClient } from '@/lib/api-utils';
import { getUserLevel } from './gamification';


/**
 * 获取用户完整信息（积分 + 会员类型 + 恢复时间）
 */
export async function getUserCreditInfo(userId: string): Promise<{
    credits: number;
    membership: MembershipType;
    lastRestoreAt: Date | null;
    expiresAt: Date | null;
} | null> {
    const supabase = getServiceRoleClient();

    const { data, error } = await supabase
        .from('users')
        .select('ai_chat_count, membership, last_credit_restore_at, membership_expires_at')
        .eq('id', userId)
        .single();

    if (error || !data) {
        console.error('[credits] Failed to get user info:', error?.message);
        return null;
    }

    // 检查会员是否过期
    const expiresAt = data.membership_expires_at ? new Date(data.membership_expires_at) : null;
    let membership = (data.membership || 'free') as MembershipType;

    if (membership !== 'free' && expiresAt && expiresAt <= new Date()) {
        membership = 'free';
    }

    return {
        credits: typeof data.ai_chat_count === 'number' ? data.ai_chat_count : 3,
        membership,
        lastRestoreAt: data.last_credit_restore_at ? new Date(data.last_credit_restore_at) : null,
        expiresAt,
    };
}

/**
 * 获取用户积分（从 users 表读取 ai_chat_count）
 */
export async function getCredits(userId: string): Promise<number> {
    const info = await getUserCreditInfo(userId);
    return info?.credits ?? 0;
}

/**
 * 消耗一次积分（简化逻辑，使用 RPC 或直接扣减）
 * @returns 成功返回剩余积分，失败返回 null
 */
export async function useCredit(userId: string): Promise<number | null> {
    const supabase = getServiceRoleClient();

    const { data, error } = await supabase
        .rpc('decrement_ai_chat_count', { user_id: userId });

    if (error) {
        console.error('[credits] RPC decrement failed:', error.message);
        return null;
    }

    console.log('[credits] RPC succeeded, remaining:', data);
    return data;
}

/**
 * 添加积分（充值）
 */
export async function addCredits(userId: string, amount: number): Promise<number | null> {
    const supabase = getServiceRoleClient();

    const { data, error } = await supabase
        .rpc('increment_ai_chat_count', { user_id: userId, amount });

    if (error) {
        console.error('[credits] Failed to add credits:', error.message);
        return null;
    }

    return typeof data === 'number' ? data : null;
}

/**
 * 检查是否有足够积分
 */
export async function hasCredits(userId: string): Promise<boolean> {
    const credits = await getCredits(userId);
    return credits > 0;
}

/**
 * 恢复单个用户的积分
 * @returns 恢复的积分数量，如果不需要恢复返回 0
 */
export async function restoreUserCredits(userId: string): Promise<number> {
    const supabase = getServiceRoleClient();
    const info = await getUserCreditInfo(userId);

    if (!info) return 0;

    const plan = getPlanConfig(info.membership);
    const levelInfo = await getUserLevel(userId);
    const levelBonus = Math.max(0, (levelInfo?.level || 1) - 1);
    const effectiveLimit = plan.creditLimit + levelBonus;
    const now = new Date();
    const lastRestore = info.lastRestoreAt || new Date(0);

    // 计算应恢复的次数
    let periodsElapsed = 0;

    if (plan.restorePeriod === 'daily') {
        // 计算跨越了多少天
        const lastRestoreDay = new Date(lastRestore.getFullYear(), lastRestore.getMonth(), lastRestore.getDate());
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        periodsElapsed = Math.floor((today.getTime() - lastRestoreDay.getTime()) / (24 * 60 * 60 * 1000));
    } else if (plan.restorePeriod === 'hourly') {
        // 计算跨越了多少小时
        periodsElapsed = Math.floor((now.getTime() - lastRestore.getTime()) / (60 * 60 * 1000));
    }

    if (periodsElapsed <= 0) return 0;

    // 计算恢复的积分数
    const creditsToRestore = periodsElapsed * plan.restoreCredits;
    const newCredits = Math.min(info.credits + creditsToRestore, effectiveLimit);
    const actualRestored = newCredits - info.credits;

    if (actualRestored <= 0) return 0;

    const { data, error } = await supabase
        .rpc('restore_ai_chat_count', {
            user_id: userId,
            amount: creditsToRestore,
            credit_limit: effectiveLimit,
            restore_at: now.toISOString(),
        });

    if (error || typeof data !== 'number') {
        console.error('[credits] Failed to restore credits:', error?.message);
        return 0;
    }

    const restored = Math.max(0, data - info.credits);
    console.log(`[credits] Restored ${restored} credits for user ${userId}`);
    return restored;
}

/**
 * 批量恢复所有用户的积分（用于 Cron Job）
 * @param period 恢复周期 ('daily' | 'hourly')
 */
export async function restoreAllCredits(period: 'daily' | 'hourly'): Promise<{
    processed: number;
    restored: number;
}> {
    const supabase = getServiceRoleClient();
    const nowIso = new Date().toISOString();

    // 根据周期选择需要处理的会员类型
    let query = supabase
        .from('users')
        .select('id, membership, membership_expires_at');

    if (period === 'hourly') {
        query = query
            .eq('membership', 'pro')
            .or(`membership_expires_at.is.null,membership_expires_at.gt.${nowIso}`);
    } else {
        query = query.or(
            `membership.in.(free,plus),and(membership.eq.pro,membership_expires_at.lte.${nowIso})`
        );
    }

    const { data: users, error } = await query;

    if (error || !users) {
        console.error('[credits] Failed to fetch users for restore:', error?.message);
        return { processed: 0, restored: 0 };
    }

    let totalRestored = 0;

    for (const user of users) {
        const restored = await restoreUserCredits(user.id);
        totalRestored += restored;
    }

    console.log(`[credits] Batch restore complete: ${users.length} users, ${totalRestored} credits`);
    return { processed: users.length, restored: totalRestored };
}
