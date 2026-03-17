/**
 * 会员权限逻辑
 * 
 * Free/Plus/Pro 三级会员体系
 * - Free: 每日+1次对话，上限3次
 * - Plus: 立即+50次，每日+5次，上限50次
 * - Pro: 立即+200次，每小时+1次，上限200次
 */

import { getCurrentUserProfileBundle } from '@/lib/auth';

export type MembershipType = 'free' | 'plus' | 'pro';

export interface MembershipInfo {
    type: MembershipType;
    expiresAt: Date | null;
    isActive: boolean;
    aiChatCount: number;
    lastCreditRestoreAt: Date | null;
}

export type MembershipInfoSource = {
    membership?: MembershipType | null;
    membership_expires_at?: string | null;
    ai_chat_count?: number | null;
    last_credit_restore_at?: string | null;
};

/**
 * 判断付费会员是否已过期
 * free 用户永远返回 false（无过期概念）
 */
export function isMembershipExpired(source: {
    membership?: MembershipType | string | null;
    membership_expires_at?: string | null;
    expiresAt?: Date | null;
}): boolean {
    const type = (source.membership || 'free') as MembershipType;
    if (type === 'free') return false;
    const expiresAt = source.expiresAt
        ?? (source.membership_expires_at ? new Date(source.membership_expires_at) : null);
    return expiresAt !== null && expiresAt <= new Date();
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
            '每日/月运势预览',
            '塔罗牌、六爻、MBTI解读',
            '面相、手相基础分析',
            '积分上限3，每日+1积分',
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
            '积分上限50，每日+5积分，立即获得50积分',
            '更多模型支持',
            '全部AI分析',
            '知识库',
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
            '积分上限200，每小时+1积分，立即获得200积分',
            '获取更高级模型支持',
            '记住用户目标和过往对话',
            '更精确的知识库',
            '优先处理和更快响应',
            
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
    const bundle = await getCurrentUserProfileBundle();
    const profile = bundle?.profile ?? null;

    if (!profile) {
        return null;
    }
    if (profile.id !== userId) {
        return null;
    }

    return buildMembershipInfo(profile);
}

export function buildMembershipInfo(source: MembershipInfoSource | null): MembershipInfo {
    if (!source) {
        return {
            type: 'free',
            expiresAt: null,
            isActive: true,
            aiChatCount: 3,
            lastCreditRestoreAt: null,
        };
    }

    const membershipType = source.membership ? (source.membership as MembershipType) : 'free';
    const aiChatCount = typeof source.ai_chat_count === 'number' ? source.ai_chat_count : 3;
    const expiresAt = source.membership_expires_at
        ? new Date(source.membership_expires_at)
        : null;
    const lastCreditRestoreAt = source.last_credit_restore_at
        ? new Date(source.last_credit_restore_at)
        : null;

    let isActive = true;
    let effectiveType = membershipType;

    if (isMembershipExpired({ membership: membershipType, expiresAt })) {
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
