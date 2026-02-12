/**
 * 积分扣减 API
 * 
 * 服务端接口用于扣减用户积分
 */

import { NextRequest } from 'next/server';
import { useCredit, hasCredits } from '@/lib/user/credits';
import { getAuthContext, jsonError, jsonOk } from '@/lib/api-utils';

export async function POST(request: NextRequest) {
    try {
        const { userId } = await request.json();
        const { user } = await getAuthContext(request);
        if (!user) {
            return jsonError('请先登录', 401);
        }
        if (userId && userId !== user.id) {
            return jsonError('无权限操作', 403);
        }
        const targetUserId = user.id;

        // 检查是否有足够积分
        const hasEnough = await hasCredits(targetUserId);

        if (!hasEnough) {
            return jsonError('积分不足', 400, { code: 'INSUFFICIENT_CREDITS' });
        }

        // 扣减积分
        const remaining = await useCredit(targetUserId);

        if (remaining === null) {
            return jsonError('扣减失败', 500, { code: 'DEDUCTION_FAILED' });
        }

        return jsonOk({
            success: true,
            remaining,
        });
    } catch (error) {
        console.error('[credits/use] Error:', error);
        return jsonError('服务器错误', 500);
    }
}
