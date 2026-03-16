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

        const supabase = getSystemAdminClient();

        // 计算过期时间
        let expiresAt: Date | null = null;
        if (planId === 'plus') {
            expiresAt = new Date();
            expiresAt.setMonth(expiresAt.getMonth() + 1);
        } else if (planId === 'pro') {
            expiresAt = new Date();
            expiresAt.setMonth(expiresAt.getMonth() + 1);
        }

        // [MVP] 模拟支付：创建已支付订单
        // 生产环境应创建 pending 订单，等待支付回调确认
        const { data: orderRow, error: orderError } = await supabase
            .from('orders')
            .insert({
                user_id: userId,
                product_type: planId,
                amount: plan.price,
                status: 'paid', // MVP: 模拟支付直接标记为已支付
                payment_method: 'simulated',
                paid_at: new Date().toISOString(),
            })
            .select('id')
            .single();

        if (orderError) {
            console.error('Error creating order:', orderError);
            return jsonError('创建订单失败', 500);
        }

        // 使用服务端客户端获取当前积分（避免RLS问题）
        const { data: userData } = await supabase
            .from('users')
            .select('ai_chat_count')
            .eq('id', userId)
            .single();
        const currentCredits = userData?.ai_chat_count || 0;

        const boostedCredits = Math.min(currentCredits + plan.initialCredits, plan.creditLimit);
        const nextCredits = Math.max(currentCredits, boostedCredits);

        // 更新用户会员状态
        const updateData: Record<string, unknown> = {
            membership: planId,
            updated_at: new Date().toISOString(),
            // 叠加初始积分，但不超过上限
            ai_chat_count: nextCredits,
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
            if (orderRow?.id) {
                await supabase
                    .from('orders')
                    .delete()
                    .eq('id', orderRow.id)
                    .eq('user_id', userId);
            }
            return jsonError('更新会员状态失败', 500);
        }

        return jsonOk({
            success: true,
            membership: planId,
            credits: updateData.ai_chat_count,
            expiresAt: expiresAt?.toISOString() || null,
        });
    } catch (error) {
        console.error('[membership/upgrade] Error:', error);
        return jsonError('服务器错误', 500);
    }
}
