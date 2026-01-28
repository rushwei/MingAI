/**
 * OpenAI 兼容格式 Provider
 *
 * 用于支持 OpenAI 兼容 API 的供应商：DeepSeek, GLM, Qwen, DeepAI, Gemini Pro, Moonshot/Kimi
 */

import type { AIModelConfig, AIVendor } from '@/types';
import type { AIProvider, AIProviderOptions, AIRequestMessage } from './base';
import { toOpenAIMessages, createMockStream, getApiKey } from './base';

/**
 * 构建思考模式参数
 * GLM 和 Moonshot(NVIDIA) 使用 thinking 参数控制推理模式
 */
function buildThinkingParam(vendor: AIVendor, reasoning?: boolean): Record<string, unknown> {
    // GLM: 仅在开启推理时添加 thinking 参数
    if (vendor === 'glm') {
        return reasoning ? { thinking: { type: 'enabled' } } : {};
    }

    // Moonshot/Kimi (NVIDIA API): 默认开启 thinking，需要显式禁用
    if (vendor === 'moonshot') {
        // 使用对象展开语法明确返回类型
        if (reasoning) {
            return { thinking: { type: 'enabled' } };
        }
        return { thinking: { type: 'disabled' } };
    }

    return {};
}

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
                max_tokens: options?.maxTokens ?? config.defaultMaxTokens ?? 4000,
                ...buildThinkingParam(config.vendor, options?.reasoning),
            }),
        });

        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            console.error(`[${config.vendor}] API error ${response.status}:`, errorText);
            throw new Error(`${config.name} API error: ${response.status} - ${errorText.slice(0, 200)}`);
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
                max_tokens: options?.maxTokens ?? config.defaultMaxTokens ?? 4000,
                stream: true,
                ...buildThinkingParam(config.vendor, options?.reasoning),
            }),
        });

        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            console.error(`[${config.vendor}] API stream error ${response.status}:`, errorText);
            throw new Error(`${config.name} API error: ${response.status} - ${errorText.slice(0, 200)}`);
        }

        return response.body!;
    }
}

// 导出各供应商的 Provider 实例
export const deepseekProvider = new OpenAICompatibleProvider('deepseek');
export const glmProvider = new OpenAICompatibleProvider('glm');
export const qwenProvider = new OpenAICompatibleProvider('qwen');
export const deepaiProvider = new OpenAICompatibleProvider('deepai');
export const moonshotProvider = new OpenAICompatibleProvider('moonshot');
