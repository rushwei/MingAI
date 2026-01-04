/**
 * 会员权限逻辑
 * 
 * 检查会员状态、升级会员等功能
 */

import { supabase } from './supabase';

export type MembershipType = 'free' | 'single' | 'monthly' | 'yearly';

export interface MembershipInfo {
    type: MembershipType;
    expiresAt: Date | null;
    isActive: boolean;
    aiChatCount: number;
}

export interface PricingPlan {
    id: MembershipType;
    name: string;
    price: number;
    period: string;
    features: string[];
    popular?: boolean;
}

// 会员套餐配置
export const pricingPlans: PricingPlan[] = [
    {
        id: 'free',
        name: '免费版',
        price: 0,
        period: '永久',
        features: [
            '基础性格简批',
            '每日运势预览',
            '3次AI对话体验',
        ],
    },
    {
        id: 'single',
        name: '单次解锁',
        price: 19.9,
        period: '单次',
        features: [
            '单次八字深度解读',
            '完整分析报告',
            '10次AI追问',
        ],
    },
    {
        id: 'monthly',
        name: '月度会员',
        price: 29.9,
        period: '月',
        features: [
            '无限AI对话',
            '完整每日运势',
            '流年运势报告',
            '多维关系合盘',
        ],
        popular: true,
    },
    {
        id: 'yearly',
        name: '年度会员',
        price: 299,
        period: '年',
        features: [
            '全部月度会员功能',
            '优先客服支持',
            '年度总结报告',
            '专属会员标识',
        ],
    },
];

/**
 * 获取用户会员信息
 */
export async function getMembershipInfo(userId: string): Promise<MembershipInfo | null> {
    const { data, error } = await supabase
        .from('users')
        .select('membership, membership_expires_at, ai_chat_count')
        .eq('id', userId)
        .single();

    if (error || !data) {
        console.error('Error fetching membership:', error);
        return null;
    }

    const expiresAt = data.membership_expires_at
        ? new Date(data.membership_expires_at)
        : null;

    const isActive = data.membership === 'free' ||
        (expiresAt !== null && expiresAt > new Date());

    return {
        type: data.membership as MembershipType,
        expiresAt,
        isActive,
        aiChatCount: data.ai_chat_count,
    };
}

/**
 * 检查用户是否有AI对话权限
 */
export async function canUseAIChat(userId: string): Promise<boolean> {
    const membership = await getMembershipInfo(userId);

    if (!membership) return false;

    // 付费会员无限使用
    if (membership.type !== 'free' && membership.isActive) {
        return true;
    }

    // 免费用户检查剩余次数
    return membership.aiChatCount > 0;
}

/**
 * 消耗一次AI对话次数（仅免费用户）
 */
export async function consumeAIChatCount(userId: string): Promise<boolean> {
    const membership = await getMembershipInfo(userId);

    if (!membership) return false;

    // 付费会员不消耗次数
    if (membership.type !== 'free' && membership.isActive) {
        return true;
    }

    // 免费用户消耗次数
    if (membership.aiChatCount <= 0) {
        return false;
    }

    const { error } = await supabase
        .from('users')
        .update({ ai_chat_count: membership.aiChatCount - 1 })
        .eq('id', userId);

    return !error;
}

/**
 * 升级会员（模拟支付成功后调用）
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
    if (planId === 'monthly') {
        expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + 1);
    } else if (planId === 'yearly') {
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

    // 更新用户会员状态
    const updateData: Record<string, unknown> = {
        membership: planId,
        updated_at: new Date().toISOString(),
    };

    if (expiresAt) {
        updateData.membership_expires_at = expiresAt.toISOString();
    }

    // 单次解锁增加对话次数
    if (planId === 'single') {
        const membership = await getMembershipInfo(userId);
        updateData.ai_chat_count = (membership?.aiChatCount || 0) + 10;
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
