/**
 * AI Provider 基础定义
 * 
 * 定义统一的 Provider 接口，所有模型实现都需要遵循此接口
 */

import type {
    ChatMessage,
    AIModelConfig,
    AIReasoningEffort,
    AIVendor,
} from '@/types';

// AI 请求只需要最小消息结构，避免强制依赖存储/展示字段。
export type AIRequestMessage = Pick<ChatMessage, 'role' | 'content' | 'model' | 'reasoning'>;

/**
 * Provider 选项
 */
export interface AIProviderOptions {
    temperature?: number;
    maxTokens?: number;
    reasoning?: boolean;  // 开启推理模式
    reasoningEffort?: AIReasoningEffort;
    imageBase64?: string;
    imageMimeType?: string;
}

/**
 * 流式响应块
 */
export interface AIStreamChunk {
    content?: string;           // 正常内容
    reasoning_content?: string; // 推理/思考内容
}

/**
 * AI Provider 接口
 */
export interface AIProvider {
    /** Provider 供应商 */
    readonly vendor: AIVendor;

    /**
     * 发送消息并获取回复（非流式）
     */
    chat(
        messages: AIRequestMessage[],
        systemPrompt: string,
        config: AIModelConfig,
        options?: AIProviderOptions
    ): Promise<string>;

    /**
     * 发送消息并获取流式回复
     */
    chatStream(
        messages: AIRequestMessage[],
        systemPrompt: string,
        config: AIModelConfig,
        options?: AIProviderOptions
    ): Promise<ReadableStream<Uint8Array>>;

    /**
     * 检查是否可用（API Key 是否配置）
     */
    isAvailable(config: AIModelConfig): boolean;
}

/**
 * OpenAI 兼容格式的消息
 */
export interface OpenAIMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

/**
 * 将 ChatMessage 转换为 OpenAI 格式
 */
export function toOpenAIMessages(messages: AIRequestMessage[]): OpenAIMessage[] {
    return messages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
    }));
}

/**
 * 创建模拟流式响应（用于测试和 fallback）
 */
export function createMockStream(content: string, reasoning?: string): ReadableStream<Uint8Array> {
    return new ReadableStream({
        start(controller) {
            const encoder = new TextEncoder();

            // 如果有推理内容，先发送
            if (reasoning) {
                const reasoningChars = reasoning.split('');
                let reasoningIndex = 0;
                const sendReasoningChar = () => {
                    if (reasoningIndex < reasoningChars.length) {
                        const chunk = { choices: [{ delta: { reasoning_content: reasoningChars[reasoningIndex] } }] };
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
                        reasoningIndex++;
                        setTimeout(sendReasoningChar, 20);
                    } else {
                        // 推理完成，开始发送内容
                        sendContent();
                    }
                };
                sendReasoningChar();
            } else {
                sendContent();
            }

            function sendContent() {
                const chars = content.split('');
                let index = 0;

                const sendNextChar = () => {
                    if (index < chars.length) {
                        const chunk = { choices: [{ delta: { content: chars[index] } }] };
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
                        index++;
                        setTimeout(sendNextChar, 30);
                    } else {
                        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                        controller.close();
                    }
                };
                sendNextChar();
            }
        }
    });
}

/**
 * 获取 API Key
 */
export function getApiKey(envVar: string): string | undefined {
    return process.env[envVar];
}

function normalizeCustomParameters(
    input: AIModelConfig['customParameters'],
): Record<string, unknown> {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
        return {};
    }
    return input;
}

export function buildGenerationConfigPayload(
    config: AIModelConfig,
    options?: AIProviderOptions,
): Record<string, unknown> {
    const payload: Record<string, unknown> = {
        temperature: options?.temperature ?? config.defaultTemperature ?? 0.7,
    };

    if (typeof config.defaultTopP === 'number' && Number.isFinite(config.defaultTopP)) {
        payload.top_p = config.defaultTopP;
    }
    const resolvedMaxTokens = options?.maxTokens ?? config.defaultMaxTokens;
    if (typeof resolvedMaxTokens === 'number' && Number.isFinite(resolvedMaxTokens) && resolvedMaxTokens > 0) {
        payload.max_tokens = resolvedMaxTokens;
    }

    const resolvedReasoningEffort = options?.reasoningEffort ?? config.defaultReasoningEffort;
    if (options?.reasoning && resolvedReasoningEffort) {
        if (config.reasoningEffortFormat === 'reasoning_effort') {
            payload.reasoning_effort = resolvedReasoningEffort;
        } else if (config.reasoningEffortFormat === 'reasoning_object') {
            payload.reasoning = { effort: resolvedReasoningEffort };
        }
    }

    return {
        ...payload,
        ...normalizeCustomParameters(config.customParameters),
    };
}
