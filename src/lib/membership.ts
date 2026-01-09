/**
 * 会员权限逻辑
 * 
 * Free/Plus/Pro 三级会员体系
 * - Free: 每日+1次对话，上限3次
 * - Plus: 立即+50次，每日+5次，上限50次
 * - Pro: 立即+200次，每小时+1次，上限200次
 */

import { supabase } from './supabase';

export type MembershipType = 'free' | 'plus' | 'pro';

export interface MembershipInfo {
    type: MembershipType;
    expiresAt: Date | null;
    isActive: boolean;
    aiChatCount: number;
    lastCreditRestoreAt: Date | null;
}

export interface PricingPlan {
    id: MembershipType;
    name: string;
    price: number;
    period: string;
    features: string[];
    popular?: boolean;
    /** 初始获得的对话次数 */
    initialCredits: number;
    /** 每周期恢复的次数 */
    restoreCredits: number;
    /** 恢复周期（daily/hourly） */
    restorePeriod: 'daily' | 'hourly';
    /** 次数上限 */
    creditLimit: number;
}

// 会员套餐配置
export const pricingPlans: PricingPlan[] = [
    {
        id: 'free',
        name: 'Free',
        price: 0,
        period: '永久',
        features: [
            '基础命盘排盘',
            '每日运势预览',
            '每日+1次AI对话',
            '对话次数上限3次',
        ],
        initialCredits: 3,
        restoreCredits: 1,
        restorePeriod: 'daily',
        creditLimit: 3,
    },
    {
        id: 'plus',
        name: 'Plus',
        price: 29.9,
        period: '月',
        features: [
            '全部 Free 功能',
            '立即获得50次对话',
            '每日+5次对话',
            '对话次数上限50次',
            '完整每日/每月运势',
            'AI五行分析',
            'AI人格分析',
        ],
        popular: true,
        initialCredits: 50,
        restoreCredits: 5,
        restorePeriod: 'daily',
        creditLimit: 50,
    },
    {
        id: 'pro',
        name: 'Pro',
        price: 99,
        period: '月',
        features: [
            '全部 Plus 功能',
            '立即获得200次对话',
            '每小时+1次对话',
            '对话次数上限200次',
            '优先客服支持',
            '专属会员标识',
        ],
        initialCredits: 200,
        restoreCredits: 1,
        restorePeriod: 'hourly',
        creditLimit: 200,
    },
];

/**
 * 获取套餐配置
 */
export function getPlanConfig(type: MembershipType): PricingPlan {
    return pricingPlans.find(p => p.id === type) || pricingPlans[0];
}

/**
 * 获取积分上限
 */
export function getCreditLimit(type: MembershipType): number {
    return getPlanConfig(type).creditLimit;
}

/**
 * 获取用户会员信息
 */
export async function getMembershipInfo(userId: string): Promise<MembershipInfo | null> {
    const { data, error } = await supabase
        .from('users')
        .select('membership, membership_expires_at, ai_chat_count, last_credit_restore_at')
        .eq('id', userId)
        .maybeSingle();

    if (error) {
        console.error('Error fetching membership:', error);
        return null;
    }

    if (!data) {
        return {
            type: 'free',
            expiresAt: null,
            isActive: true,
            aiChatCount: 3,
            lastCreditRestoreAt: null,
        };
    }

    const membershipType = data.membership ? (data.membership as MembershipType) : 'free';
    const aiChatCount = typeof data.ai_chat_count === 'number' ? data.ai_chat_count : 3;
    const expiresAt = data.membership_expires_at
        ? new Date(data.membership_expires_at)
        : null;
    const lastCreditRestoreAt = data.last_credit_restore_at
        ? new Date(data.last_credit_restore_at)
        : null;

    // 检查会员是否有效
    let isActive = true;
    let effectiveType = membershipType;

    if (membershipType !== 'free' && expiresAt !== null && expiresAt <= new Date()) {
        // 会员已过期，降级为 free
        isActive = false;
        effectiveType = 'free';
    }

    return {
        type: effectiveType,
        expiresAt,
        isActive,
        aiChatCount,
        lastCreditRestoreAt,
    };
}

/**
 * 检查用户是否有AI对话权限（有积分即可）
 */
export async function canUseAIChat(userId: string): Promise<boolean> {
    const membership = await getMembershipInfo(userId);
    if (!membership) return false;
    return membership.aiChatCount > 0;
}

/**
 * 消耗一次AI对话次数
 */
export async function consumeAIChatCount(userId: string): Promise<boolean> {
    const membership = await getMembershipInfo(userId);

    if (!membership) return false;
    if (membership.aiChatCount <= 0) return false;

    const { error } = await supabase
        .from('users')
        .update({ ai_chat_count: membership.aiChatCount - 1 })
        .eq('id', userId);

    return !error;
}

/**
 * 升级会员（支付成功后调用）
 */
export async function upgradeMembership(
    userId: string,
    planId: MembershipType
): Promise<{ success: boolean; error?: string }> {
    if (planId === 'free') {
        return { success: false, error: '无法升级到免费版' };
    }

    const plan = pricingPlans.find(p => p.id === planId);
    if (!plan) {
        return { success: false, error: '无效的套餐' };
    }

    // 计算过期时间
    let expiresAt: Date | null = null;
    if (planId === 'plus') {
        expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + 1);
    } else if (planId === 'pro') {
        expiresAt = new Date();
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    }

    // 创建订单
    const { error: orderError } = await supabase
        .from('orders')
        .insert({
            user_id: userId,
            product_type: planId,
            amount: plan.price,
            status: 'paid',
            payment_method: 'simulated',
            paid_at: new Date().toISOString(),
        });

    if (orderError) {
        console.error('Error creating order:', orderError);
        return { success: false, error: '创建订单失败' };
    }

    // 获取当前积分
    const membership = await getMembershipInfo(userId);
    const currentCredits = membership?.aiChatCount || 0;

    // 更新用户会员状态
    const updateData: Record<string, unknown> = {
        membership: planId,
        updated_at: new Date().toISOString(),
        // 叠加初始积分，但不超过上限
        ai_chat_count: Math.min(currentCredits + plan.initialCredits, plan.creditLimit),
        last_credit_restore_at: new Date().toISOString(),
    };

    if (expiresAt) {
        updateData.membership_expires_at = expiresAt.toISOString();
    }

    const { error: updateError } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId);

    if (updateError) {
        console.error('Error updating membership:', updateError);
        return { success: false, error: '更新会员状态失败' };
    }

    return { success: true };
}

/**
 * 按量付费购买对话次数
 */
export async function purchaseCredits(
    userId: string,
    count: number,
    amount: number
): Promise<{ success: boolean; error?: string }> {
    // 创建订单
    const { error: orderError } = await supabase
        .from('orders')
        .insert({
            user_id: userId,
            product_type: 'pay_per_use',
            amount: amount,
            status: 'paid',
            payment_method: 'simulated',
            paid_at: new Date().toISOString(),
        });

    if (orderError) {
        console.error('Error creating pay_per_use order:', orderError);
        return { success: false, error: '创建订单失败' };
    }

    // 获取当前信息
    const membership = await getMembershipInfo(userId);
    const currentCredits = membership?.aiChatCount || 0;
    const limit = getCreditLimit(membership?.type || 'free');

    // 按量付费可以突破常规上限，使用较高的上限
    const newCredits = currentCredits + count;

    const { error: updateError } = await supabase
        .from('users')
        .update({
            ai_chat_count: newCredits,
            updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

    if (updateError) {
        console.error('Error updating credits:', updateError);
        return { success: false, error: '更新积分失败' };
    }

    return { success: true };
}

/**
 * 获取用户订单历史
 */
export async function getOrderHistory(userId: string) {
    const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching orders:', error);
        return [];
    }

    return data;
}
