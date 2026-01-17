/**
 * AI Providers 入口
 * 
 * 提供统一的 Provider 获取接口
 */

import type { AIModelConfig, AIVendor } from '@/types';
import type { AIProvider } from './base';
import { deepseekProvider, glmProvider, qwenProvider, deepaiProvider } from './openai-compatible';
import { geminiNativeProvider } from './gemini-native';
import { OpenAICompatibleProvider } from './openai-compatible';
import { qwenVlProvider, geminiVlProvider } from './vision-provider';

// Provider 注册表（按供应商）
const providers: Record<AIVendor, AIProvider> = {
    deepseek: deepseekProvider,
    glm: glmProvider,
    gemini: geminiNativeProvider,
    qwen: qwenProvider,
    deepai: deepaiProvider,
    'qwen-vl': qwenVlProvider,
    'gemini-vl': geminiVlProvider,
};

// Gemini Pro 使用 OpenAI 兼容格式（非原生）
const geminiProProvider = new OpenAICompatibleProvider('gemini');

/**
 * 根据模型配置获取合适的 Provider
 */
export function getProvider(config: AIModelConfig): AIProvider {
    // Gemini Pro 系列使用 OpenAI 兼容 API
    if (config.vendor === 'gemini' && config.id.includes('pro')) {
        return geminiProProvider;
    }

    const provider = providers[config.vendor];
    if (!provider) {
        throw new Error(`Unknown vendor: ${config.vendor}`);
    }
    return provider;
}

/**
 * 根据供应商获取 Provider
 */
export function getProviderByVendor(vendor: AIVendor): AIProvider {
    const provider = providers[vendor];
    if (!provider) {
        throw new Error(`Unknown vendor: ${vendor}`);
    }
    return provider;
}

// 导出类型和工具函数
export type { AIProvider, AIProviderOptions, AIStreamChunk } from './base';
export { createMockStream, getApiKey } from './base';
export type { VisionProviderOptions } from './vision-provider';

