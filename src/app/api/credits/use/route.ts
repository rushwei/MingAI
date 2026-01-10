/**
 * 积分扣减 API
 * 
 * 服务端接口用于扣减用户积分
 */

import { NextRequest, NextResponse } from 'next/server';
import { useCredit, hasCredits } from '@/lib/credits';

export async function POST(request: NextRequest) {
    try {
        const { userId } = await request.json();

        if (!userId) {
            return NextResponse.json(
                { error: '缺少用户ID' },
                { status: 400 }
            );
        }

        // 检查是否有足够积分
        const hasEnough = await hasCredits(userId);

        if (!hasEnough) {
            return NextResponse.json(
                { error: '积分不足', code: 'INSUFFICIENT_CREDITS' },
                { status: 400 }
            );
        }

        // 扣减积分
        const remaining = await useCredit(userId);

        if (remaining === null) {
            return NextResponse.json(
                { error: '扣减失败', code: 'DEDUCTION_FAILED' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            remaining,
        });
    } catch (error) {
        console.error('[credits/use] Error:', error);
        return NextResponse.json(
            { error: '服务器错误' },
            { status: 500 }
        );
    }
}
