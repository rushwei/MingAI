/**
 * AI API 调用封装
 *
 * 服务端组件说明：
 * - 这些函数主要在服务端运行（API Routes 或 Server Actions）
 * - 保护 API 密钥不暴露给客户端
 */

import type { AIPersonality, AIPersonalityConfig } from '@/types';
import { getProvider, createMockStream } from '@/lib/ai-providers';
import type { AIRequestMessage } from '@/lib/ai-providers/base';
import { DEFAULT_MODEL_ID } from '@/lib/ai-config';
import { getModelConfigAsync } from '@/lib/server/ai-config';
import { recordAIStatsAsync } from '@/lib/ai-stats';

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

// ===== 模拟响应（用于演示和测试）=====

const MOCK_RESPONSES: Record<AIPersonality, string[]> = {
    bazi: [
        `观您所问，先给结论：近期运势有转机，但需把握节奏。\n\n《子平真诠》有云："日主旺相，事业可期。"可见时机已至。\n\n建议：\n1. 把握关键节点，主动推进\n2. 留意合作关系，贵人可期\n3. 先稳后进，厚积薄发`,
    ],
    ziwei: [
        `从紫微格局看，主星落点提示你当前更适合稳中求进。\n\n建议：\n1. 聚焦核心宫位所指主题\n2. 避免分散精力，先固基础\n3. 以阶段性目标推进`,
    ],
    dream: [
        `梦境多反映近期情绪与潜意识信号。\n\n建议：\n1. 记录梦境细节，观察重复符号\n2. 关注近期压力来源\n3. 给自己留出放松与复盘时间`,
    ],
    mangpai: [
        `盲派重在口诀要点与日柱称号。\n\n建议：\n1. 先明喜忌，再定趋避\n2. 结合现实处境，取其可行之策`,
    ],
    general: [
        `先给结论：当前适合稳中求进，注意节奏与资源配置。\n\n建议：\n1. 先明确目标，再匹配策略\n2. 保持行动与复盘的节奏\n3. 重点投入在高回报方向`,
    ],
    tarot: [
        `从牌面来看，当前的处境蕴含转机与挑战并存的信号。\n\n建议：\n1. 保持内心的平静与觉察\n2. 信任直觉，但也要理性分析\n3. 适时放下过度担忧，专注当下`,
    ],
    liuyao: [
        `卦象显示用神旺相，整体趋势向好。\n\n建议：\n1. 把握近期有利时机\n2. 注意规避忌神所指方位或时间\n3. 稳扎稳打，不宜急躁冒进`,
    ],
    mbti: [
        `您的性格类型展现了独特的优势与发展空间。\n\n建议：\n1. 发挥核心优势，在擅长领域深耕\n2. 适度关注非主导功能的发展\n3. 选择与性格契合的工作环境`,
    ],
    hepan: [
        `从八字合盘来看，双方存在较好的互补基础。\n\n建议：\n1. 珍惜契合点，加强沟通\n2. 包容差异，避免强求一致\n3. 共同成长，相互支持`,
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
    // 覆盖默认人格提示词（用于各模块自定义系统提示）
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
    personality: AIPersonality = 'general',
    modelId: string = DEFAULT_MODEL_ID,
    chartContext: string = '',
    options?: AICallOptions
): Promise<string> {
    const config = await getModelConfigAsync(modelId);
    if (!config) {
        console.error(`Unknown model: ${modelId}`);
        return generateMockResponse(personality);
    }

    const personalityConfig = AI_PERSONALITIES[personality];
    // 最终系统提示词 = 时间前缀 +（自定义系统提示 or 人格默认提示）+ 命盘上下文
    const systemPrompt = getCurrentTimePrefix() + (options?.systemPromptOverride ?? personalityConfig.systemPrompt) + chartContext;

    const startTime = Date.now();
    try {
        const provider = getProvider(config);

        if (!provider.isAvailable(config)) {
            console.log(`${config.name} 未配置，使用模拟响应`);
            return generateMockResponse(personality);
        }

        // DeepAI 默认开启推理
        const useReasoning = config.isReasoningDefault || options?.reasoning;

        const result = await provider.chat(messages, systemPrompt, config, {
            reasoning: useReasoning,
            temperature: options?.temperature,
            maxTokens: options?.maxTokens,
        });

        // 记录成功统计（使用 config.id 而非请求参数，避免别名碎片化）
        await recordAIStatsAsync({
            modelKey: config.id,
            sourceKey: config.sourceKey,
            success: true,
            responseTimeMs: Date.now() - startTime,
        });

        return result;
    } catch (error) {
        // 记录失败统计
        await recordAIStatsAsync({
            modelKey: config.id,
            sourceKey: config.sourceKey,
            success: false,
            responseTimeMs: Date.now() - startTime,
        });

        console.error('AI API 调用失败，使用模拟响应:', error);
        return generateMockResponse(personality);
    }
}

/**
 * 流式调用 AI API
 */
export async function callAIStream(
    messages: AIRequestMessage[],
    personality: AIPersonality = 'general',
    chartContext: string = '',
    modelId: string = DEFAULT_MODEL_ID,
    options?: AICallOptions
): Promise<ReadableStream<Uint8Array>> {
    const config = await getModelConfigAsync(modelId);
    if (!config) {
        console.error(`Unknown model: ${modelId}`);
        return createMockStream(generateMockResponse(personality));
    }

    const personalityConfig = AI_PERSONALITIES[personality];
    // 流式调用同样使用统一拼接规则，保证提示词一致
    const systemPrompt = getCurrentTimePrefix() + (options?.systemPromptOverride ?? personalityConfig.systemPrompt) + chartContext;

    const startTime = Date.now();
    try {
        const provider = getProvider(config);

        if (!provider.isAvailable(config)) {
            console.log(`${config.name} 未配置，使用模拟响应`);
            return createMockStream(generateMockResponse(personality));
        }

        // DeepAI 默认开启推理
        const useReasoning = config.isReasoningDefault || options?.reasoning;

        const stream = await provider.chatStream(messages, systemPrompt, config, {
            reasoning: useReasoning,
            temperature: options?.temperature,
            maxTokens: options?.maxTokens,
        });

        // 记录成功统计（流式请求在获取到流时记录成功，使用 config.id）
        await recordAIStatsAsync({
            modelKey: config.id,
            sourceKey: config.sourceKey,
            success: true,
            responseTimeMs: Date.now() - startTime,
        });

        return stream;
    } catch (error) {
        // 记录失败统计
        await recordAIStatsAsync({
            modelKey: config.id,
            sourceKey: config.sourceKey,
            success: false,
            responseTimeMs: Date.now() - startTime,
        });

        console.error('AI 流式调用失败，使用模拟响应:', error);
        return createMockStream(generateMockResponse(personality));
    }
}

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
    personality: AIPersonality = 'general',
    modelId: string = DEFAULT_MODEL_ID,
    chartContext: string = '',
    options?: AICallOptions
): Promise<AICallResult> {
    const config = await getModelConfigAsync(modelId);
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
