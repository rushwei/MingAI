/**
 * AI API 调用封装
 * 
 * 服务端组件说明：
 * - 这些函数主要在服务端运行（API Routes 或 Server Actions）
 * - 保护 API 密钥不暴露给客户端
 */

import type { AIPersonality, AIPersonalityConfig } from '@/types';
import { getProvider, createMockStream } from './ai-providers';
import type { AIRequestMessage } from './ai-providers/base';
import { getModelConfig, DEFAULT_MODEL_ID } from './ai-config';

// ===== 时间辅助函数 =====

/**
 * 生成当前时间前缀，用于所有 AI 回复的提示词
 * 格式：当前时间：2026年1月22日21:30
 */
function getCurrentTimePrefix(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    return `当前时间：${year}年${month}月${day}日${hours}:${minutes}\n\n`;
}

// ===== AI 人格配置 =====

export const AI_PERSONALITIES: Record<AIPersonality, AIPersonalityConfig> = {
    master: {
        id: 'master',
        name: '玄机宗师',
        title: '严厉宗师',
        description: '说话直接、一针见血、引用古籍，给出明确的答案',
        emoji: '🧙‍♂️',
        systemPrompt: `你是一位精通八字命理的资深命理宗师，拥有50年实战经验。

        ## 人格特点
        - 说话直接，一针见血，不拐弯抹角
        - 经常引用易经、子平真诠等古籍典故
        - 对命理有独到见解，敢于直言
        - 语气严肃但充满智慧

        ## 回答风格
        - 开门见山，先给结论
        - 解释时引用理论依据
        - 给出具体可行的建议
        - 偶尔使用文言文增添权威感

        ## 注意事项
        - 保持专业但不迷信
        - 强调命理是参考而非定数
        - 传递积极正向的人生观

        ## 数据使用规则
        1. 优先使用用户 @ 显式引用的数据
        2. 其次参考用户知识库（按权重排序）
        3. 再次使用系统已有的命盘和历史数据
        4. 信息不足时明确提示「条件不足，无法准确判断」
        5. 禁止编造不存在的数据
        6. 推理结论需注明数据来源`,
    },
};

// ===== 模拟响应（用于演示和测试）=====

const MOCK_RESPONSES: Record<AIPersonality, string[]> = {
    master: [
        `观您所问，老夫直言相告。根据命理分析，您目前正处于运势转折之际。\n\n《子平真诠》有云："日主旺相，事业可期。"您的命局中有此征兆。\n\n建议您：\n1. 把握当前机遇，主动出击\n2. 注意人际关系，贵人相助\n3. 养精蓄锐，厚积薄发\n\n切记：命由己造，运自天成。`,
        `此问甚好！老夫为您细细道来。\n\n从您的八字来看，五行配置尚可，但需留意某些方面的平衡。\n\n古人云："知命者不怨天，知己者不怨人。"了解自己的命理特点，方能趋吉避凶。\n\n具体而言，建议您在近期多加留意事业发展方向，适时调整策略。`,
    ],
};

function generateMockResponse(personality: AIPersonality): string {
    const responses = MOCK_RESPONSES[personality];
    return responses[Math.floor(Math.random() * responses.length)];
}

// ===== API 调用函数 =====

export interface AICallOptions {
    reasoning?: boolean;  // 开启推理模式
    temperature?: number;
    maxTokens?: number;
    systemPromptOverride?: string;
}

export interface AICallResult {
    content: string;
    reasoning?: string;
}

/**
 * 统一的 AI 调用接口（非流式）
 */
export async function callAI(
    messages: AIRequestMessage[],
    personality: AIPersonality = 'master',
    modelId: string = DEFAULT_MODEL_ID,
    chartContext: string = '',
    options?: AICallOptions
): Promise<string> {
    const config = getModelConfig(modelId);
    if (!config) {
        console.error(`Unknown model: ${modelId}`);
        return generateMockResponse(personality);
    }

    const personalityConfig = AI_PERSONALITIES[personality];
    const systemPrompt = getCurrentTimePrefix() + (options?.systemPromptOverride ?? personalityConfig.systemPrompt) + chartContext;

    try {
        const provider = getProvider(config);

        if (!provider.isAvailable(config)) {
            console.log(`${config.name} 未配置，使用模拟响应`);
            return generateMockResponse(personality);
        }

        // DeepAI 默认开启推理
        const useReasoning = config.isReasoningDefault || options?.reasoning;

        return await provider.chat(messages, systemPrompt, config, {
            reasoning: useReasoning,
            temperature: options?.temperature,
            maxTokens: options?.maxTokens,
        });
    } catch (error) {
        console.error('AI API 调用失败，使用模拟响应:', error);
        return generateMockResponse(personality);
    }
}

/**
 * 流式调用 AI API
 */
export async function callAIStream(
    messages: AIRequestMessage[],
    personality: AIPersonality = 'master',
    chartContext: string = '',
    modelId: string = DEFAULT_MODEL_ID,
    options?: AICallOptions
): Promise<ReadableStream<Uint8Array>> {
    const config = getModelConfig(modelId);
    if (!config) {
        console.error(`Unknown model: ${modelId}`);
        return createMockStream(generateMockResponse(personality));
    }

    const personalityConfig = AI_PERSONALITIES[personality];
    const systemPrompt = getCurrentTimePrefix() + (options?.systemPromptOverride ?? personalityConfig.systemPrompt) + chartContext;

    try {
        const provider = getProvider(config);

        if (!provider.isAvailable(config)) {
            console.log(`${config.name} 未配置，使用模拟响应`);
            return createMockStream(generateMockResponse(personality));
        }

        // DeepAI 默认开启推理
        const useReasoning = config.isReasoningDefault || options?.reasoning;

        return await provider.chatStream(messages, systemPrompt, config, {
            reasoning: useReasoning,
            temperature: options?.temperature,
            maxTokens: options?.maxTokens,
        });
    } catch (error) {
        console.error('AI 流式调用失败，使用模拟响应:', error);
        return createMockStream(generateMockResponse(personality));
    }
}

async function readAIStream(stream: ReadableStream<Uint8Array>): Promise<AICallResult> {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let content = '';
    let reasoning = '';

    while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;
            const dataStr = trimmed.replace(/^data:\s*/, '');
            if (dataStr === '[DONE]') continue;
            try {
                const parsed = JSON.parse(dataStr);
                const delta = parsed?.choices?.[0]?.delta;
                if (delta?.reasoning_content) {
                    reasoning += delta.reasoning_content;
                }
                if (delta?.content) {
                    content += delta.content;
                }
            } catch {
                // ignore malformed stream chunk
            }
        }
    }

    return { content, reasoning: reasoning || undefined };
}

/**
 * 统一的 AI 调用接口（返回推理过程）
 */
export async function callAIWithReasoning(
    messages: AIRequestMessage[],
    personality: AIPersonality = 'master',
    modelId: string = DEFAULT_MODEL_ID,
    chartContext: string = '',
    options?: AICallOptions
): Promise<AICallResult> {
    const config = getModelConfig(modelId);
    if (!config) {
        return { content: generateMockResponse(personality) };
    }

    const shouldStream = !!options?.reasoning || !!config.isReasoningDefault;
    if (!shouldStream) {
        const content = await callAI(messages, personality, modelId, chartContext, options);
        return { content };
    }

    try {
        const stream = await callAIStream(messages, personality, chartContext, modelId, options);
        return await readAIStream(stream);
    } catch (error) {
        console.error('AI 推理解析失败，回退普通调用:', error);
        const content = await callAI(messages, personality, modelId, chartContext, options);
        return { content };
    }
}
