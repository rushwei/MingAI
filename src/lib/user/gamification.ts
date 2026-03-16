/**
 * 游戏化系统 - 等级与经验值
 * 
 * 管理用户等级、经验值、称号等
 */

import { getSystemAdminClient } from '@/lib/api-utils';

// ===== 等级配置 =====

export interface LevelConfig {
    level: number;
    requiredXp: number;
    cumulativeXp: number;
    title: string;
}

/** 等级配置表 */
export const LEVEL_CONFIG: LevelConfig[] = [
    { level: 1, requiredXp: 0, cumulativeXp: 0, title: '初学者' },
    { level: 2, requiredXp: 100, cumulativeXp: 100, title: '见习者' },
    { level: 3, requiredXp: 200, cumulativeXp: 300, title: '学徒' },
    { level: 4, requiredXp: 400, cumulativeXp: 700, title: '熟练者' },
    { level: 5, requiredXp: 800, cumulativeXp: 1500, title: '专家' },
    { level: 6, requiredXp: 1600, cumulativeXp: 3100, title: '大师' },
    { level: 7, requiredXp: 3200, cumulativeXp: 6300, title: '宗师' },
    { level: 8, requiredXp: 6400, cumulativeXp: 12700, title: '传奇' },
];

/** 经验值来源 */
export type XpSource =
    | 'checkin'      // 签到
    | 'analysis'     // 完成分析
    | 'chat'         // AI 对话
    | 'share'        // 分享
    | 'achievement'  // 成就解锁
    | 'bonus';       // 活动奖励

/** 各来源经验值配置 */
export const XP_REWARDS: Record<XpSource, number> = {
    checkin: 10,
    analysis: 20,
    chat: 5,
    share: 15,
    achievement: 50,
    bonus: 100,
};

// ===== 用户等级数据 =====

export interface UserLevel {
    userId: string;
    level: number;
    experience: number;
    totalExperience: number;
    title: string;
    updatedAt: string;
}

/**
 * 获取用户等级信息
 */
export async function getUserLevel(userId: string): Promise<UserLevel | null> {
    const supabase = getSystemAdminClient();
    const { data, error } = await supabase
        .from('user_levels')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

    if (error) {
        console.error('[gamification] 获取用户等级失败:', error);
        return null;
    }

    if (!data) {
        // 新用户，创建默认等级
        return await initUserLevel(userId);
    }

    return {
        userId: data.user_id,
        level: data.level,
        experience: data.experience,
        totalExperience: data.total_experience,
        title: data.title,
        updatedAt: data.updated_at,
    };
}

/**
 * 初始化用户等级
 */
async function initUserLevel(userId: string): Promise<UserLevel | null> {
    const defaultLevel = LEVEL_CONFIG[0];
    const supabase = getSystemAdminClient();

    const { data, error } = await supabase
        .from('user_levels')
        .insert({
            user_id: userId,
            level: defaultLevel.level,
            experience: 0,
            total_experience: 0,
            title: defaultLevel.title,
        })
        .select()
        .single();

    if (error) {
        console.error('[gamification] 初始化用户等级失败:', error);
        return null;
    }

    return {
        userId: data.user_id,
        level: data.level,
        experience: data.experience,
        totalExperience: data.total_experience,
        title: data.title,
        updatedAt: data.updated_at,
    };
}

/**
 * 增加经验值
 * 返回是否升级
 */
export async function addExperience(
    userId: string,
    amount: number,
    source: XpSource
): Promise<{ leveledUp: boolean; newLevel?: number; newTitle?: string }> {
    void source; // 保留参数以备将来使用
    // 获取当前等级
    const currentLevel = await getUserLevel(userId);
    if (!currentLevel) {
        return { leveledUp: false };
    }

    const newTotalXp = currentLevel.totalExperience + amount;
    const newLevelInfo = calculateLevel(newTotalXp);

    const leveledUp = newLevelInfo.level > currentLevel.level;

    // 更新数据库
    const supabase = getSystemAdminClient();
    const { error } = await supabase
        .from('user_levels')
        .update({
            level: newLevelInfo.level,
            experience: newLevelInfo.currentLevelXp,
            total_experience: newTotalXp,
            title: newLevelInfo.title,
            updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

    if (error) {
        console.error('[gamification] 更新经验值失败:', error);
        return { leveledUp: false };
    }

    return {
        leveledUp,
        newLevel: leveledUp ? newLevelInfo.level : undefined,
        newTitle: leveledUp ? newLevelInfo.title : undefined,
    };
}

/**
 * 根据总经验值计算等级
 */
export function calculateLevel(totalXp: number): {
    level: number;
    title: string;
    currentLevelXp: number;
    nextLevelXp: number;
    progress: number;
} {
    let currentConfig = LEVEL_CONFIG[0];
    let nextConfig = LEVEL_CONFIG[1];

    for (let i = LEVEL_CONFIG.length - 1; i >= 0; i--) {
        if (totalXp >= LEVEL_CONFIG[i].cumulativeXp) {
            currentConfig = LEVEL_CONFIG[i];
            nextConfig = LEVEL_CONFIG[i + 1] || LEVEL_CONFIG[i];
            break;
        }
    }

    const currentLevelXp = totalXp - currentConfig.cumulativeXp;
    const nextLevelXp = nextConfig.requiredXp;
    const progress = nextLevelXp > 0 ? Math.min(currentLevelXp / nextLevelXp, 1) : 1;

    return {
        level: currentConfig.level,
        title: currentConfig.title,
        currentLevelXp,
        nextLevelXp,
        progress,
    };
}

/**
 * 获取下一级所需经验
 */
export function getNextLevelRequirement(level: number): number {
    const config = LEVEL_CONFIG.find(c => c.level === level + 1);
    return config?.requiredXp || 0;
}

/**
 * 获取等级称号
 */
export function getLevelTitle(level: number): string {
    const config = LEVEL_CONFIG.find(c => c.level === level);
    return config?.title || '初学者';
}
