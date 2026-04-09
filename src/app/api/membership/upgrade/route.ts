/**
 * 会员升级 API
 * 
 * 服务端处理会员升级请求，防止客户端绕过支付验证
 * MVP阶段使用模拟支付
 */

import { NextRequest } from 'next/server';
import { pricingPlans } from '@/lib/user/membership';
import { getPaymentsPaused } from '@/lib/app-settings';
import { getSystemAdminClient, jsonError, jsonOk, requireUserContext } from '@/lib/api-utils';

export async function POST(request: NextRequest) {
    try {
        const paymentsPaused = await getPaymentsPaused();
        if (paymentsPaused) {
            return jsonError('支付已暂停', 403);
        }

        const { planId } = await request.json();

        // 验证套餐
        if (!planId || planId === 'free') {
            return jsonError('无效的套餐', 400);
        }

        const plan = pricingPlans.find(p => p.id === planId);
        if (!plan) {
            return jsonError('无效的套餐', 400);
        }

        const auth = await requireUserContext(request);
        if ('error' in auth) {
            return jsonError(auth.error.message, auth.error.status);
        }
        const { user } = auth;
        const userId = user.id;

        // 计算过期时间
        let expiresAt: Date | null = null;
        if (planId === 'plus') {
            expiresAt = new Date();
            expiresAt.setMonth(expiresAt.getMonth() + 1);
        } else if (planId === 'pro') {
            expiresAt = new Date();
            expiresAt.setMonth(expiresAt.getMonth() + 1);
        }

        const supabase = getSystemAdminClient();
        const { data, error } = await supabase.rpc('complete_membership_upgrade_as_service', {
            p_user_id: userId,
            p_plan_id: planId,
            p_amount: plan.price,
            p_initial_credits: plan.initialCredits,
            p_credit_limit: plan.creditLimit,
            p_expires_at: expiresAt?.toISOString() || null,
        });

        const result = (data || {}) as { status?: string; credits?: number; expires_at?: string | null };
        if (error || result.status !== 'ok') {
            console.error('Error updating membership:', error || result);
            return jsonError(result.status === 'user_not_found' ? '用户不存在' : '更新会员状态失败', 500);
        }

        return jsonOk({
            success: true,
            membership: planId,
            credits: result.credits ?? 0,
            expiresAt: result.expires_at ?? null,
        });
    } catch (error) {
        console.error('[membership/upgrade] Error:', error);
        return jsonError('服务器错误', 500);
    }
}
