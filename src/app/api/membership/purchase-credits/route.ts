/**
 * 积分购买 API
 * 
 * 服务端处理积分购买请求，防止客户端绕过支付验证
 * MVP阶段使用模拟支付
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getPaymentsPaused } from '@/lib/app-settings';
// getMembershipInfo 和 getCreditLimit 不再使用，改用服务端直接查询

// 服务端 Supabase 客户端
const getSupabase = () => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
            return NextResponse.json(
                { error: '支付已暂停' },
                { status: 403 }
            );
        }

        const { count, amount } = await request.json();

        // 验证购买参数
        if (!count || count <= 0 || !amount || amount <= 0) {
            return NextResponse.json(
                { error: '无效的购买参数' },
                { status: 400 }
            );
        }

        // 验证套餐是否存在，或者是自定义数量（按 9.9元/次 计算）
        const pkg = creditPackages.find(p => p.count === count && p.price === amount);
        const isValidCustom = !pkg && (
            count >= 1 &&
            count <= 999 &&
            Math.abs(amount - Math.round(count * PRICE_PER_CREDIT * 10) / 10) < 0.01
        );

        if (!pkg && !isValidCustom) {
            return NextResponse.json(
                { error: '无效的套餐' },
                { status: 400 }
            );
        }

        // 获取当前用户
        const supabase = getSupabase();
        let userId: string | null = null;

        const authHeader = request.headers.get('authorization');
        if (authHeader) {
            const token = authHeader.replace('Bearer ', '');
            const { data: { user } } = await supabase.auth.getUser(token);
            userId = user?.id || null;
        }

        if (!userId) {
            return NextResponse.json(
                { error: '请先登录' },
                { status: 401 }
            );
        }

        // [MVP] 模拟支付：创建已支付订单
        // 生产环境应创建 pending 订单，等待支付回调确认
        const { error: orderError } = await supabase
            .from('orders')
            .insert({
                user_id: userId,
                product_type: 'pay_per_use',
                amount: amount,
                status: 'paid', // MVP: 模拟支付直接标记为已支付
                payment_method: 'simulated',
                paid_at: new Date().toISOString(),
            });

        if (orderError) {
            console.error('Error creating pay_per_use order:', orderError);
            return NextResponse.json(
                { error: '创建订单失败' },
                { status: 500 }
            );
        }

        // 使用服务端客户端获取当前积分（避免RLS问题）
        const { data: userData } = await supabase
            .from('users')
            .select('ai_chat_count')
            .eq('id', userId)
            .single();
        const currentCredits = userData?.ai_chat_count || 0;

        // 按量付费可以突破常规上限
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
            return NextResponse.json(
                { error: '更新积分失败' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            credits: newCredits,
            purchased: count,
        });
    } catch (error) {
        console.error('[membership/purchase-credits] Error:', error);
        return NextResponse.json(
            { error: '服务器错误' },
            { status: 500 }
        );
    }
}
