/**
 * OpenAI 兼容格式 Provider
 * 
 * 用于支持 OpenAI 兼容 API 的供应商：DeepSeek, GLM, Qwen, DeepAI, Gemini Pro
 */

import type { AIModelConfig, AIVendor } from '@/types';
import type { AIProvider, AIProviderOptions, AIRequestMessage } from './base';
import { toOpenAIMessages, createMockStream, getApiKey } from './base';

/**
 * OpenAI 兼容格式 Provider
 */
export class OpenAICompatibleProvider implements AIProvider {
    constructor(public readonly vendor: AIVendor) { }

    isAvailable(config: AIModelConfig): boolean {
        const key = getApiKey(config.apiKeyEnvVar);
        return !!key && key !== 'your_api_key_here';
    }

    async chat(
        messages: AIRequestMessage[],
        systemPrompt: string,
        config: AIModelConfig,
        options?: AIProviderOptions
    ): Promise<string> {
        const apiKey = getApiKey(config.apiKeyEnvVar);

        if (!this.isAvailable(config)) {
            throw new Error(`${config.name} API key not configured`);
        }

        // 确定要使用的模型 ID
        const modelId = (options?.reasoning && config.reasoningModelId)
            ? config.reasoningModelId
            : config.modelId;

        const response = await fetch(config.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: modelId,
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...toOpenAIMessages(messages),
                ],
                temperature: options?.temperature ?? config.defaultTemperature ?? 0.7,
                max_tokens: options?.maxTokens ?? config.defaultMaxTokens ?? 2000,
                // GLM 思考模式
                ...(config.vendor === 'glm' && options?.reasoning ? { thinking: { type: 'enabled' } } : {}),
            }),
        });

        if (!response.ok) {
            throw new Error(`${config.name} API error: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }

    async chatStream(
        messages: AIRequestMessage[],
        systemPrompt: string,
        config: AIModelConfig,
        options?: AIProviderOptions
    ): Promise<ReadableStream<Uint8Array>> {
        const apiKey = getApiKey(config.apiKeyEnvVar);

        if (!this.isAvailable(config)) {
            return createMockStream(`${config.name} API 未配置，这是模拟响应。`);
        }

        // 确定要使用的模型 ID
        const modelId = (options?.reasoning && config.reasoningModelId)
            ? config.reasoningModelId
            : config.modelId;

        const response = await fetch(config.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: modelId,
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...toOpenAIMessages(messages),
                ],
                temperature: options?.temperature ?? config.defaultTemperature ?? 0.7,
                max_tokens: options?.maxTokens ?? config.defaultMaxTokens ?? 2000,
                stream: true,
                // GLM 思考模式
                ...(config.vendor === 'glm' && options?.reasoning ? { thinking: { type: 'enabled' } } : {}),
            }),
        });

        if (!response.ok) {
            throw new Error(`${config.name} API error: ${response.status}`);
        }

        return response.body!;
    }
}

// 导出各供应商的 Provider 实例
export const deepseekProvider = new OpenAICompatibleProvider('deepseek');
export const glmProvider = new OpenAICompatibleProvider('glm');
export const qwenProvider = new OpenAICompatibleProvider('qwen');
export const deepaiProvider = new OpenAICompatibleProvider('deepai');
