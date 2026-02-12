/**
 * 积分购买 API
 * 
 * 服务端处理积分购买请求，防止客户端绕过支付验证
 * MVP阶段使用模拟支付
 */

import { NextRequest } from 'next/server';
import { getPaymentsPaused } from '@/lib/app-settings';
import { getServiceRoleClient, jsonError, jsonOk, requireUserContext } from '@/lib/api-utils';
import { addCredits } from '@/lib/user/credits';
// getMembershipInfo 和 getCreditLimit 不再使用，改用服务端直接查询

// 按量付费套餐配置（与 PayPerUse.tsx 保持一致）
const PRICE_PER_CREDIT = 9.9;
const creditPackages = [
    { count: 1, price: 9.9 },
    { count: 5, price: 45 },      // 省¥4.5
    { count: 10, price: 89 },     // 省¥10
    { count: 20, price: 168 },    // 省¥30
];

export async function POST(request: NextRequest) {
    try {
        const paymentsPaused = await getPaymentsPaused();
        if (paymentsPaused) {
            return jsonError('支付已暂停', 403);
        }

        const { count, amount } = await request.json();

        // 验证购买参数
        if (!count || count <= 0 || !amount || amount <= 0) {
            return jsonError('无效的购买参数', 400);
        }

        // 验证套餐是否存在，或者是自定义数量（按 9.9元/次 计算）
        const pkg = creditPackages.find(p => p.count === count && p.price === amount);
        const isValidCustom = !pkg && (
            count >= 1 &&
            count <= 999 &&
            Math.abs(amount - Math.round(count * PRICE_PER_CREDIT * 10) / 10) < 0.01
        );

        if (!pkg && !isValidCustom) {
            return jsonError('无效的套餐', 400);
        }

        const auth = await requireUserContext(request);
        if ('error' in auth) {
            return jsonError(auth.error.message, auth.error.status);
        }
        const { user } = auth;
        const userId = user.id;

        const supabase = getServiceRoleClient();

        // [MVP] 模拟支付：创建已支付订单
        // 生产环境应创建 pending 订单，等待支付回调确认
        const { data: orderRow, error: orderError } = await supabase
            .from('orders')
            .insert({
                user_id: userId,
                product_type: 'pay_per_use',
                amount: amount,
                status: 'paid', // MVP: 模拟支付直接标记为已支付
                payment_method: 'simulated',
                paid_at: new Date().toISOString(),
            })
            .select('id')
            .single();

        if (orderError) {
            console.error('Error creating pay_per_use order:', orderError);
            return jsonError('创建订单失败', 500);
        }

        // 使用原子增量避免并发覆盖
        const newCredits = await addCredits(userId, count);
        if (newCredits === null) {
            if (orderRow?.id) {
                await supabase
                    .from('orders')
                    .delete()
                    .eq('id', orderRow.id)
                    .eq('user_id', userId);
            }
            return jsonError('更新积分失败', 500);
        }

        return jsonOk({
            success: true,
            credits: newCredits,
            purchased: count,
        });
    } catch (error) {
        console.error('[membership/purchase-credits] Error:', error);
        return jsonError('服务器错误', 500);
    }
}
