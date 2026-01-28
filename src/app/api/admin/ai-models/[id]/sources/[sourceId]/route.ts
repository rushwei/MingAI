/**
 * 单个 AI 模型来源管理 API
 *
 * PATCH: 更新来源设置
 * DELETE: 删除来源
 * POST: 激活该来源（设为活跃）
 */
import { NextRequest } from 'next/server';
import { requireAdminUser, jsonError, jsonOk, getServiceRoleClient } from '@/lib/api-utils';
import { clearModelCache } from '@/lib/ai-config';

type RouteContext = {
    params: Promise<{ id: string; sourceId: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
    // 验证管理员权限
    const authResult = await requireAdminUser(request);
    if ('error' in authResult) {
        return jsonError(authResult.error.message, authResult.error.status);
    }

    const { id: modelId, sourceId } = await context.params;
    const supabase = getServiceRoleClient();

    try {
        const body = await request.json();
        const updateData: Record<string, unknown> = {};

        // 仅更新提供的字段
        if (body.sourceName !== undefined) updateData.source_name = body.sourceName;
        if (body.apiUrl !== undefined) updateData.api_url = body.apiUrl;
        if (body.apiKeyEnvVar !== undefined) updateData.api_key_env_var = body.apiKeyEnvVar;
        if (body.modelIdOverride !== undefined) updateData.model_id_override = body.modelIdOverride;
        if (body.reasoningModelId !== undefined) updateData.reasoning_model_id = body.reasoningModelId;
        if (body.isEnabled !== undefined) updateData.is_enabled = body.isEnabled;
        if (body.priority !== undefined) updateData.priority = body.priority;
        if (body.maxContextTokens !== undefined) updateData.max_context_tokens = body.maxContextTokens;
        if (body.maxOutputTokens !== undefined) updateData.max_output_tokens = body.maxOutputTokens;
        if (body.notes !== undefined) updateData.notes = body.notes;

        // 如果要设置为活跃来源
        if (body.isActive === true) {
            // 先取消其他来源的活跃状态
            await supabase
                .from('ai_model_sources')
                .update({ is_active: false })
                .eq('model_id', modelId);
            updateData.is_active = true;
        } else if (body.isActive === false) {
            updateData.is_active = false;
        }

        if (Object.keys(updateData).length === 0) {
            return jsonError('没有提供要更新的字段', 400);
        }

        const { data: source, error } = await supabase
            .from('ai_model_sources')
            .update(updateData)
            .eq('id', sourceId)
            .eq('model_id', modelId)
            .select()
            .single();

        if (error) {
            console.error('[ai-models] Failed to update source:', error);
            return jsonError('更新来源失败', 500);
        }

        if (!source) {
            return jsonError('来源不存在', 404);
        }

        // 清除配置缓存
        clearModelCache();

        return jsonOk({ success: true, source });
    } catch (e) {
        console.error('[ai-models] Invalid request body:', e);
        return jsonError('请求格式错误', 400);
    }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
    // 验证管理员权限
    const authResult = await requireAdminUser(request);
    if ('error' in authResult) {
        return jsonError(authResult.error.message, authResult.error.status);
    }

    const { id: modelId, sourceId } = await context.params;
    const supabase = getServiceRoleClient();

    // 检查是否是最后一个来源
    const { count } = await supabase
        .from('ai_model_sources')
        .select('*', { count: 'exact', head: true })
        .eq('model_id', modelId);

    if (count === 1) {
        return jsonError('无法删除最后一个来源，请先添加新来源', 400);
    }

    // 检查是否是活跃来源
    const { data: sourceToDelete } = await supabase
        .from('ai_model_sources')
        .select('is_active')
        .eq('id', sourceId)
        .single();

    const { error } = await supabase
        .from('ai_model_sources')
        .delete()
        .eq('id', sourceId)
        .eq('model_id', modelId);

    if (error) {
        console.error('[ai-models] Failed to delete source:', error);
        return jsonError('删除来源失败', 500);
    }

    // 如果删除的是活跃来源，自动激活优先级最高的来源
    if (sourceToDelete?.is_active) {
        const { data: nextSource } = await supabase
            .from('ai_model_sources')
            .select('id')
            .eq('model_id', modelId)
            .eq('is_enabled', true)
            .order('priority', { ascending: true })
            .limit(1)
            .single();

        if (nextSource) {
            await supabase
                .from('ai_model_sources')
                .update({ is_active: true })
                .eq('id', nextSource.id);
        }
    }

    // 清除配置缓存
    clearModelCache();

    return jsonOk({ success: true });
}

// POST: 激活该来源
export async function POST(request: NextRequest, context: RouteContext) {
    // 验证管理员权限
    const authResult = await requireAdminUser(request);
    if ('error' in authResult) {
        return jsonError(authResult.error.message, authResult.error.status);
    }

    const { id: modelId, sourceId } = await context.params;
    const supabase = getServiceRoleClient();

    // 检查来源是否存在且启用
    const { data: source } = await supabase
        .from('ai_model_sources')
        .select('is_enabled')
        .eq('id', sourceId)
        .eq('model_id', modelId)
        .single();

    if (!source) {
        return jsonError('来源不存在', 404);
    }

    if (!source.is_enabled) {
        return jsonError('无法激活已禁用的来源', 400);
    }

    // 取消其他来源的活跃状态
    await supabase
        .from('ai_model_sources')
        .update({ is_active: false })
        .eq('model_id', modelId);

    // 激活指定来源
    const { error } = await supabase
        .from('ai_model_sources')
        .update({ is_active: true })
        .eq('id', sourceId);

    if (error) {
        console.error('[ai-models] Failed to activate source:', error);
        return jsonError('激活来源失败', 500);
    }

    // 清除配置缓存
    clearModelCache();

    return jsonOk({ success: true, message: '来源已激活' });
}
