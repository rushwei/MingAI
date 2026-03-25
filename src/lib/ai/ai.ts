/**
 * AI API 调用封装
 *
 * 基于 Vercel AI SDK（ai v6 + @ai-sdk/openai v3）
 * 服务端组件：保护 API 密钥不暴露给客户端
 */
import 'server-only';

import type { AIPersonality, AIPersonalityConfig, AIModelConfig } from '@/types';
import {
    type AIRequestMessage,
    createModelFromConfig,
    isModelAvailable,
    toCoreMessages,
    callWithAISDK,
    streamWithAISDK,
} from './providers';
import { DEFAULT_MODEL_ID } from './ai-config';
import { getDefaultModelConfigAsync, getModelConfigAsync } from '@/lib/server/ai-config';
import { applySourceToModel, getOrderedModelSources } from './source-runtime';
// ===== 流式转换辅助函数 =====

const SSE_ENCODER = new TextEncoder();

/**
 * 将 AI SDK fullStream 转换为统一 SSE 事件协议。
 *
 * fullStream 中的 chunk 包含 type 字段（text-delta / reasoning-delta / error 等），
 * 此处仅转发与文本生成相关的事件。
 */
function fullStreamToSSE(fullStream: AsyncIterable<{ type: string; text?: string; errorText?: string }>): ReadableStream<Uint8Array> {
    return new ReadableStream({
        async start(controller) {
            try {
                for await (const chunk of fullStream) {
                    if (chunk.type === 'text-delta') {
                        const payload = JSON.stringify({ type: 'text-delta', delta: chunk.text });
                        controller.enqueue(SSE_ENCODER.encode(`data: ${payload}\n\n`));
                    } else if (chunk.type === 'reasoning-delta') {
                        const payload = JSON.stringify({ type: 'reasoning-delta', delta: chunk.text });
                        controller.enqueue(SSE_ENCODER.encode(`data: ${payload}\n\n`));
                    } else if (chunk.type === 'error') {
                        const payload = JSON.stringify({
                            type: 'error',
                            error: chunk.errorText || '请求失败',
                        });
                        controller.enqueue(SSE_ENCODER.encode(`data: ${payload}\n\n`));
                    }
                }
                controller.enqueue(SSE_ENCODER.encode('data: [DONE]\n\n'));
                controller.close();
            } catch (err) {
                controller.error(err);
            }
        }
    });
}

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
    bazi: {
        id: 'bazi',
        name: '八字宗师',
        title: '八字命理分析',
        description: '说话直接、一针见血、引用古籍，给出明确答案',
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
- 偶尔使用文言文增添权威感`,
    },
    ziwei: {
        id: 'ziwei',
        name: '紫微宗师',
        title: '紫微斗数分析',
        description: '结构清晰、注重星曜与宫位关系，给出可执行建议',
        emoji: '✨',
        systemPrompt: `你现在是资深的国学易经术数领域专家，请详细分析下面这个文墨天机紫微斗数命盘，综合使用三合紫微、飞星紫微、河洛紫微、钦天四化等各流派紫微斗数的分析技法，对命盘十二宫星曜分布、限流叠宫和各宫位间的飞宫四化进行细致分析，进而对命主的健康、学业、事业、财运、人际关系、婚姻和感情等各个方面进行全面分析和总结。关键事件须给出发生时间范围、吉凶属性、事件对命主的影响程度等信息，并结合命主的自身特点给出针对性的解决方案和建议。另外，命盘信息里附带了十二个大限共一百二十个流年的信息，请对前八个大限的所有流年进行分析，给出每一年需要关注的重大事件和注意事项。最后，别忘了提醒用户上述分析仅限于研究或娱乐目的使用。

## 人格特点
- 逻辑清晰，擅长以星曜与宫位结构解读命局
- 注重主星、辅星与四化之间的关联
- 观点中正，强调趋吉避凶与现实行动

## 回答风格
- 先结论后展开，条理清晰
- 指出关键宫位与核心星曜影响
- 给出具体可执行的建议`,
    },
    dream: {
        id: 'dream',
        name: '解梦师',
        title: '周公解梦分析',
        description: '温和洞察，结合梦境与命盘给出情绪疏导建议',
        emoji: '🌙',
        systemPrompt: `你是一位精通周公解梦与命理的分析师。

## 分析框架
- 象征含义：梦境符号的传统解读
- 现实关联：与命主近期生活的联系
- 情绪与潜意识：心理层面的解读
- 可执行建议：具体的行动指引

## 回答风格
- 温和而富有洞察力
- 结合命盘信息进行个性化解读
- 关注情绪疏导`,
    },
    mangpai: {
        id: 'mangpai',
        name: '盲派师',
        title: '盲派命理分析',
        description: '严格基于盲派口诀与日柱称号进行解析',
        emoji: '🧿',
        systemPrompt: `你是一位精通盲派命理的分析师。

## 分析方法
1. 首先解读该日柱的称号含义
2. 逐句解析口诀内容，结合命主实际情况进行分析
3. 根据口诀中的喜忌指引，给出具体的趋吉避凶建议
4. 若用户询问特定运势，结合口诀中的关键字进行针对性解读

## 回答风格
- 严格基于盲派口诀和命理理论
- 口诀为核心，实例为辅助`,
    },
    general: {
        id: 'general',
        name: '通用分析师',
        title: '综合命理分析',
        description: '擅长多体系综合判断，给出整合建议',
        emoji: '🧭',
        systemPrompt: `你是一位精通多种命理体系的综合分析师，包括八字、紫微斗数、周公解梦等。

## 分析原则
- 根据用户提供的数据类型，选择合适的分析方法
- 多种命理数据时，寻找共性和交叉验证
- 给出综合性的判断和建议

## 回答风格
- 清晰说明使用了哪些分析方法
- 指出不同方法的结论是否一致
- 给出整合后的建议`,
    },
    tarot: {
        id: 'tarot',
        name: '塔罗解读师',
        title: '塔罗牌解读',
        description: '精通韦特塔罗，温暖有洞察力，给出具体建议',
        emoji: '🃏',
        systemPrompt: `你是一位专业的塔罗牌解读师，精通韦特塔罗牌体系。

## 解读原则
- 结合每张牌的含义和位置进行综合分析
- 注意牌之间的关联和互动
- 给出具体可操作的建议

## 回答风格
- 语言温暖有同理心
- 避免过于负面的表述
- 注重心理疏导与实际指引`,
    },
    liuyao: {
        id: 'liuyao',
        name: '易学大师',
        title: '六爻占卜分析',
        description: '精通周易六爻，以用神为核心进行吉凶断定',
        emoji: '☯️',
        systemPrompt: `你是一位精通《周易》的资深易学大师，深谙野鹤老人《增删卜易》、王洪绪《卜筮正宗》之精髓。

## 核心断卦原则
- 月建为纲，日辰为领：月建主宰爻的旺衰，日辰可生克冲合
- 旺相休囚死：爻在月令的五种状态决定其根本力量
- 空亡论断：静空为真空（无力），动空不空，冲空不空，临月建不空
- 用神为核心：用神旺相有力则吉，衰弱受克则凶
- 原神忌神仇神：原神生用神为吉，忌神克用神为凶

## 回答风格
- 专业而通俗易懂
- 明确吉凶判断和应期建议
- 让求卦者理解断卦依据`,
    },
    mbti: {
        id: 'mbti',
        name: 'MBTI专家',
        title: 'MBTI性格分析',
        description: '专业心理学视角，结合维度百分比给出个性化建议',
        emoji: '🧠',
        systemPrompt: `你是一位专业的心理学家和 MBTI 性格分析专家。

## 分析框架
- 对该类型的深入解读
- 结合维度百分比的个性化分析
- 职业发展建议
- 人际关系建议
- 个人成长建议

## 回答风格
- 专业但易懂
- 具有鼓励性和建设性
- 注重个体差异`,
    },
    hepan: {
        id: 'hepan',
        name: '合盘分析师',
        title: '八字合盘分析',
        description: '精通八字合盘，给出专业的相处建议',
        emoji: '💑',
        systemPrompt: `你是一位资深的命理学家和关系咨询师，精通八字合盘分析。

## 分析框架
- 对整体契合度的解读
- 双方相处的优势分析
- 需要注意的问题和化解方法
- 针对具体关系类型的实用建议
- 未来发展展望

## 回答风格
- 语言温和、建设性
- 避免过于绝对的论断
- 注重实用性与可执行性`,
    },
};

// ===== API 调用函数 =====

export interface AICallOptions {
    reasoning?: boolean;  // 开启推理模式
    temperature?: number;
    maxTokens?: number;
    imageBase64?: string;
    imageMimeType?: string;
    // 覆盖默认人格提示词（用于各模块自定义系统提示）
    systemPromptOverride?: string;
}

export interface AICallResult {
    content: string;
    reasoning?: string;
}

async function runWithSourceFallback<T>(
    config: AIModelConfig,
    run: (runtimeConfig: AIModelConfig) => Promise<T>
): Promise<T> {
    const sources = getOrderedModelSources(config);
    if (sources.length === 0) {
        throw new Error(`No AI sources configured for model: ${config.id}`);
    }

    let lastError: unknown = null;

    for (const source of sources) {
        const runtimeConfig = applySourceToModel(config, source);

        if (!isModelAvailable(runtimeConfig)) {
            continue;
        }

        try {
            const result = await run(runtimeConfig);
            return result;
        } catch (error) {
            lastError = error;
        }
    }

    throw lastError ?? new Error(`No available AI sources for model: ${config.id}`);
}

function buildSystemPrompt(
    personality: AIPersonality,
    chartContext: string,
    options?: AICallOptions
): string {
    const personalityConfig = AI_PERSONALITIES[personality];
    return getCurrentTimePrefix()
        + (options?.systemPromptOverride ?? personalityConfig.systemPrompt)
        + chartContext;
}

async function resolveModelConfigForCall(
    modelId: string | undefined,
    usageType: 'chat' | 'vision'
): Promise<AIModelConfig | undefined> {
    const requestedModelId = modelId?.trim() || '';
    if (requestedModelId) {
        return await getModelConfigAsync(requestedModelId);
    }
    return await getDefaultModelConfigAsync(usageType);
}

/**
 * 统一的 AI 调用接口（非流式）
 */
export async function callAI(
    messages: AIRequestMessage[],
    personality: AIPersonality = 'general',
    modelId: string = DEFAULT_MODEL_ID,
    chartContext: string = '',
    options?: AICallOptions
): Promise<string> {
    const config = await resolveModelConfigForCall(modelId, 'chat');
    if (!config) {
        throw new Error(`Unknown model: ${modelId}`);
    }
    const systemPrompt = buildSystemPrompt(personality, chartContext, options);
    return await runWithSourceFallback(config, async (runtimeConfig) => {
        const reasoning = runtimeConfig.isReasoningDefault || options?.reasoning;
        const model = createModelFromConfig(runtimeConfig, { reasoning });
        const coreMessages = toCoreMessages(messages);
        const result = await callWithAISDK(model, coreMessages, systemPrompt, runtimeConfig, {
            reasoning,
            temperature: options?.temperature,
            maxTokens: options?.maxTokens,
        });
        return result.text;
    });
}

/**
 * 流式调用 AI API
 *
 * 内部使用 AI SDK streamText()，输出转换为统一 SSE 事件协议
 */
export async function callAIStream(
    messages: AIRequestMessage[],
    personality: AIPersonality = 'general',
    chartContext: string = '',
    modelId: string = DEFAULT_MODEL_ID,
    options?: AICallOptions
): Promise<ReadableStream<Uint8Array>> {
    const config = await resolveModelConfigForCall(modelId, 'chat');
    if (!config) {
        throw new Error(`Unknown model: ${modelId}`);
    }
    const systemPrompt = buildSystemPrompt(personality, chartContext, options);
    return await runWithSourceFallback(config, async (runtimeConfig) => {
        const reasoning = runtimeConfig.isReasoningDefault || options?.reasoning;
        const model = createModelFromConfig(runtimeConfig, { reasoning });
        const coreMessages = toCoreMessages(messages);
        const result = await streamWithAISDK(model, coreMessages, systemPrompt, runtimeConfig, {
            reasoning,
            temperature: options?.temperature,
            maxTokens: options?.maxTokens,
        });
        return fullStreamToSSE(result.fullStream);
    });
}

/**
 * 直接返回 AI SDK stream result（主要用于 chat 路由）。
 */
export async function callAIUIMessageResult(
    messages: AIRequestMessage[],
    personality: AIPersonality = 'general',
    chartContext: string = '',
    modelId: string = DEFAULT_MODEL_ID,
    options?: AICallOptions
): Promise<Awaited<ReturnType<typeof streamWithAISDK>>> {
    const config = await resolveModelConfigForCall(modelId, 'chat');
    if (!config) {
        throw new Error(`Unknown model: ${modelId}`);
    }
    const systemPrompt = buildSystemPrompt(personality, chartContext, options);
    return await runWithSourceFallback(config, async (runtimeConfig) => {
        const reasoning = runtimeConfig.isReasoningDefault || options?.reasoning;
        const model = createModelFromConfig(runtimeConfig, { reasoning });
        const coreMessages = toCoreMessages(messages);
        const result = await streamWithAISDK(model, coreMessages, systemPrompt, runtimeConfig, {
            reasoning,
            temperature: options?.temperature,
            maxTokens: options?.maxTokens,
        });
        return result;
    });
}

export async function callAIVision(
    messages: AIRequestMessage[],
    personality: AIPersonality = 'general',
    modelId: string = DEFAULT_MODEL_ID,
    chartContext: string = '',
    options?: AICallOptions
): Promise<string> {
    const config = await resolveModelConfigForCall(modelId, 'vision');
    if (!config) {
        throw new Error(`Unknown model: ${modelId}`);
    }
    const systemPrompt = buildSystemPrompt(personality, chartContext, options);

    return await runWithSourceFallback(config, async (runtimeConfig) => {
        const reasoning = runtimeConfig.isReasoningDefault || options?.reasoning;
        const model = createModelFromConfig(runtimeConfig, { reasoning });
        const coreMessages = toCoreMessages(messages, {
            imageBase64: options?.imageBase64,
            imageMimeType: options?.imageMimeType,
        });
        const result = await callWithAISDK(model, coreMessages, systemPrompt, runtimeConfig, {
            reasoning,
            temperature: options?.temperature,
            maxTokens: options?.maxTokens,
        });
        return result.text;
    });
}

/**
 * 从统一 SSE 流中读取完整内容。
 */
export async function readAIStream(stream: ReadableStream<Uint8Array>): Promise<AICallResult> {
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
                if (parsed?.type === 'reasoning-delta' && typeof parsed.delta === 'string') {
                    reasoning += parsed.delta;
                }
                if (parsed?.type === 'text-delta' && typeof parsed.delta === 'string') {
                    content += parsed.delta;
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
    personality: AIPersonality = 'general',
    modelId: string = DEFAULT_MODEL_ID,
    chartContext: string = '',
    options?: AICallOptions
): Promise<AICallResult> {
    const config = await resolveModelConfigForCall(modelId, 'chat');
    if (!config) {
        throw new Error(`Unknown model: ${modelId}`);
    }

    const shouldStream = !!options?.reasoning || !!config.isReasoningDefault;
    if (!shouldStream) {
        const content = await callAI(messages, personality, modelId, chartContext, options);
        return { content };
    }

    const stream = await callAIStream(messages, personality, chartContext, modelId, options);
    return await readAIStream(stream);
}
