/**
 * Gemini Provider
 * 
 * 支持 Google Gemini 原生 API（非 OpenAI 兼容格式）
 */

import type { AIModelConfig } from '@/types';
import type { AIProvider, AIProviderOptions, AIRequestMessage } from './base';
import { createMockStream, getApiKey } from './base';

/**
 * Gemini Provider（原生 API）
 */
export class GeminiNativeProvider implements AIProvider {
    readonly vendor = 'gemini' as const;

    isAvailable(config: AIModelConfig): boolean {
        return !!getApiKey(config.apiKeyEnvVar);
    }

    /**
     * 将消息转换为 Gemini 格式
     */
    private toGeminiMessages(messages: AIRequestMessage[], systemPrompt: string) {
        return [
            { role: 'user', parts: [{ text: systemPrompt }] },
            ...messages.map(m => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content }]
            })),
        ];
    }

    async chat(
        messages: AIRequestMessage[],
        systemPrompt: string,
        config: AIModelConfig,
        options?: AIProviderOptions
    ): Promise<string> {
        const apiKey = getApiKey(config.apiKeyEnvVar);

        if (!this.isAvailable(config)) {
            throw new Error('Gemini API key not configured');
        }

        const endpoint = `${config.apiUrl}/models/${config.modelId}:generateContent?key=${apiKey}`;

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: this.toGeminiMessages(messages, systemPrompt),
                generationConfig: {
                    temperature: options?.temperature ?? config.defaultTemperature ?? 0.7,
                    maxOutputTokens: options?.maxTokens ?? config.defaultMaxTokens ?? 2000,
                },
            }),
        });

        if (!response.ok) {
            throw new Error(`Gemini API error: ${response.status}`);
        }

        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }

    async chatStream(
        messages: AIRequestMessage[],
        systemPrompt: string,
        config: AIModelConfig,
        options?: AIProviderOptions
    ): Promise<ReadableStream<Uint8Array>> {
        const apiKey = getApiKey(config.apiKeyEnvVar);

        if (!this.isAvailable(config)) {
            return createMockStream('Gemini API 未配置，这是模拟响应。');
        }

        const endpoint = `${config.apiUrl}/models/${config.modelId}:streamGenerateContent?alt=sse&key=${apiKey}`;

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: this.toGeminiMessages(messages, systemPrompt),
                generationConfig: {
                    temperature: options?.temperature ?? config.defaultTemperature ?? 0.7,
                    maxOutputTokens: options?.maxTokens ?? config.defaultMaxTokens ?? 2000,
                },
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Gemini API error:', response.status, errorText);
            throw new Error(`Gemini API error: ${response.status}`);
        }

        // 转换 Gemini 流格式为 OpenAI 兼容格式
        const reader = response.body!.getReader();
        return new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder();
                const decoder = new TextDecoder();
                let buffer = '';

                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) {
                            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                            controller.close();
                            break;
                        }

                        buffer += decoder.decode(value, { stream: true });
                        const lines = buffer.split('\n');
                        buffer = lines.pop() || '';

                        for (const line of lines) {
                            const trimmedLine = line.trim();
                            if (trimmedLine.startsWith('data:')) {
                                const jsonStr = trimmedLine.slice(5).trim();
                                if (!jsonStr) continue;
                                try {
                                    const data = JSON.parse(jsonStr);
                                    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                                    if (text) {
                                        const chunk = { choices: [{ delta: { content: text } }] };
                                        controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
                                    }
                                } catch (e) {
                                    console.error('Gemini parse error:', e, jsonStr);
                                }
                            }
                        }
                    }
                } catch (e) {
                    console.error('Gemini stream error:', e);
                    controller.error(e);
                }
            }
        });
    }
}

export const geminiNativeProvider = new GeminiNativeProvider();
