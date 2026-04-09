/**
 * 积分购买 API
 * 
 * 服务端处理积分购买请求，防止客户端绕过支付验证
 * MVP阶段使用模拟支付
 */

import { NextRequest } from 'next/server';
import { getPaymentsPaused } from '@/lib/app-settings';
import { getSystemAdminClient, jsonError, jsonOk, requireUserContext } from '@/lib/api-utils';
// getMembershipInfo 和 getCreditLimit 不再使用，改用服务端直接查询

// 按量付费套餐配置
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

        const supabase = getSystemAdminClient();
        const { data, error } = await supabase.rpc('complete_credit_purchase_as_service', {
            p_user_id: userId,
            p_amount: amount,
            p_credit_count: count,
        });

        const result = (data || {}) as { status?: string; credits?: number };
        if (error || result.status !== 'ok') {
            console.error('Error creating pay_per_use order:', error || result);
            return jsonError(result.status === 'user_not_found' ? '用户不存在' : '更新积分失败', 500);
        }

        return jsonOk({
            success: true,
            credits: result.credits ?? 0,
            purchased: count,
        });
    } catch (error) {
        console.error('[membership/purchase-credits] Error:', error);
        return jsonError('服务器错误', 500);
    }
}
