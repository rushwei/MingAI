/**
 * 用户积分/次数管理模块
 * 
 * 使用服务端 Supabase 客户端绕过 RLS
 * 注意：积分存储在 users 表的 ai_chat_count 字段
 * 
 * 当前规则：
 * - 积分余额存储在 users.ai_chat_count
 * - 会员只决定上限（Free 10 / Plus 20 / Pro 50）
 * - 定时恢复已取消，积分主要来自签到、激活码与退款
 */

import { type MembershipType, getPlanConfig, isMembershipExpired } from './membership';
import { getSystemAdminClient } from '@/lib/api-utils';

/**
 * 一次查询获取用户积分 + 有效会员类型
 * 合并 hasCredits + getEffectiveMembershipType，减少重复 DB 查询
 */
export async function getUserAuthInfo(userId: string): Promise<{
    credits: number;
    effectiveMembership: MembershipType;
    hasCredits: boolean;
} | null> {
    const info = await getUserCreditInfo(userId);
    if (!info) return null;
    return {
        credits: info.credits,
        effectiveMembership: info.membership, // getUserCreditInfo 已处理过期降级
        hasCredits: info.credits > 0,
    };
}

/**
 * 获取用户完整信息（积分 + 会员类型 + 恢复时间）
 */
export async function getUserCreditInfo(userId: string): Promise<{
    credits: number;
    membership: MembershipType;
    expiresAt: Date | null;
} | null> {
    const supabase = getSystemAdminClient();

    const { data, error } = await supabase
        .from('users')
        .select('ai_chat_count, membership, membership_expires_at')
        .eq('id', userId)
        .single();

    if (error || !data) {
        console.error('[credits] Failed to get user info:', error?.message);
        return null;
    }

    // 检查会员是否过期
    const expiresAt = data.membership_expires_at ? new Date(data.membership_expires_at) : null;
    let membership = (data.membership || 'free') as MembershipType;

    if (isMembershipExpired({ membership, expiresAt })) {
        membership = 'free';
    }

    return {
        credits: typeof data.ai_chat_count === 'number' ? data.ai_chat_count : 1,
        membership,
        expiresAt,
    };
}

/**
 * 获取用户积分（从 users 表读取 ai_chat_count）
 */
async function getCredits(userId: string): Promise<number> {
    const info = await getUserCreditInfo(userId);
    return info?.credits ?? 0;
}

/**
 * 消耗一次积分（简化逻辑，使用 RPC 或直接扣减）
 * @returns 成功返回剩余积分，失败返回 null
 */
export async function useCredit(userId: string): Promise<number | null> {
    const supabase = getSystemAdminClient();

    const { data, error } = await supabase
        .rpc('decrement_ai_chat_count', { user_id: userId });

    if (error) {
        console.error('[credits] RPC decrement failed:', error.message);
        return null;
    }

    return data;
}

/**
 * 添加积分
 */
export async function addCredits(userId: string, amount: number): Promise<number | null> {
    const supabase = getSystemAdminClient();

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

export function getMembershipCreditLimit(type: MembershipType): number {
    return getPlanConfig(type).creditLimit;
}
