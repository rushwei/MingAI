/**
 * AI 模型配置
 *
 * 支持从数据库动态加载模型配置，环境变量作为回退
 * 支持数组格式的 MODEL_ID 和 MODEL_NAME
 */

import type { AIModelConfig, AIVendor } from '@/types';

// ===== 数据库配置缓存 =====
let _dbModels: AIModelConfig[] | null = null;
let _dbLastFetch: number = 0;
const DB_CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

// ===== 环境变量解析工具 =====

/**
 * 解析可能是数组格式的环境变量
 */
function parseEnvArray(value: string | undefined): string[] {
    if (!value) return [];
    // 尝试解析 JSON 数组格式
    if (value.startsWith('[')) {
        try {
            return JSON.parse(value);
        } catch {
            return [value];
        }
    }
    return [value];
}

// ===== 动态生成模型配置 =====

export function buildModels(): AIModelConfig[] {
    const models: AIModelConfig[] = [];

    // ===== DeepSeek 普通版 =====
    if (process.env.DEEPSEEK_MODEL_ID) {
        models.push({
            id: 'deepseek-v3.2',
            name: process.env.DEEPSEEK_MODEL_NAME || 'DeepSeek V3.2',
            vendor: 'deepseek',
            modelId: process.env.DEEPSEEK_MODEL_ID,
            apiUrl: process.env.DEEPSEEK_API_URL || 'https://api.siliconflow.cn/v1/chat/completions',
            apiKeyEnvVar: 'DEEPSEEK_API_KEY',
            supportsReasoning: false,
            defaultMaxTokens: 4000,
        });
    }

    // ===== DeepSeek Pro（支持推理模式切换）=====
    const deepseekProIds = parseEnvArray(process.env.DEEPSEEK_PRO_MODEL_ID);
    const deepseekProNames = parseEnvArray(process.env.DEEPSEEK_PRO_MODEL_NAME);
    if (deepseekProIds.length > 0) {
        // 第一个是普通模型，第二个是 Reasoner
        models.push({
            id: 'deepseek-pro',
            name: deepseekProNames[0] || 'DeepSeek Pro',
            vendor: 'deepseek',
            modelId: deepseekProIds[0],
            apiUrl: process.env.DEEPSEEK_PRO_API_URL || 'https://api.deepseek.com/chat/completions',
            apiKeyEnvVar: 'DEEPSEEK_PRO_API_KEY',
            supportsReasoning: deepseekProIds.length > 1,
            reasoningModelId: deepseekProIds[1],
            defaultMaxTokens: 8000,
        });
    }

    // ===== GLM 普通版（支持思考模式）=====
    if (process.env.GLM_MODEL_ID) {
        models.push({
            id: 'glm-4.6',
            name: process.env.GLM_MODEL_NAME || 'GLM-4.6',
            vendor: 'glm',
            modelId: process.env.GLM_MODEL_ID,
            apiUrl: process.env.GLM_API_URL || 'https://api.siliconflow.cn/v1/chat/completions',
            apiKeyEnvVar: 'GLM_API_KEY',
            supportsReasoning: true,  // 支持思考模式
            defaultMaxTokens: 4000,
        });
    }


    // ===== GLM Pro（支持思考模式）=====
    if (process.env.GLM_PRO_MODEL_ID) {
        models.push({
            id: 'glm-4.7',
            name: process.env.GLM_PRO_MODEL_NAME || 'GLM-4.7',
            vendor: 'glm',
            modelId: process.env.GLM_PRO_MODEL_ID,
            apiUrl: process.env.GLM_PRO_API_URL || 'https://api.siliconflow.cn/v1/chat/completions',
            apiKeyEnvVar: 'GLM_PRO_API_KEY',
            supportsReasoning: true,  // 支持思考模式，可开启/关闭
            defaultMaxTokens: 8000,
        });
    }

    // ===== Gemini 普通版 =====
    if (process.env.GEMINI_MODEL_ID) {
        models.push({
            id: 'gemini-3',
            name: process.env.GEMINI_MODEL_NAME || 'Gemini 3',
            vendor: 'gemini',
            modelId: process.env.GEMINI_MODEL_ID,
            apiUrl: process.env.GEMINI_API_URL || 'https://generativelanguage.googleapis.com/v1beta',
            apiKeyEnvVar: 'GEMINI_API_KEY',
            supportsReasoning: false,
            defaultMaxTokens: 4000,
        });
    }

    // ===== Gemini Pro（默认开启推理）=====
    const geminiProIds = parseEnvArray(process.env.GEMINI_PRO_MODEL_ID);
    const geminiProNames = parseEnvArray(process.env.GEMINI_PRO_MODEL_NAME);
    geminiProIds.forEach((modelId, index) => {
        const name = geminiProNames[index] || `Gemini Pro ${index + 1}`;
        models.push({
            id: `gemini-pro-${index}`,
            name,
            vendor: 'gemini',
            modelId,
            apiUrl: process.env.GEMINI_PRO_API_URL || 'https://api2.qiandao.mom/v1/chat/completions',
            apiKeyEnvVar: 'GEMINI_PRO_API_KEY',
            supportsReasoning: true,
            isReasoningDefault: true,  // 默认开启推理
            defaultMaxTokens: 8000,
        });
    });

    // ===== Qwen（默认开启推理）=====
    if (process.env.QWEN_MODEL_ID) {
        models.push({
            id: 'qwen-3-max',
            name: process.env.QWEN_MODEL_NAME || 'Qwen 3 Max',
            vendor: 'qwen',
            modelId: process.env.QWEN_MODEL_ID,
            apiUrl: process.env.QWEN_API_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
            apiKeyEnvVar: 'QWEN_API_KEY',
            supportsReasoning: true,
            isReasoningDefault: true,  // 默认开启推理
            defaultMaxTokens: 8000,
        });
    }

    // ===== DeepAI（默认开启推理）=====
    const deepaiIds = parseEnvArray(process.env.DEEPAI_MODEL_ID);
    const deepaiNames = parseEnvArray(process.env.DEEPAI_MODEL_NAME);
    deepaiIds.forEach((modelId, index) => {
        const name = deepaiNames[index] || `DeepAI ${index + 1}`;
        models.push({
            id: `deepai-${modelId}`,
            name,
            vendor: 'deepai',
            modelId,
            apiUrl: process.env.DEEPAI_API_URL || 'https://mingai-deepai.zeabur.app/v1/chat/completions',
            apiKeyEnvVar: 'DEEPAI_API_KEY',
            supportsReasoning: true,
            isReasoningDefault: true,  // 默认开启推理
            defaultMaxTokens: 10000
        });
    });

    // ===== Qwen VL 视觉模型（支持推理开关）=====
    const qwenVlNames = parseEnvArray(process.env.QWEN_VL_MODEL_NAME);
    if (process.env.QWEN_VL_MODEL_ID) {
        models.push({
            id: 'qwen-vl-plus',
            name: qwenVlNames[0] || 'Qwen 3 Plus',
            vendor: 'qwen-vl',
            modelId: process.env.QWEN_VL_MODEL_ID,
            apiUrl: process.env.QWEN_VL_API_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
            apiKeyEnvVar: 'QWEN_VL_API_KEY',
            supportsReasoning: true,
            supportsVision: true,
            defaultMaxTokens: 8000,
        });
        // 支持推理开关 - 使用相同模型ID但区分推理模式
        if (qwenVlNames.length > 1) {
            models.push({
                id: 'qwen-vl-plus-reasoner',
                name: qwenVlNames[1] || 'Qwen 3 Plus Reasoner',
                vendor: 'qwen-vl',
                modelId: process.env.QWEN_VL_MODEL_ID,
                apiUrl: process.env.QWEN_VL_API_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
                apiKeyEnvVar: 'QWEN_VL_API_KEY',
                supportsReasoning: true,
                isReasoningDefault: true,
                supportsVision: true,
                defaultMaxTokens: 8000,
            });
        }
    }

    // ===== Gemini VL 视觉模型（仅推理）=====
    const geminiVlIds = parseEnvArray(process.env.GEMINI_VL_MODEL_ID);
    const geminiVlNames = parseEnvArray(process.env.GEMINI_VL_MODEL_NAME);
    geminiVlIds.forEach((modelId, index) => {
        const name = geminiVlNames[index] || `Gemini VL ${index + 1}`;
        models.push({
            id: `gemini-vl-${index}`,
            name,
            vendor: 'gemini-vl',
            modelId,
            apiUrl: process.env.GEMINI_VL_API_URL || 'https://api2.qiandao.mom/v1/chat/completions',
            apiKeyEnvVar: 'GEMINI_VL_API_KEY',
            supportsReasoning: true,
            isReasoningDefault: true,
            supportsVision: true,
            defaultMaxTokens: 8000,
        });
    });

    return models;
}

// 懒加载模型配置（环境变量）
let _models: AIModelConfig[] | null = null;

// ===== 数据库配置获取 =====

/**
 * 从数据库获取模型配置（仅服务端使用）
 * 包含 5 分钟内存缓存
 */
async function fetchModelsFromDB(): Promise<AIModelConfig[] | null> {
    // 检查是否在服务端环境
    if (typeof window !== 'undefined') {
        return null;
    }

    const now = Date.now();
    if (_dbModels && (now - _dbLastFetch) < DB_CACHE_TTL) {
        return _dbModels;
    }

    try {
        // 直接创建 service role 客户端，避免导入 api-utils 引发的 next/headers 问题
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { data: models, error } = await supabase
            .from('ai_models')
            .select(`
                *,
                sources:ai_model_sources(*)
            `)
            .eq('is_enabled', true)
            .order('sort_order', { ascending: true });

        if (error) {
            console.error('[ai-config] Failed to fetch from DB:', error);
            return null;
        }

        if (!models || models.length === 0) {
            return null;
        }

        _dbModels = models
            .map(m => {
                // 找到活跃的来源
                const activeSource = m.sources?.find((s: { is_active: boolean }) => s.is_active);
                if (!activeSource) {
                    console.warn(`[ai-config] Model ${m.model_key} has no active source`);
                    return null;
                }

                return {
                    id: m.model_key,
                    name: m.display_name,
                    vendor: m.vendor as AIVendor,
                    modelId: activeSource.model_id_override || m.model_key,
                    apiUrl: activeSource.api_url,
                    apiKeyEnvVar: activeSource.api_key_env_var,
                    supportsReasoning: m.supports_reasoning,
                    reasoningModelId: activeSource.reasoning_model_id,
                    isReasoningDefault: m.is_reasoning_default,
                    supportsVision: m.supports_vision,
                    defaultTemperature: m.default_temperature != null ? parseFloat(m.default_temperature) : undefined,
                    defaultMaxTokens: m.default_max_tokens,
                    // 访问控制
                    requiredTier: m.required_tier,
                    reasoningRequiredTier: m.reasoning_required_tier,
                    // 来源信息（用于统计）
                    sourceKey: activeSource.source_key,
                } as AIModelConfig;
            })
            .filter((m): m is AIModelConfig => m !== null);

        _dbLastFetch = now;
        return _dbModels;
    } catch (error) {
        console.error('[ai-config] Error fetching from DB:', error);
        return null;
    }
}

/**
 * 异步获取模型配置（数据库优先，环境变量回退）
 * 用于 API 路由等服务端场景
 */
export async function getModelsAsync(): Promise<AIModelConfig[]> {
    const dbModels = await fetchModelsFromDB();
    if (dbModels && dbModels.length > 0) {
        return dbModels;
    }
    // 回退到环境变量
    return buildModels();
}

/**
 * 同步获取模型配置
 * 优先使用数据库缓存，否则使用环境变量配置
 */
export function getModels(): AIModelConfig[] {
    // 如果数据库缓存可用，优先使用
    if (_dbModels && _dbModels.length > 0) {
        return _dbModels;
    }
    // 回退到环境变量配置
    if (_models === null) {
        _models = buildModels();
    }
    return _models;
}

/**
 * 清除模型配置缓存
 * 在管理员修改配置后调用
 */
export function clearModelCache(): void {
    _models = null;
    _dbModels = null;
    _dbLastFetch = 0;
    console.info('[ai-config] Model cache cleared');
}

// 为兼容性保留
export const AI_MODELS = buildModels();

// ===== 工具函数 =====

/**
 * 获取模型配置
 */
export function getModelConfig(modelId: string): AIModelConfig | undefined {
    const models = getModels();
    const direct = models.find(m => m.id === modelId);
    if (direct) return direct;
    if (modelId === 'deepseek-chat' || modelId === 'deepseek') {
        return models.find(m => m.id === 'deepseek-v3.2');
    }
    return undefined;
}

/**
 * 异步获取模型配置（确保从数据库加载）
 * 用于 API 路由，确保数据库配置的模型能被正确识别
 */
export async function getModelConfigAsync(modelId: string): Promise<AIModelConfig | undefined> {
    const models = await getModelsAsync();
    const direct = models.find(m => m.id === modelId);
    if (direct) return direct;
    if (modelId === 'deepseek-chat' || modelId === 'deepseek') {
        return models.find(m => m.id === 'deepseek-v3.2');
    }
    return undefined;
}

/**
 * 获取所有模型 ID 列表
 */
export function getAllModelIds(): string[] {
    return getModels().map(m => m.id);
}

/**
 * 按供应商获取模型列表
 */
export function getModelsByVendor(vendor: AIVendor): AIModelConfig[] {
    return getModels().filter(m => m.vendor === vendor);
}

/**
 * 获取供应商列表
 */
export function getAllVendors(): AIVendor[] {
    return [...new Set(getModels().map(m => m.vendor))];
}

/**
 * 默认模型
 */
export const DEFAULT_MODEL_ID = 'deepseek-v3.2';

/**
 * 模型名称映射（用于 UI 显示和消息记录）
 */
export function getModelName(modelId: string): string {
    const model = getModelConfig(modelId);
    return model?.name || modelId;
}

/**
 * 供应商显示名称
 */
export const VENDOR_NAMES: Record<AIVendor, string> = {
    deepseek: 'DeepSeek',
    glm: 'GLM',
    gemini: 'Gemini',
    qwen: 'Qwen',
    deepai: 'DeepAI',
    moonshot: 'Moonshot',
    'qwen-vl': 'Qwen 视觉模型',
    'gemini-vl': 'Gemini 视觉模型',
};

// ===== 视觉模型工具函数 =====

/**
 * 获取所有视觉模型
 */
export function getVisionModels(): AIModelConfig[] {
    return getModels().filter(m => m.supportsVision);
}

/**
 * 默认视觉模型 ID
 */
export const DEFAULT_VISION_MODEL_ID = 'qwen-vl-plus';
