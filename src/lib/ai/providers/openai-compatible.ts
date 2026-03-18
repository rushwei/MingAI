/**
 * OpenAI 兼容格式 Provider
 *
 * 用于支持 OpenAI 兼容 API 的供应商：DeepSeek, GLM, Qwen, DeepAI, Gemini Pro, Moonshot/Kimi
 */

import type { AIModelConfig, AIVendor } from '@/types';
import type { AIProvider, AIProviderOptions, AIRequestMessage } from './base';
import {
    toOpenAIMessages,
    createMockStream,
    getApiKey,
    buildGenerationConfigPayload,
} from './base';

/**
 * 检查是否是 NVIDIA API
 */
function isNvidiaApi(apiUrl: string): boolean {
    return apiUrl.includes('nvidia.com');
}

/**
 * 构建思考模式参数
 * 不同 API 使用不同的参数格式：
 * - NVIDIA DeepSeek/Kimi: chat_template_kwargs.thinking
 * - NVIDIA GLM: chat_template_kwargs.enable_thinking + clear_thinking
 * - 硅基流动 DeepSeek/GLM: enable_thinking 参数
 */
function buildThinkingParam(vendor: AIVendor, apiUrl: string, reasoning?: boolean): Record<string, unknown> {
    const isNvidia = isNvidiaApi(apiUrl);

    // GLM 模型
    if (vendor === 'glm') {
        if (isNvidia) {
            // NVIDIA GLM: 必须显式设置 enable_thinking，否则默认启用思考模式
            return {
                chat_template_kwargs: {
                    enable_thinking: !!reasoning,
                    clear_thinking: false
                }
            };
        }
        // 硅基流动 GLM: 使用 enable_thinking 参数
        return reasoning ? { enable_thinking: true } : {};
    }

    // DeepSeek 模型
    if (vendor === 'deepseek') {
        if (isNvidia) {
            // NVIDIA DeepSeek: 使用 chat_template_kwargs.thinking
            return { chat_template_kwargs: { thinking: !!reasoning } };
        }
        // 硅基流动 DeepSeek: 使用 enable_thinking 参数
        return reasoning ? { enable_thinking: true } : {};
    }

    // Moonshot/Kimi (NVIDIA API): 使用 chat_template_kwargs.thinking
    if (vendor === 'moonshot') {
        return { chat_template_kwargs: { thinking: !!reasoning } };
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
                ...buildThinkingParam(config.vendor, config.apiUrl, options?.reasoning),
                ...buildGenerationConfigPayload(config, options),
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

        // NVIDIA API 需要 Accept: text/event-stream for streaming
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        };
        if (isNvidiaApi(config.apiUrl)) {
            headers['Accept'] = 'text/event-stream';
        }

        const response = await fetch(config.apiUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                model: modelId,
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...toOpenAIMessages(messages),
                ],
                stream: true,
                ...buildThinkingParam(config.vendor, config.apiUrl, options?.reasoning),
                ...buildGenerationConfigPayload(config, options),
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
