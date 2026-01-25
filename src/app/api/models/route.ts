/**
 * 获取可用的 AI 模型配置
 * 
 * 这个 API 在服务端运行，可以访问所有环境变量
 */

import { NextRequest, NextResponse } from 'next/server';
import { getModels } from '@/lib/ai-config';
import type { MembershipType } from '@/lib/membership';
import { getEffectiveMembershipType } from '@/lib/membership-server';
import { getModelAccessForMembership } from '@/lib/ai-access';
import { getAuthContext } from '@/lib/api-utils';

async function resolveMembership(request: NextRequest): Promise<MembershipType> {
    const { user } = await getAuthContext(request);
    if (!user) {
        return 'free';
    }
    return getEffectiveMembershipType(user.id);
}

export async function GET(request: NextRequest) {
    // 每次重新构建，避免缓存旧配置
    // const { buildModels } = await import('@/lib/ai-config');
    // const models = buildModels();
    const models = getModels();
    const membership = await resolveMembership(request);

    // 返回模型配置（不包含敏感信息）
    const safeModels = models.map(m => {
        const access = getModelAccessForMembership(m, membership);
        return {
            id: m.id,
            name: m.name,
            vendor: m.vendor,
            supportsReasoning: m.supportsReasoning,
            isReasoningDefault: m.isReasoningDefault,
            allowed: access.allowed,
            blockedReason: access.blockedReason,
            reasoningAllowed: access.reasoningAllowed,
        };
    });

    return NextResponse.json({ models: safeModels }, {
        headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
    });
}
