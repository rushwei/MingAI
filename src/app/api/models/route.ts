/**
 * 获取可用的 AI 模型配置
 * 
 * 这个 API 在服务端运行，可以访问所有环境变量
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getModels } from '@/lib/ai-config';
import type { MembershipType } from '@/lib/membership';
import { getEffectiveMembershipType } from '@/lib/membership-server';
import { getModelAccessForMembership } from '@/lib/ai-access';

const getSupabase = () => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function resolveMembership(request: NextRequest): Promise<MembershipType> {
    const supabase = getSupabase();
    let userId: string | null = null;
    const membershipHint = request.headers.get('x-membership-type') as MembershipType | null;

    const authHeader = request.headers.get('authorization');
    if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        try {
            const { data: { user }, error } = await supabase.auth.getUser(token);
            if (error) {
                console.error('[models] Failed to resolve user from auth header:', error.message);
            }
            userId = user?.id || null;
        } catch (error) {
            console.error('[models] Failed to resolve user from auth header:', error);
        }
    }

    if (!userId) {
        const accessToken = request.cookies.get('sb-access-token')?.value;
        if (accessToken) {
            try {
                const { data: { user }, error } = await supabase.auth.getUser(accessToken);
                if (error) {
                    console.error('[models] Failed to resolve user from cookie:', error.message);
                }
                userId = user?.id || null;
            } catch (error) {
                console.error('[models] Failed to resolve user from cookie:', error);
            }
        }
    }

    if (!userId) {
        if (membershipHint === 'free' || membershipHint === 'plus' || membershipHint === 'pro') {
            return membershipHint;
        }
        return 'free';
    }
    return getEffectiveMembershipType(userId);
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
