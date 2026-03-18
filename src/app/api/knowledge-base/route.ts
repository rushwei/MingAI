import { NextRequest } from 'next/server';
import { getSystemAdminClient } from '@/lib/api-utils';
import { getEffectiveMembershipType } from '@/lib/user/membership-server';
import { requireUserContext, jsonError, jsonOk } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
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
    const auth = await requireUserContext(request);
    if ('error' in auth) return jsonError(auth.error.message, auth.error.status);
    const { user } = auth;

    const body = await request.json() as { name?: string; description?: string; weight?: 'low' | 'normal' | 'high' };
    if (!body.name) return jsonError('name 不能为空', 400);

    const membership = await getEffectiveMembershipType(user.id);
    if (membership === 'free') {
        return jsonError('当前会员等级无法创建知识库', 403);
    }

    const limit = membership === 'plus' ? 3 : 10;
    const service = getSystemAdminClient();
    const { count: kbCount } = await service
        .from('knowledge_bases')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);

    if ((kbCount ?? 0) >= limit) {
        return jsonError('知识库数量已达上限', 403);
    }

    const { data, error } = await service
        .from('knowledge_bases')
        .insert({
            user_id: user.id,
            name: body.name,
            description: body.description ?? null,
            weight: body.weight ?? 'normal'
        })
        .select('*')
        .single();

    if (error) return jsonError('创建知识库失败', 500);
    return jsonOk(data as Record<string, unknown>);
}
