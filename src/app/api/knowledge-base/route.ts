import { NextRequest } from 'next/server';
import { getSystemAdminClient } from '@/lib/api-utils';
import { getEffectiveMembershipType } from '@/lib/user/membership-server';
import { requireUserContext, jsonError, jsonOk } from '@/lib/api-utils';
import { ensureFeatureRouteEnabled } from '@/lib/feature-gate-utils';

export async function GET(request: NextRequest) {
    const featureError = await ensureFeatureRouteEnabled('knowledge-base');
    if (featureError) return featureError;
    const auth = await requireUserContext(request);
    if ('error' in auth) return jsonError(auth.error.message, auth.error.status);
    const { user } = auth;

    const service = getSystemAdminClient();
    const { data, error } = await service
        .from('knowledge_bases')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) return jsonError('获取知识库失败', 500);
    return jsonOk({ knowledgeBases: data || [] });
}

export async function POST(request: NextRequest) {
    const featureError = await ensureFeatureRouteEnabled('knowledge-base');
    if (featureError) return featureError;
    const auth = await requireUserContext(request);
    if ('error' in auth) return jsonError(auth.error.message, auth.error.status);
    const { user, supabase } = auth;

    const body = await request.json() as { name?: string; description?: string; weight?: 'low' | 'normal' | 'high' };
    if (!body.name) return jsonError('name 不能为空', 400);

    const membership = await getEffectiveMembershipType(user.id);
    if (membership === 'free') {
        return jsonError('当前会员等级无法创建知识库', 403);
    }

    const limit = membership === 'plus' ? 3 : 10;
    const { data, error } = await supabase.rpc('create_knowledge_base_with_limit', {
        p_user_id: user.id,
        p_name: body.name,
        p_description: body.description ?? null,
        p_weight: body.weight ?? 'normal',
        p_limit: limit,
    });

    if (error) {
        console.error('[knowledge-base] Failed to create knowledge base transactionally:', error);
        return jsonError('创建知识库失败', 500);
    }

    const result = (Array.isArray(data) ? data[0] : data) as {
        status?: string;
        knowledge_base?: Record<string, unknown> | null;
    } | null;
    if (result?.status === 'limit_reached') {
        return jsonError('知识库数量已达上限', 403);
    }

    if (result?.status !== 'ok' || !result.knowledge_base) {
        console.error('[knowledge-base] Invalid create knowledge base RPC result:', data);
        return jsonError('创建知识库失败', 500);
    }

    return jsonOk(result.knowledge_base);
}
