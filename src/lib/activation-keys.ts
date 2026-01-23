/**
 * 激活Key管理库
 * 
 * 提供激活Key的创建、验证、激活等功能
 */

import { getServiceClient } from "./supabase-server";
import type { MembershipType } from "./membership";

// Key类型
export type KeyType = 'membership' | 'credits';

// 激活Key信息
export interface ActivationKey {
    id: string;
    key_code: string;
    key_type: KeyType;
    membership_type: MembershipType | null;
    credits_amount: number | null;
    is_used: boolean;
    used_by: string | null;
    used_at: string | null;
    created_by: string;
    created_at: string;
}

// 创建Key的参数
export interface CreateKeyParams {
    keyType: KeyType;
    membershipType?: MembershipType;
    creditsAmount?: number;
    count: number;
}

// 激活结果
export interface ActivateResult {
    success: boolean;
    error?: string;
    keyType?: KeyType;
    membershipType?: MembershipType;
    creditsAmount?: number;
}

/**
 * 生成激活Key代码 (格式: sk-xxxx)
 */
function generateKeyCode(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let code = 'sk-';
    for (let i = 0; i < 16; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

/**
 * 批量创建激活Key (管理员)
 */
export async function createActivationKeys(
    adminId: string,
    params: CreateKeyParams
): Promise<{ success: boolean; keys?: string[]; error?: string }> {
    try {
        const supabase = getServiceClient();

        // 验证参数
        if (params.keyType === 'membership' && !params.membershipType) {
            return { success: false, error: '会员类型Key需要指定会员等级' };
        }
        if (params.keyType === 'credits' && (!params.creditsAmount || params.creditsAmount <= 0)) {
            return { success: false, error: '积分类型Key需要指定有效的积分数量' };
        }
        if (params.count <= 0 || params.count > 100) {
            return { success: false, error: '创建数量需在1-100之间' };
        }

        // 生成Key
        const keysToCreate = [];
        for (let i = 0; i < params.count; i++) {
            keysToCreate.push({
                key_code: generateKeyCode(),
                key_type: params.keyType,
                membership_type: params.keyType === 'membership' ? params.membershipType : null,
                credits_amount: params.keyType === 'credits' ? params.creditsAmount : null,
                created_by: adminId,
            });
        }

        const { data, error } = await supabase
            .from('activation_keys')
            .insert(keysToCreate)
            .select('key_code');

        if (error) {
            console.error('[activation-keys] Failed to create keys:', error);
            return { success: false, error: '创建激活Key失败' };
        }

        return {
            success: true,
            keys: data?.map(k => k.key_code) || []
        };
    } catch (error) {
        console.error('[activation-keys] Error creating keys:', error);
        return { success: false, error: '服务器错误' };
    }
}

/**
 * 获取所有激活Key (管理员)
 */
export async function getAllActivationKeys(
    filters?: { isUsed?: boolean; keyType?: KeyType }
): Promise<ActivationKey[]> {
    try {
        const supabase = getServiceClient();

        let query = supabase
            .from('activation_keys')
            .select('*')
            .order('created_at', { ascending: false });

        if (filters?.isUsed !== undefined) {
            query = query.eq('is_used', filters.isUsed);
        }
        if (filters?.keyType) {
            query = query.eq('key_type', filters.keyType);
        }

        const { data, error } = await query;

        if (error) {
            console.error('[activation-keys] Failed to fetch keys:', error);
            return [];
        }

        return data || [];
    } catch (error) {
        console.error('[activation-keys] Error fetching keys:', error);
        return [];
    }
}

/**
 * 删除激活Key (管理员)
 */
export async function deleteActivationKey(keyId: string): Promise<boolean> {
    try {
        const supabase = getServiceClient();

        const { error } = await supabase
            .from('activation_keys')
            .delete()
            .eq('id', keyId);

        if (error) {
            console.error('[activation-keys] Failed to delete key:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('[activation-keys] Error deleting key:', error);
        return false;
    }
}

/**
 * 用户激活Key
 */
export async function activateKey(
    userId: string,
    keyCode: string
): Promise<ActivateResult> {
    try {
        const supabase = getServiceClient();

        // 校验Key格式
        if (!keyCode || !keyCode.startsWith('sk-') || keyCode.length < 10) {
            return { success: false, error: '无效的激活码格式' };
        }

        // 查找Key
        const { data: key, error: findError } = await supabase
            .from('activation_keys')
            .select('*')
            .eq('key_code', keyCode)
            .maybeSingle();

        if (findError || !key) {
            return { success: false, error: '激活码不存在' };
        }

        if (key.is_used) {
            return { success: false, error: '该激活码已被使用' };
        }

        // 标记Key为已使用
        const { data: updatedKeys, error: updateKeyError } = await supabase
            .from('activation_keys')
            .update({
                is_used: true,
                used_by: userId,
                used_at: new Date().toISOString(),
            })
            .eq('id', key.id)
            .eq('is_used', false)
            .select('id');

        if (updateKeyError || !updatedKeys || updatedKeys.length === 0) {
            console.error('[activation-keys] Failed to mark key as used:', updateKeyError);
            return { success: false, error: '激活失败，请重试' };
        }

        // 根据Key类型执行相应操作
        if (key.key_type === 'membership') {
            // 升级会员
            const membershipType = key.membership_type as MembershipType;
            const expiresAt = new Date();
            expiresAt.setMonth(expiresAt.getMonth() + 1); // 一个月有效期

            // 获取套餐配置
            const planConfig = {
                plus: { initialCredits: 50, creditLimit: 50 },
                pro: { initialCredits: 200, creditLimit: 200 },
            };
            const config = planConfig[membershipType as 'plus' | 'pro'];

            const { data: user, error: getUserError } = await supabase
                .from('users')
                .select('ai_chat_count')
                .eq('id', userId)
                .single();

            if (getUserError || !user) {
                return { success: false, error: '获取用户信息失败' };
            }

            const currentCredits = typeof user.ai_chat_count === 'number' ? user.ai_chat_count : 0;
            const newCredits = Math.max(
                currentCredits,
                Math.min(currentCredits + config.initialCredits, config.creditLimit)
            );

            const { error: updateUserError } = await supabase
                .from('users')
                .update({
                    membership: membershipType,
                    membership_expires_at: expiresAt.toISOString(),
                    ai_chat_count: newCredits,
                })
                .eq('id', userId);

            if (updateUserError) {
                console.error('[activation-keys] Failed to upgrade membership:', updateUserError);
                return { success: false, error: '升级会员失败' };
            }

            // 创建订单记录
            await supabase.from('orders').insert({
                user_id: userId,
                order_type: 'subscription',
                plan_id: membershipType,
                amount: 0, // Key激活免费
                status: 'completed',
                payment_method: 'activation_key',
            });

            return {
                success: true,
                keyType: 'membership',
                membershipType,
            };
        } else {
            // 增加积分
            const creditsAmount = key.credits_amount || 0;

            // 获取当前积分和会员等级
            const { data: user, error: getUserError } = await supabase
                .from('users')
                .select('ai_chat_count, membership')
                .eq('id', userId)
                .single();

            if (getUserError || !user) {
                return { success: false, error: '获取用户信息失败' };
            }

            const newCount = (user.ai_chat_count || 0) + creditsAmount;

            const { error: updateCreditsError } = await supabase
                .from('users')
                .update({ ai_chat_count: newCount })
                .eq('id', userId);

            if (updateCreditsError) {
                console.error('[activation-keys] Failed to add credits:', updateCreditsError);
                return { success: false, error: '添加积分失败' };
            }

            // 创建订单记录
            await supabase.from('orders').insert({
                user_id: userId,
                order_type: 'credits',
                credits_count: creditsAmount,
                amount: 0, // Key激活免费
                status: 'completed',
                payment_method: 'activation_key',
            });

            return {
                success: true,
                keyType: 'credits',
                creditsAmount,
            };
        }
    } catch (error) {
        console.error('[activation-keys] Error activating key:', error);
        return { success: false, error: '服务器错误' };
    }
}
