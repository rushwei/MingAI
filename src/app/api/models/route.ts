/**
 * 获取可用的 AI 模型配置
 *
 * 这个 API 在服务端运行，可以访问所有环境变量
 * 优先从数据库获取配置，环境变量作为回退
 */

import { NextRequest } from 'next/server';
import { getModelsAsync } from '@/lib/ai-config';
import type { MembershipType } from '@/lib/membership';
import { getEffectiveMembershipType } from '@/lib/membership-server';
import { getModelAccessForMembershipAsync } from '@/lib/ai-access';
import { getAuthContext, jsonOk } from '@/lib/api-utils';

async function resolveMembership(request: NextRequest): Promise<MembershipType> {
    const { user } = await getAuthContext(request);
    if (!user) {
        return 'free';
    }
    return getEffectiveMembershipType(user.id);
}

export async function GET(request: NextRequest) {
    // 从数据库获取模型配置（带缓存）
    const models = await getModelsAsync();
    const membership = await resolveMembership(request);

    // 返回模型配置（不包含敏感信息）
    const safeModels = await Promise.all(models.map(async m => {
        const access = await getModelAccessForMembershipAsync(m, membership);
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
    }));

    return jsonOk({ models: safeModels });
}
