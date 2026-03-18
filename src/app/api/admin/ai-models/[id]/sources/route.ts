/**
 * AI 模型网关绑定管理 API
 *
 * GET: 获取模型的所有网关绑定
 * POST: 添加新绑定
 */
import { NextRequest } from 'next/server';
import { requireAdminUser, jsonError, jsonOk, getSystemAdminClient } from '@/lib/api-utils';
import { clearModelCache } from '@/lib/server/ai-config';
import {
    buildManagedApiUrl,
    DEFAULT_AI_TRANSPORT,
    getModelUsageType,
    isManagedSourceKey,
    sortModelSources,
} from '@/lib/ai/source-runtime';

function hasEnvVar(envVarName: string): boolean {
    return !!envVarName && !!process.env[envVarName];
}

type RouteContext = {
    params: Promise<{ id: string }>;
};

type GatewayRow = {
    id: string;
    gateway_key: string | null;
    display_name: string | null;
    base_url: string | null;
    api_key_env_var: string | null;
    transport?: string | null;
    is_enabled?: boolean | null;
    notes?: string | null;
};

type BindingRow = {
    id: string;
    model_id_override: string | null;
    reasoning_model_id: string | null;
    is_enabled: boolean;
    priority?: number | null;
    notes?: string | null;
    gateway?: GatewayRow | GatewayRow[] | null;
};

type BindingSourceResponse = {
    id: string;
    sourceKey: string;
    sourceName: string;
    apiUrl: string;
    apiKeyEnvVar: string;
    hasApiKey: boolean;
    transport: string;
    modelIdOverride: string | null;
    reasoningModelId: string | null;
    isActive: boolean;
    isEnabled: boolean;
    priority: number;
    maxContextTokens: null;
    maxOutputTokens: null;
    notes: string | null;
};

function pickGateway(input: BindingRow['gateway']): GatewayRow | null {
    if (Array.isArray(input)) {
        return input[0] ?? null;
    }
    return input ?? null;
}

async function getModelUsageMeta(supabase: ReturnType<typeof getSystemAdminClient>, modelId: string) {
    const { data: model, error } = await supabase
        .from('ai_models')
        .select('model_key, usage_type, supports_vision')
        .eq('id', modelId)
        .single();

    if (error || !model) {
        return null;
    }

    return {
        modelKey: model.model_key as string,
        usageType: getModelUsageType({
            usageType: model.usage_type,
            supportsVision: model.supports_vision,
        }),
    };
}

function mapBindingSources(bindings: BindingRow[], usageType: 'chat' | 'vision' | 'embedding' | 'rerank') {
    const mappedSources = bindings
        .map((binding) => {
            const gateway = pickGateway(binding.gateway);
            if (!gateway || !isManagedSourceKey(gateway.gateway_key)) {
                return null;
            }

            return {
                id: binding.id,
                sourceKey: gateway.gateway_key || '',
                sourceName: gateway.display_name || gateway.gateway_key || '',
                apiUrl: buildManagedApiUrl(gateway.base_url, usageType),
                apiKeyEnvVar: gateway.api_key_env_var || '',
                hasApiKey: hasEnvVar(gateway.api_key_env_var || ''),
                transport: gateway.transport || DEFAULT_AI_TRANSPORT,
                modelIdOverride: binding.model_id_override,
                reasoningModelId: binding.reasoning_model_id,
                isActive: false,
                isEnabled: binding.is_enabled !== false && gateway.is_enabled !== false,
                priority: binding.priority ?? 0,
                maxContextTokens: null,
                maxOutputTokens: null,
                notes: binding.notes ?? gateway.notes ?? null,
            } satisfies BindingSourceResponse;
        })
        .filter((source): source is BindingSourceResponse => source !== null);

    const sortedSources = sortModelSources(mappedSources);
    let activeAssigned = false;

    return sortedSources.map((source) => {
        const isActive = !activeAssigned && source.isEnabled;
        if (isActive) {
            activeAssigned = true;
        }
        return {
            ...source,
            isActive,
        };
    });
}

export async function GET(request: NextRequest, context: RouteContext) {
    const authResult = await requireAdminUser(request);
    if ('error' in authResult) {
        return jsonError(authResult.error.message, authResult.error.status);
    }

    const { id: modelId } = await context.params;
    const supabase = getSystemAdminClient();
    const modelMeta = await getModelUsageMeta(supabase, modelId);
    if (!modelMeta) {
        return jsonError('模型不存在', 404);
    }

    const { data: bindings, error } = await supabase
        .from('ai_model_gateway_bindings')
        .select(`
            id,
            model_id_override,
            reasoning_model_id,
            is_enabled,
            priority,
            notes,
            gateway:ai_gateways (
                id,
                gateway_key,
                display_name,
                base_url,
                api_key_env_var,
                transport,
                is_enabled,
                notes
            )
        `)
        .eq('model_id', modelId)
        .order('priority', { ascending: true });

    if (error) {
        console.error('[ai-models] Failed to fetch bindings:', error);
        return jsonError('获取来源列表失败', 500);
    }

    return jsonOk({ sources: mapBindingSources((bindings as BindingRow[] | null) || [], modelMeta.usageType) });
}

export async function POST(request: NextRequest, context: RouteContext) {
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
            modelIdOverride,
            reasoningModelId,
            isEnabled = true,
            priority,
            notes,
        } = body;

        if (!sourceKey) {
            return jsonError('缺少必填字段: sourceKey', 400);
        }
        if (!isManagedSourceKey(sourceKey)) {
            return jsonError('仅支持 NewAPI 和 Octopus 来源', 400);
        }

        const modelMeta = await getModelUsageMeta(supabase, modelId);
        if (!modelMeta) {
            return jsonError('模型不存在', 404);
        }

        const { data: gateway, error: gatewayError } = await supabase
            .from('ai_gateways')
            .select('id')
            .eq('gateway_key', sourceKey)
            .single();

        if (gatewayError || !gateway) {
            return jsonError('来源网关不存在，请先在网关管理中配置', 404);
        }

        const { count } = await supabase
            .from('ai_model_gateway_bindings')
            .select('*', { count: 'exact', head: true })
            .eq('model_id', modelId);

        const normalizedPriority = Number.isFinite(priority) ? priority : (count || 0);

        const { data: binding, error } = await supabase
            .from('ai_model_gateway_bindings')
            .insert({
                model_id: modelId,
                gateway_id: gateway.id,
                model_id_override: modelIdOverride || modelMeta.modelKey,
                reasoning_model_id: reasoningModelId,
                is_enabled: isEnabled,
                priority: normalizedPriority,
                notes,
            })
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                return jsonError('该来源已存在', 409);
            }
            console.error('[ai-models] Failed to create binding:', error);
            return jsonError('创建来源失败', 500);
        }

        clearModelCache();

        return jsonOk({ success: true, source: binding }, 201);
    } catch (e) {
        console.error('[ai-models] Invalid request body:', e);
        return jsonError('请求格式错误', 400);
    }
}
