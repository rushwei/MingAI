/**
 * 单个 AI 模型管理 API
 *
 * PATCH: 更新模型设置
 * DELETE: 删除模型
 */
import { NextRequest } from 'next/server';
import { requireAdminUser, jsonError, jsonOk, getSystemAdminClient } from '@/lib/api-utils';
import { clearModelCache } from '@/lib/server/ai-config';

type RouteContext = {
    params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
    // 验证管理员权限
    const authResult = await requireAdminUser(request);
    if ('error' in authResult) {
        return jsonError(authResult.error.message, authResult.error.status);
    }

    const { id } = await context.params;
    const supabase = getSystemAdminClient();

    try {
        const body = await request.json();
        const updateData: Record<string, unknown> = {};

        // 仅更新提供的字段
        if (body.displayName !== undefined) updateData.display_name = body.displayName;
        if (body.vendor !== undefined) updateData.vendor = body.vendor;
        if (body.isEnabled !== undefined) updateData.is_enabled = body.isEnabled;
        if (body.sortOrder !== undefined) updateData.sort_order = body.sortOrder;
        if (body.requiredTier !== undefined) {
            const validTiers = ['free', 'plus', 'pro'];
            if (!validTiers.includes(body.requiredTier)) {
                return jsonError('无效的 requiredTier 值', 400);
            }
            updateData.required_tier = body.requiredTier;
        }
        if (body.supportsReasoning !== undefined) updateData.supports_reasoning = body.supportsReasoning;
        if (body.reasoningRequiredTier !== undefined) {
            const validTiers = ['free', 'plus', 'pro'];
            if (!validTiers.includes(body.reasoningRequiredTier)) {
                return jsonError('无效的 reasoningRequiredTier 值', 400);
            }
            updateData.reasoning_required_tier = body.reasoningRequiredTier;
        }
        if (body.isReasoningDefault !== undefined) updateData.is_reasoning_default = body.isReasoningDefault;
        if (body.supportsVision !== undefined) updateData.supports_vision = body.supportsVision;
        if (body.defaultTemperature !== undefined) updateData.default_temperature = body.defaultTemperature;
        if (body.defaultMaxTokens !== undefined) updateData.default_max_tokens = body.defaultMaxTokens;
        if (body.description !== undefined) updateData.description = body.description;

        if (Object.keys(updateData).length === 0) {
            return jsonError('没有提供要更新的字段', 400);
        }

        const { data: model, error } = await supabase
            .from('ai_models')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('[ai-models] Failed to update model:', error);
            return jsonError('更新模型失败', 500);
        }

        if (!model) {
            return jsonError('模型不存在', 404);
        }

        // 清除配置缓存
        clearModelCache();

        return jsonOk({ success: true, model });
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

    const { id } = await context.params;
    const supabase = getSystemAdminClient();

    const { error } = await supabase
        .from('ai_models')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('[ai-models] Failed to delete model:', error);
        return jsonError('删除模型失败', 500);
    }

    // 清除配置缓存
    clearModelCache();

    return jsonOk({ success: true });
}
