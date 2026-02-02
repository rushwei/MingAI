/**
 * 后端流式处理工具函数
 *
 * 提供统一的流式响应处理模式，减少 API 路由中的重复代码
 */

import { callAIStream, readAIStream } from './ai';
import type { AIPersonality } from '@/types';
import type { AIRequestMessage } from './ai-providers/base';

export interface StreamingOptions {
    /** AI 人格 */
    personality?: AIPersonality;
    /** 上下文/系统提示词 */
    systemPrompt?: string;
    /** 模型 ID */
    modelId?: string;
    /** 是否启用推理 */
    reasoning?: boolean;
    /** 温度参数 */
    temperature?: number;
    /** 最大 token 数 */
    maxTokens?: number;
}

export interface StreamingResult {
    /** 客户端流 */
    clientStream: ReadableStream<Uint8Array>;
    /** 用于读取完整内容的 Promise */
    contentPromise: Promise<{ content: string; reasoning?: string }>;
}

/**
 * 创建流式响应
 *
 * 返回分叉的流：一个用于客户端响应，一个用于异步读取完整内容
 */
export async function createStreamingResponse(
    messages: AIRequestMessage[],
    options: StreamingOptions = {}
): Promise<StreamingResult> {
    const {
        personality = 'general',
        systemPrompt = '',
        modelId,
        reasoning = false,
        temperature = 0.7,
    } = options;

    const streamBody = await callAIStream(
        messages,
        personality,
        systemPrompt,
        modelId,
        {
            reasoning,
            temperature,
        }
    );

    const [clientStream, tapStream] = streamBody.tee();

    const contentPromise = readAIStream(tapStream);

    return {
        clientStream,
        contentPromise,
    };
}

/**
 * 创建 SSE 响应对象
 */
export function createSSEResponse(stream: ReadableStream<Uint8Array>): Response {
    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no', // 禁用 Nginx 代理缓冲
            'X-Content-Type-Options': 'nosniff',
        },
    });
}

/**
 * 带重试的异步持久化
 *
 * 用于流式响应的异步保存，支持重试机制
 */
export async function persistWithRetry<T>(
    fn: () => Promise<T>,
    options: {
        maxRetries?: number;
        retryDelay?: number;
        onError?: (error: unknown, attempt: number) => void;
    } = {}
): Promise<T | null> {
    const { maxRetries = 2, retryDelay = 1000, onError } = options;

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
        try {
            return await fn();
        } catch (error) {
            onError?.(error, attempt);
            if (attempt <= maxRetries) {
                await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
            }
        }
    }
    return null;
}

export interface StreamingAnalysisConfig {
    /** 用户消息 */
    userPrompt: string;
    /** 系统提示词 */
    systemPrompt: string;
    /** 模型 ID */
    modelId?: string;
    /** 是否启用推理 */
    reasoning?: boolean;
    /** AI 人格 */
    personality?: AIPersonality;
    /** 温度参数 */
    temperature?: number;
}

export interface PersistenceConfig {
    /** 持久化函数 */
    persist: (content: string, reasoning?: string) => Promise<void>;
    /** 日志标签 */
    logTag?: string;
}

/**
 * 处理流式分析请求
 *
 * 统一的流式分析处理模式：
 * 1. 创建流式响应
 * 2. 异步持久化结果
 * 3. 返回 SSE 响应
 */
export async function handleStreamingAnalysis(
    config: StreamingAnalysisConfig,
    persistence?: PersistenceConfig
): Promise<Response> {
    const {
        userPrompt,
        systemPrompt,
        modelId,
        reasoning = false,
        personality = 'general',
        temperature = 0.7,
    } = config;

    const { clientStream, contentPromise } = await createStreamingResponse(
        [{ role: 'user', content: userPrompt }],
        {
            personality,
            systemPrompt: `\n\n${systemPrompt}\n\n`,
            modelId,
            reasoning,
            temperature,
        }
    );

    // 异步持久化（含空流检测）
    if (persistence) {
        const { persist, logTag = 'streaming' } = persistence;
        void (async () => {
            try {
                const { content, reasoning: reasoningText } = await contentPromise;

                // 空流检测：如果内容为空，跳过持久化
                if (!content || content.trim() === '') {
                    console.warn(`[${logTag}] 流式结果为空，跳过持久化`);
                    return;
                }

                await persistWithRetry(
                    () => persist(content, reasoningText),
                    {
                        maxRetries: 2,
                        onError: (error, attempt) => {
                            console.error(`[${logTag}] 持久化失败 (尝试 ${attempt}):`, error);
                        },
                    }
                );
            } catch (error) {
                console.error(`[${logTag}] 流式结果处理失败:`, error);
            }
        })();
    }

    return createSSEResponse(clientStream);
}
