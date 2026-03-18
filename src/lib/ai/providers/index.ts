/**
 * AI Providers 入口
 * 
 * 提供统一的 Provider 获取接口
 */

import type { AIModelConfig, AIVendor } from '@/types';
import type { AIProvider } from './base';
import { deepseekProvider, glmProvider, qwenProvider, deepaiProvider, moonshotProvider } from './openai-compatible';
import { OpenAICompatibleProvider } from './openai-compatible';
import { qwenVlProvider, geminiVlProvider, VisionProvider } from './vision-provider';
import { getModelUsageType } from '@/lib/ai/source-runtime';

// Provider 注册表（按供应商）
const providers: Record<string, AIProvider> = {
    openai: new OpenAICompatibleProvider('openai'),
    anthropic: new OpenAICompatibleProvider('anthropic'),
    google: new OpenAICompatibleProvider('google'),
    deepseek: deepseekProvider,
    glm: glmProvider,
    gemini: new OpenAICompatibleProvider('gemini'),
    qwen: qwenProvider,
    deepai: deepaiProvider,
    moonshot: moonshotProvider,
    'qwen-vl': qwenVlProvider,
    'gemini-vl': geminiVlProvider,
    xai: new OpenAICompatibleProvider('xai'),
    minimax: new OpenAICompatibleProvider('minimax'),
};

const genericOpenAICompatibleProvider = new OpenAICompatibleProvider('openai');
const genericVisionProvider = new VisionProvider('openai');

/**
 * 根据模型配置获取合适的 Provider
 */
export function getProvider(config: AIModelConfig): AIProvider {
    const usageType = getModelUsageType(config);
    if (usageType === 'vision') {
        const provider = providers[config.vendor];
        return provider || genericVisionProvider;
    }

    const provider = providers[config.vendor];
    return provider || genericOpenAICompatibleProvider;
}

/**
 * 根据供应商获取 Provider
 */
export function getProviderByVendor(vendor: AIVendor): AIProvider {
    const provider = providers[vendor];
    return provider || genericOpenAICompatibleProvider;
}

// 导出类型和工具函数
export type { AIProvider, AIProviderOptions, AIStreamChunk } from './base';
export { createMockStream, getApiKey } from './base';
export type { VisionProviderOptions } from './vision-provider';
