/**
 * AI 模型来源管理 API
 *
 * GET: 获取模型的所有来源
 * POST: 添加新来源
 */
import { NextRequest } from 'next/server';
import { requireAdminUser, jsonError, jsonOk, getSystemAdminClient } from '@/lib/api-utils';
import { clearModelCache } from '@/lib/server/ai-config';

// 检查环境变量是否存在
function hasEnvVar(envVarName: string): boolean {
    return !!process.env[envVarName];
}

type RouteContext = {
    params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
    // 验证管理员权限
    const authResult = await requireAdminUser(request);
    if ('error' in authResult) {
        return jsonError(authResult.error.message, authResult.error.status);
    }

    const { id: modelId } = await context.params;
    const supabase = getSystemAdminClient();

    const { data: sources, error } = await supabase
        .from('ai_model_sources')
        .select('*')
        .eq('model_id', modelId)
        .order('priority', { ascending: true });

    if (error) {
        console.error('[ai-models] Failed to fetch sources:', error);
        return jsonError('获取来源列表失败', 500);
    }

    const formattedSources = sources?.map(source => ({
        id: source.id,
        sourceKey: source.source_key,
        sourceName: source.source_name,
        apiUrl: source.api_url,
        apiKeyEnvVar: source.api_key_env_var,
        hasApiKey: hasEnvVar(source.api_key_env_var),
        modelIdOverride: source.model_id_override,
        reasoningModelId: source.reasoning_model_id,
        isActive: source.is_active,
        isEnabled: source.is_enabled,
        priority: source.priority,
        maxContextTokens: source.max_context_tokens,
        maxOutputTokens: source.max_output_tokens,
        notes: source.notes,
    })) || [];

    return jsonOk({ sources: formattedSources });
}

export async function POST(request: NextRequest, context: RouteContext) {
    // 验证管理员权限
    const authResult = await requireAdminUser(request);
    if ('error' in authResult) {
        return jsonError(authResult.error.message, authResult.error.status);
    }

    const { id: modelId } = await context.params;
    const supabase = getSystemAdminClient();

    try {
        const body = await request.json();
        const {
            sourceKey,
            sourceName,
            apiUrl,
            apiKeyEnvVar,
            modelIdOverride,
            reasoningModelId,
            isActive = false,
            isEnabled = true,
            priority = 0,
            maxContextTokens,
            maxOutputTokens,
            notes,
        } = body;

        // 验证必填字段
        if (!sourceKey || !sourceName || !apiUrl || !apiKeyEnvVar) {
            return jsonError('缺少必填字段: sourceKey, sourceName, apiUrl, apiKeyEnvVar', 400);
        }

        // 检查模型是否存在
        const { data: model } = await supabase
            .from('ai_models')
            .select('id')
            .eq('id', modelId)
            .single();

        if (!model) {
            return jsonError('模型不存在', 404);
        }

        // 如果要设置为活跃来源，先取消其他来源的活跃状态
        if (isActive) {
            await supabase
                .from('ai_model_sources')
                .update({ is_active: false })
                .eq('model_id', modelId);
        }

        // 插入来源
        const { data: source, error } = await supabase
            .from('ai_model_sources')
            .insert({
                model_id: modelId,
                source_key: sourceKey,
                source_name: sourceName,
                api_url: apiUrl,
                api_key_env_var: apiKeyEnvVar,
                model_id_override: modelIdOverride,
                reasoning_model_id: reasoningModelId,
                is_active: isActive,
                is_enabled: isEnabled,
                priority,
                max_context_tokens: maxContextTokens,
                max_output_tokens: maxOutputTokens,
                notes,
            })
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                return jsonError('该来源已存在', 409);
            }
            console.error('[ai-models] Failed to create source:', error);
            return jsonError('创建来源失败', 500);
        }

        // 清除配置缓存
        clearModelCache();

        return jsonOk({ success: true, source }, 201);
    } catch (e) {
        console.error('[ai-models] Invalid request body:', e);
        return jsonError('请求格式错误', 400);
    }
}
