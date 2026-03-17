/**
 * 积分扣减 API
 *
 * 服务端接口用于扣减用户积分
 */

import { NextRequest } from 'next/server';
import { useCredit, hasCredits } from '@/lib/user/credits';
import { requireUserContext, jsonError, jsonOk } from '@/lib/api-utils';

export async function POST(request: NextRequest) {
    try {
        const auth = await requireUserContext(request);
        if ('error' in auth) {
            return jsonError(auth.error.message, auth.error.status);
        }
        const { user } = auth;

        // 检查是否有足够积分
        const hasEnough = await hasCredits(user.id);

        if (!hasEnough) {
            return jsonError('积分不足', 400, { code: 'INSUFFICIENT_CREDITS' });
        }

        // 扣减积分
        const remaining = await useCredit(user.id);

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
