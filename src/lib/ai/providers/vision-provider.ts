/**
 * Vision AI Provider
 * 
 * 支持图像输入的 OpenAI 兼容格式 Provider
 * 用于 Qwen VL 和 Gemini VL 视觉模型
 */

import type { AIModelConfig, AIVendor } from '@/types';
import type { AIProvider, AIProviderOptions, AIRequestMessage } from './base';
import { buildGenerationConfigPayload, createMockStream, getApiKey } from './base';

/** 图像内容格式 */
interface ImageContent {
    type: 'image_url';
    image_url: {
        url: string;  // data:image/jpeg;base64,... 格式
    };
}

/** 文本内容格式 */
interface TextContent {
    type: 'text';
    text: string;
}

/** 视觉消息内容 */
type VisionContent = ImageContent | TextContent;

/** 视觉消息格式 */
interface VisionMessage {
    role: 'user' | 'assistant' | 'system';
    content: string | VisionContent[];
}

/** 视觉请求选项扩展 */
export interface VisionProviderOptions extends AIProviderOptions {
    imageBase64?: string;  // Base64 编码的图片数据
    imageMimeType?: string;  // 图片 MIME 类型，默认 image/jpeg
}

/**
 * 将消息转换为视觉 API 格式
 */
function toVisionMessages(
    messages: AIRequestMessage[],
    imageBase64?: string,
    mimeType: string = 'image/jpeg'
): VisionMessage[] {
    return messages.map((msg, index) => {
        // 只在最后一条用户消息中添加图片
        if (msg.role === 'user' && imageBase64 && index === messages.length - 1) {
            const content: VisionContent[] = [
                {
                    type: 'image_url',
                    image_url: {
                        url: `data:${mimeType};base64,${imageBase64}`
                    }
                },
                {
                    type: 'text',
                    text: msg.content
                }
            ];
            return {
                role: msg.role,
                content
            };
        }
        return {
            role: msg.role,
            content: msg.content
        };
    });
}

/**
 * Vision AI Provider
 */
export class VisionProvider implements AIProvider {
    constructor(public readonly vendor: AIVendor) { }

    isAvailable(config: AIModelConfig): boolean {
        const key = getApiKey(config.apiKeyEnvVar);
        return !!key && key !== 'your_api_key_here';
    }

    async chat(
        messages: AIRequestMessage[],
        systemPrompt: string,
        config: AIModelConfig,
        options?: VisionProviderOptions
    ): Promise<string> {
        const apiKey = getApiKey(config.apiKeyEnvVar);

        if (!this.isAvailable(config)) {
            throw new Error(`${config.name} API key not configured`);
        }

        const visionMessages = toVisionMessages(
            messages,
            options?.imageBase64,
            options?.imageMimeType
        );

        // Qwen VL 推理模式需要 enable_thinking 参数
        const extraParams: Record<string, unknown> = {};
        if (config.vendor === 'qwen-vl' && options?.reasoning) {
            extraParams.enable_thinking = true;
        }

        const response = await fetch(config.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: config.modelId,
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...visionMessages,
                ],
                ...extraParams,
                ...buildGenerationConfigPayload(config, options),
            }),
        });

        if (!response.ok) {
            const errorText = await response.text().catch(() => '');
            throw new Error(`${config.name} API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }

    async chatStream(
        messages: AIRequestMessage[],
        systemPrompt: string,
        config: AIModelConfig,
        options?: VisionProviderOptions
    ): Promise<ReadableStream<Uint8Array>> {
        const apiKey = getApiKey(config.apiKeyEnvVar);

        if (!this.isAvailable(config)) {
            return createMockStream(`${config.name} API 未配置，这是模拟响应。`);
        }

        const visionMessages = toVisionMessages(
            messages,
            options?.imageBase64,
            options?.imageMimeType
        );

        // Qwen VL 推理模式需要 enable_thinking 参数
        const extraParams: Record<string, unknown> = {};
        if (config.vendor === 'qwen-vl' && options?.reasoning) {
            extraParams.enable_thinking = true;
        }

        const response = await fetch(config.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: config.modelId,
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...visionMessages,
                ],
                stream: true,
                ...extraParams,
                ...buildGenerationConfigPayload(config, options),
            }),
        });

        if (!response.ok) {
            const errorText = await response.text().catch(() => '');
            throw new Error(`${config.name} API error: ${response.status} - ${errorText}`);
        }

        return response.body!;
    }
}

// 导出视觉 Provider 实例
export const qwenVlProvider = new VisionProvider('qwen-vl');
export const geminiVlProvider = new VisionProvider('gemini-vl');
