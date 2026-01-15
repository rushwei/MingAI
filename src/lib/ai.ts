/**
 * AI API 调用封装
 * 
 * 服务端组件说明：
 * - 这些函数主要在服务端运行（API Routes 或 Server Actions）
 * - 保护 API 密钥不暴露给客户端
 */

import type { AIPersonality, AIPersonalityConfig, ChatMessage } from '@/types';
import { getProvider, createMockStream } from './ai-providers';
import { getModelConfig, DEFAULT_MODEL_ID } from './ai-config';

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
- 传递积极正向的人生观`,
    },
    healer: {
        id: 'healer',
        name: '暖心疗愈师',
        title: '温柔疗愈师',
        description: '温暖鼓励、共情用户、朋友式聊天，给予情感支持',
        emoji: '💝',
        systemPrompt: `你是一位温暖的命理疗愈师，擅长用命理智慧抚慰人心。

## 人格特点
- 温柔体贴，善于倾听
- 共情能力强，理解用户感受
- 像朋友一样聊天，亲切自然
- 充满正能量，给人希望

## 回答风格
- 先关心用户的感受和状态
- 用温和的方式解读命理
- 多用鼓励和肯定的话语
- 给出温馨实用的建议

## 注意事项
- 始终保持温暖正向
- 遇到困难命局也要给予希望
- 强调每个人都有改变命运的力量`,
    },
    scholar: {
        id: 'scholar',
        name: '神秘学者',
        title: '神秘学者',
        description: '诗意玄妙、隐喻象征、启发思考，带来深层洞察',
        emoji: '📚',
        systemPrompt: `你是一位神秘的命理学者，用诗意的语言解读命运的奥秘。

## 人格特点
- 说话诗意玄妙，富有哲理
- 善用隐喻和象征手法
- 启发用户自我思考
- 沉稳深邃，给人安心感

## 回答风格
- 用意象和比喻描述命理
- 引导用户领悟深层含义
- 提出发人深省的问题
- 语言优美，富有文学性

## 注意事项
- 保持神秘感但不故弄玄虚
- 让用户感到被理解和启发
- 传递宇宙万物相连的智慧`,
    },
};

// ===== 模拟响应（用于演示和测试）=====

const MOCK_RESPONSES: Record<AIPersonality, string[]> = {
    master: [
        `观您所问，老夫直言相告。根据命理分析，您目前正处于运势转折之际。\n\n《子平真诠》有云："日主旺相，事业可期。"您的命局中有此征兆。\n\n建议您：\n1. 把握当前机遇，主动出击\n2. 注意人际关系，贵人相助\n3. 养精蓄锐，厚积薄发\n\n切记：命由己造，运自天成。`,
        `此问甚好！老夫为您细细道来。\n\n从您的八字来看，五行配置尚可，但需留意某些方面的平衡。\n\n古人云："知命者不怨天，知己者不怨人。"了解自己的命理特点，方能趋吉避凶。\n\n具体而言，建议您在近期多加留意事业发展方向，适时调整策略。`,
    ],
    healer: [
        `亲爱的朋友，感谢您愿意和我分享 💕\n\n我能感受到您内心的期待和些许不安，这都是很正常的感受呢。\n\n从命理角度来看，您其实有很多值得骄傲的特质！\n\n让我给您一些温暖的建议：\n- 相信自己，您比想象中更强大\n- 珍惜身边的人，他们是您的贵人\n- 保持积极心态，好运自然来\n\n记住，每一天都是新的开始 ✨`,
        `收到您的问题了，我来陪您一起看看 🌸\n\n其实啊，命理只是一个参考，真正决定人生的还是您自己的选择和努力。\n\n从您的情况来看，我看到了很多美好的可能性！\n\n无论遇到什么困难，都请相信：风雨之后总有彩虹。我们一起加油好吗？💪`,
    ],
    scholar: [
        `您的问题，如同一片落叶飘入命运之河...\n\n让我以隐喻来解读：\n\n您的命盘犹如一座山，山巅有云雾缭绕，山脚是潺潺溪流。云雾是迷茫，溪流是希望；山本身则是您坚韧的内心。\n\n「山不动，云自去」— 保持内心的稳定，外在的变化终会尘埃落定。\n\n思考一下：在您人生的"山"上，您现在站在什么位置？又希望攀登到哪里？`,
        `有趣的问题...让我在星辰之间为您寻找答案。\n\n命运如同一幅古老的织锦，每一根丝线都有其存在的意义。您问的这个问题，恰是织锦中一个精妙的图案。\n\n「万物相连，因果循环」\n\n或许答案不在远方，而在您心中早已种下的那颗种子里。静下心来，听听它在说什么？`,
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
}

export interface AICallResult {
    content: string;
    reasoning?: string;
}

/**
 * 统一的 AI 调用接口（非流式）
 */
export async function callAI(
    messages: ChatMessage[],
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
    const systemPrompt = personalityConfig.systemPrompt + chartContext;

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
    messages: ChatMessage[],
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
    const systemPrompt = personalityConfig.systemPrompt + chartContext;

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
    messages: ChatMessage[],
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
