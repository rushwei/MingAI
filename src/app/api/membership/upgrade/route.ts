/**
 * 会员升级 API
 * 
 * 服务端处理会员升级请求，防止客户端绕过支付验证
 * MVP阶段使用模拟支付
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { pricingPlans } from '@/lib/membership';
import { getPaymentsPaused } from '@/lib/app-settings';

// 服务端 Supabase 客户端
const getSupabase = () => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
    try {
        const paymentsPaused = await getPaymentsPaused();
        if (paymentsPaused) {
            return NextResponse.json(
                { error: '支付已暂停' },
                { status: 403 }
            );
        }

        const { planId } = await request.json();

        // 验证套餐
        if (!planId || planId === 'free') {
            return NextResponse.json(
                { error: '无效的套餐' },
                { status: 400 }
            );
        }

        const plan = pricingPlans.find(p => p.id === planId);
        if (!plan) {
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

        // 计算过期时间
        let expiresAt: Date | null = null;
        if (planId === 'plus') {
            expiresAt = new Date();
            expiresAt.setMonth(expiresAt.getMonth() + 1);
        } else if (planId === 'pro') {
            expiresAt = new Date();
            expiresAt.setFullYear(expiresAt.getFullYear() + 1);
        }

        // [MVP] 模拟支付：创建已支付订单
        // 生产环境应创建 pending 订单，等待支付回调确认
        const { error: orderError } = await supabase
            .from('orders')
            .insert({
                user_id: userId,
                product_type: planId,
                amount: plan.price,
                status: 'paid', // MVP: 模拟支付直接标记为已支付
                payment_method: 'simulated',
                paid_at: new Date().toISOString(),
            });

        if (orderError) {
            console.error('Error creating order:', orderError);
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

        // 更新用户会员状态
        const updateData: Record<string, unknown> = {
            membership: planId,
            updated_at: new Date().toISOString(),
            // 叠加初始积分，但不超过上限
            ai_chat_count: Math.min(currentCredits + plan.initialCredits, plan.creditLimit),
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
            return NextResponse.json(
                { error: '更新会员状态失败' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            membership: planId,
            credits: updateData.ai_chat_count,
            expiresAt: expiresAt?.toISOString() || null,
        });
    } catch (error) {
        console.error('[membership/upgrade] Error:', error);
        return NextResponse.json(
            { error: '服务器错误' },
            { status: 500 }
        );
    }
}
