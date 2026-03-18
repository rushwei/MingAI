/**
 * 单个 AI 模型网关绑定管理 API
 *
 * PATCH: 更新绑定设置
 * DELETE: 删除绑定
 * POST: 提升该绑定为首选来源
 */
import { NextRequest } from 'next/server';
import { requireAdminUser, jsonError, jsonOk, getSystemAdminClient } from '@/lib/api-utils';
import { clearModelCache } from '@/lib/server/ai-config';
import { isManagedSourceKey } from '@/lib/ai/source-runtime';

type RouteContext = {
    params: Promise<{ id: string; sourceId: string }>;
};

type BindingIdentityRow = {
    id: string;
    is_enabled: boolean;
    gateway?: { gateway_key: string | null; is_enabled?: boolean | null } | Array<{ gateway_key: string | null; is_enabled?: boolean | null }> | null;
};

function pickGateway(input: BindingIdentityRow['gateway']) {
    if (Array.isArray(input)) {
        return input[0] ?? null;
    }
    return input ?? null;
}

async function getBindingIdentity(
    supabase: ReturnType<typeof getSystemAdminClient>,
    modelId: string,
    sourceId: string,
): Promise<BindingIdentityRow | null> {
    const { data: binding } = await supabase
        .from('ai_model_gateway_bindings')
        .select(`
            id,
            is_enabled,
            gateway:ai_gateways (
                gateway_key,
                is_enabled
            )
        `)
        .eq('id', sourceId)
        .eq('model_id', modelId)
        .single();

    return (binding as BindingIdentityRow | null) || null;
}

async function promoteBinding(
    supabase: ReturnType<typeof getSystemAdminClient>,
    modelId: string,
    sourceId: string,
) {
    const { data: bindings, error } = await supabase
        .from('ai_model_gateway_bindings')
        .select('id')
        .eq('model_id', modelId)
        .order('priority', { ascending: true });

    if (error || !bindings) {
        throw error ?? new Error('failed to load bindings');
    }

    const orderedIds = [
        sourceId,
        ...bindings.map((binding: { id: string }) => binding.id).filter((id: string) => id !== sourceId),
    ];

    for (const [index, id] of orderedIds.entries()) {
        const { error: updateError } = await supabase
            .from('ai_model_gateway_bindings')
            .update({ priority: index })
            .eq('id', id)
            .eq('model_id', modelId);

        if (updateError) {
            throw updateError;
        }
    }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
    const authResult = await requireAdminUser(request);
    if ('error' in authResult) {
        return jsonError(authResult.error.message, authResult.error.status);
    }

    const { id: modelId, sourceId } = await context.params;
    const supabase = getSystemAdminClient();

    try {
        const body = await request.json();
        const binding = await getBindingIdentity(supabase, modelId, sourceId);
        if (!binding) {
            return jsonError('来源不存在', 404);
        }

        const gateway = pickGateway(binding.gateway);
        if (!gateway || !isManagedSourceKey(gateway.gateway_key)) {
            return jsonError('仅支持 NewAPI 和 Octopus 来源', 400);
        }

        const updateData: Record<string, unknown> = {};
        if (body.modelIdOverride !== undefined) updateData.model_id_override = body.modelIdOverride;
        if (body.reasoningModelId !== undefined) updateData.reasoning_model_id = body.reasoningModelId;
        if (body.isEnabled !== undefined) updateData.is_enabled = body.isEnabled;
        if (body.priority !== undefined) updateData.priority = body.priority;
        if (body.notes !== undefined) updateData.notes = body.notes;

        if (Object.keys(updateData).length > 0) {
            const { error } = await supabase
                .from('ai_model_gateway_bindings')
                .update(updateData)
                .eq('id', sourceId)
                .eq('model_id', modelId);

            if (error) {
                console.error('[ai-models] Failed to update binding:', error);
                return jsonError('更新来源失败', 500);
            }
        }

        if (body.isActive === true) {
            await promoteBinding(supabase, modelId, sourceId);
        }

        clearModelCache();

        return jsonOk({ success: true });
    } catch (e) {
        console.error('[ai-models] Invalid request body:', e);
        return jsonError('请求格式错误', 400);
    }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
    const authResult = await requireAdminUser(request);
    if ('error' in authResult) {
        return jsonError(authResult.error.message, authResult.error.status);
    }

    const { id: modelId, sourceId } = await context.params;
    const supabase = getSystemAdminClient();
    const binding = await getBindingIdentity(supabase, modelId, sourceId);

    if (!binding) {
        return jsonError('来源不存在', 404);
    }

    const gateway = pickGateway(binding.gateway);
    if (!gateway || !isManagedSourceKey(gateway.gateway_key)) {
        return jsonError('仅支持 NewAPI 和 Octopus 来源', 400);
    }

    const { error } = await supabase
        .from('ai_model_gateway_bindings')
        .delete()
        .eq('id', sourceId)
        .eq('model_id', modelId);

    if (error) {
        console.error('[ai-models] Failed to delete binding:', error);
        return jsonError('删除来源失败', 500);
    }

    clearModelCache();

    return jsonOk({ success: true });
}

export async function POST(request: NextRequest, context: RouteContext) {
    const authResult = await requireAdminUser(request);
    if ('error' in authResult) {
        return jsonError(authResult.error.message, authResult.error.status);
    }

    const { id: modelId, sourceId } = await context.params;
    const supabase = getSystemAdminClient();
    const binding = await getBindingIdentity(supabase, modelId, sourceId);

    if (!binding) {
        return jsonError('来源不存在', 404);
    }

    const gateway = pickGateway(binding.gateway);
    if (!gateway || !isManagedSourceKey(gateway.gateway_key)) {
        return jsonError('仅支持 NewAPI 和 Octopus 来源', 400);
    }

    if (!binding.is_enabled || gateway.is_enabled === false) {
        return jsonError('无法激活已禁用的来源', 400);
    }

    try {
        await promoteBinding(supabase, modelId, sourceId);
    } catch (error) {
        console.error('[ai-models] Failed to activate binding:', error);
        return jsonError('激活来源失败', 500);
    }

    clearModelCache();

    return jsonOk({ success: true, message: '来源已激活' });
}
