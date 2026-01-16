/**
 * AI 模型配置
 * 
 * 完全从环境变量动态加载模型配置
 * 支持数组格式的 MODEL_ID 和 MODEL_NAME
 */

import type { AIModelConfig, AIVendor } from '@/types';

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
            id: 'deepseek-v3',
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

    return models;
}

// 懒加载模型配置
let _models: AIModelConfig[] | null = null;

export function getModels(): AIModelConfig[] {
    if (_models === null) {
        _models = buildModels();
    }
    return _models;
}

// 为兼容性保留
export const AI_MODELS = buildModels();

// ===== 工具函数 =====

/**
 * 获取模型配置
 */
export function getModelConfig(modelId: string): AIModelConfig | undefined {
    return getModels().find(m => m.id === modelId);
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
export const DEFAULT_MODEL_ID = 'deepseek-v3';

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
};
