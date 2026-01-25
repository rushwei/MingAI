/**
 * 积分扣减 API
 * 
 * 服务端接口用于扣减用户积分
 */

import { NextRequest, NextResponse } from 'next/server';
import { useCredit, hasCredits } from '@/lib/credits';
import { getAuthContext } from '@/lib/api-utils';

export async function POST(request: NextRequest) {
    try {
        const { userId } = await request.json();
        const { user } = await getAuthContext(request);
        if (!user) {
            return NextResponse.json(
                { error: '请先登录' },
                { status: 401 }
            );
        }
        if (userId && userId !== user.id) {
            return NextResponse.json(
                { error: '无权限操作' },
                { status: 403 }
            );
        }
        const targetUserId = user.id;

        // 检查是否有足够积分
        const hasEnough = await hasCredits(targetUserId);

        if (!hasEnough) {
            return NextResponse.json(
                { error: '积分不足', code: 'INSUFFICIENT_CREDITS' },
                { status: 400 }
            );
        }

        // 扣减积分
        const remaining = await useCredit(targetUserId);

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
