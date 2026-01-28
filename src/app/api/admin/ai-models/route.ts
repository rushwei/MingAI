/**
 * AI 模型管理 API
 *
 * GET: 获取所有模型配置（含来源）
 * POST: 创建新模型
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAdminUser, jsonError, jsonOk, getServiceRoleClient } from '@/lib/api-utils';

// 检查环境变量是否存在
function hasEnvVar(envVarName: string): boolean {
    return !!process.env[envVarName];
}

export async function GET(request: NextRequest) {
    // 验证管理员权限
    const authResult = await requireAdminUser(request);
    if ('error' in authResult) {
        return jsonError(authResult.error.message, authResult.error.status);
    }

    const supabase = getServiceRoleClient();
    const url = new URL(request.url);
    const includeDisabled = url.searchParams.get('includeDisabled') === 'true';

    // 构建查询
    let query = supabase
        .from('ai_models')
        .select(`
            id,
            model_key,
            display_name,
            vendor,
            is_enabled,
            sort_order,
            required_tier,
            supports_reasoning,
            reasoning_required_tier,
            is_reasoning_default,
            supports_vision,
            default_temperature,
            default_max_tokens,
            description,
            created_at,
            updated_at,
            sources:ai_model_sources (
                id,
                source_key,
                source_name,
                api_url,
                api_key_env_var,
                model_id_override,
                reasoning_model_id,
                is_active,
                is_enabled,
                priority,
                max_context_tokens,
                max_output_tokens,
                notes
            )
        `)
        .order('sort_order', { ascending: true });

    if (!includeDisabled) {
        query = query.eq('is_enabled', true);
    }

    const { data: models, error } = await query;

    if (error) {
        console.error('[ai-models] Failed to fetch models:', error);
        return jsonError('获取模型列表失败', 500);
    }

    // 转换为前端友好格式，并检查环境变量
    const formattedModels = models?.map(model => ({
        id: model.id,
        modelKey: model.model_key,
        displayName: model.display_name,
        vendor: model.vendor,
        isEnabled: model.is_enabled,
        sortOrder: model.sort_order,
        requiredTier: model.required_tier,
        supportsReasoning: model.supports_reasoning,
        reasoningRequiredTier: model.reasoning_required_tier,
        isReasoningDefault: model.is_reasoning_default,
        supportsVision: model.supports_vision,
        defaultTemperature: model.default_temperature,
        defaultMaxTokens: model.default_max_tokens,
        description: model.description,
        createdAt: model.created_at,
        updatedAt: model.updated_at,
        sources: model.sources?.map((source: {
            id: string;
            source_key: string;
            source_name: string;
            api_url: string;
            api_key_env_var: string;
            model_id_override: string | null;
            reasoning_model_id: string | null;
            is_active: boolean;
            is_enabled: boolean;
            priority: number;
            max_context_tokens: number | null;
            max_output_tokens: number | null;
            notes: string | null;
        }) => ({
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
        })) || [],
    })) || [];

    return jsonOk({ models: formattedModels });
}

export async function POST(request: NextRequest) {
    // 验证管理员权限
    const authResult = await requireAdminUser(request);
    if ('error' in authResult) {
        return jsonError(authResult.error.message, authResult.error.status);
    }

    const supabase = getServiceRoleClient();

    try {
        const body = await request.json();
        const {
            modelKey,
            displayName,
            vendor,
            isEnabled = true,
            sortOrder = 0,
            requiredTier = 'free',
            supportsReasoning = false,
            reasoningRequiredTier = 'plus',
            isReasoningDefault = false,
            supportsVision = false,
            defaultTemperature = 0.7,
            defaultMaxTokens = 4000,
            description,
        } = body;

        // 验证必填字段
        if (!modelKey || !displayName || !vendor) {
            return jsonError('缺少必填字段: modelKey, displayName, vendor', 400);
        }

        // 验证 tier 值
        const validTiers = ['free', 'plus', 'pro'];
        if (!validTiers.includes(requiredTier)) {
            return jsonError('无效的 requiredTier 值', 400);
        }
        if (!validTiers.includes(reasoningRequiredTier)) {
            return jsonError('无效的 reasoningRequiredTier 值', 400);
        }

        // 插入模型
        const { data: model, error } = await supabase
            .from('ai_models')
            .insert({
                model_key: modelKey,
                display_name: displayName,
                vendor,
                is_enabled: isEnabled,
                sort_order: sortOrder,
                required_tier: requiredTier,
                supports_reasoning: supportsReasoning,
                reasoning_required_tier: reasoningRequiredTier,
                is_reasoning_default: isReasoningDefault,
                supports_vision: supportsVision,
                default_temperature: defaultTemperature,
                default_max_tokens: defaultMaxTokens,
                description,
            })
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                return jsonError('模型标识已存在', 409);
            }
            console.error('[ai-models] Failed to create model:', error);
            return jsonError('创建模型失败', 500);
        }

        return NextResponse.json({ success: true, model }, { status: 201 });
    } catch (e) {
        console.error('[ai-models] Invalid request body:', e);
        return jsonError('请求格式错误', 400);
    }
}
