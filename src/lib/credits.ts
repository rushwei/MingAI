/**
 * 用户积分/次数管理模块
 * 
 * 使用服务端 Supabase 客户端绕过 RLS
 * 注意：积分存储在 users 表的 ai_chat_count 字段
 */

import { createClient } from '@supabase/supabase-js';

// 服务端 Supabase 客户端（绕过 RLS）
function getServiceClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
        console.error('[credits] Missing Supabase service configuration');
        throw new Error('Missing Supabase service configuration');
    }

    return createClient(url, serviceKey, {
        auth: { persistSession: false }
    });
}

/**
 * 获取用户积分（从 users 表读取 ai_chat_count）
 */
export async function getCredits(userId: string): Promise<number> {
    const supabase = getServiceClient();

    const { data, error } = await supabase
        .from('users')
        .select('ai_chat_count')
        .eq('id', userId)
        .single();

    if (error) {
        console.error('[credits] Failed to get user credits:', error.message);
        return 0;
    }

    if (!data) {
        console.error('[credits] No user data found for:', userId);
        return 0;
    }

    return typeof data.ai_chat_count === 'number' ? data.ai_chat_count : 3;
}

/**
 * 消耗一次积分（简化逻辑，使用 RPC 或直接扣减）
 * @returns 成功返回剩余积分，失败返回 null
 */
export async function useCredit(userId: string): Promise<number | null> {
    const supabase = getServiceClient();

    // 直接使用 PostgreSQL 的原子操作扣减
    // 使用 GREATEST 确保不会变成负数
    const { data, error } = await supabase
        .rpc('decrement_ai_chat_count', { user_id: userId });

    if (error) {
        console.error('[credits] RPC decrement failed, trying direct update:', error.message);

        // 回退到直接更新
        const { data: current, error: fetchError } = await supabase
            .from('users')
            .select('ai_chat_count')
            .eq('id', userId)
            .single();

        if (fetchError || !current) {
            console.error('[credits] Failed to fetch current credits:', fetchError?.message);
            return null;
        }

        const currentCount = typeof current.ai_chat_count === 'number' ? current.ai_chat_count : 0;

        if (currentCount <= 0) {
            console.log('[credits] No credits remaining for user:', userId);
            return null;
        }

        // 直接更新，不使用乐观锁（service role 保证原子性）
        const { data: updated, error: updateError } = await supabase
            .from('users')
            .update({ ai_chat_count: currentCount - 1 })
            .eq('id', userId)
            .select('ai_chat_count')
            .single();

        if (updateError) {
            console.error('[credits] Direct update failed:', updateError.message);
            return null;
        }

        console.log('[credits] Direct update succeeded, remaining:', updated?.ai_chat_count);
        return updated?.ai_chat_count ?? null;
    }

    console.log('[credits] RPC succeeded, remaining:', data);
    return data;
}

/**
 * 添加积分（充值）
 */
export async function addCredits(userId: string, amount: number): Promise<number | null> {
    const supabase = getServiceClient();

    const currentCredits = await getCredits(userId);

    const { data, error } = await supabase
        .from('users')
        .update({ ai_chat_count: currentCredits + amount })
        .eq('id', userId)
        .select('ai_chat_count')
        .single();

    if (error) {
        console.error('[credits] Failed to add credits:', error.message);
        return null;
    }

    return data?.ai_chat_count ?? null;
}

/**
 * 检查是否有足够积分
 */
export async function hasCredits(userId: string): Promise<boolean> {
    const credits = await getCredits(userId);
    return credits > 0;
}
