import { NextRequest } from 'next/server';
import { getAuthContext, jsonError, jsonOk, getServiceRoleClient } from '@/lib/api-utils';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { user } = await getAuthContext(_request);
    if (!user) return jsonError('请先登录', 401);

    const { id } = await params;
    const service = getServiceRoleClient();
    const { data, error } = await service
        .from('knowledge_bases')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .maybeSingle();

    if (error) return jsonError('获取知识库失败', 500);
    if (!data) return jsonError('知识库不存在', 404);
    return jsonOk(data as Record<string, unknown>);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { user } = await getAuthContext(request);
    if (!user) return jsonError('请先登录', 401);

    const { id } = await params;
    const body = await request.json() as { name?: string; description?: string | null; weight?: 'low' | 'normal' | 'high' };
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.weight !== undefined) updateData.weight = body.weight;

    const service = getServiceRoleClient();
    const { data, error } = await service
        .from('knowledge_bases')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id)
        .select('*')
        .single();

    if (error) return jsonError('更新知识库失败', 500);
    return jsonOk(data as Record<string, unknown>);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { user } = await getAuthContext(_request);
    if (!user) return jsonError('请先登录', 401);

    const { id } = await params;
    const service = getServiceRoleClient();
    const { error } = await service
        .from('knowledge_bases')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

    if (error) return jsonError('删除知识库失败', 500);
    return jsonOk({ success: true });
}
