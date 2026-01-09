/**
 * AI API 调用封装
 * 
 * 服务端组件说明：
 * - 这些函数主要在服务端运行（API Routes 或 Server Actions）
 * - 保护 API 密钥不暴露给客户端
 */

import type { AIPersonality, AIPersonalityConfig, ChatMessage } from '@/types';

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

// ===== API 调用函数 =====

/**
 * 调用 DeepSeek API
 */
export async function callDeepSeek(
    messages: ChatMessage[],
    personality: AIPersonality = 'master',
    chartContext: string = ''
): Promise<string> {
    const apiKey = process.env.DEEPSEEK_API_KEY;

    if (!apiKey || apiKey === 'your_deepseek_api_key_here') {
        // 如果没有配置 API，返回模拟响应
        return generateMockResponse(messages, personality);
    }

    const config = AI_PERSONALITIES[personality];
    const systemPrompt = config.systemPrompt + chartContext;

    const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
                { role: 'system', content: systemPrompt },
                ...messages.map(m => ({ role: m.role, content: m.content })),
            ],
            temperature: 0.7,
            max_tokens: 2000,
        }),
    });

    if (!response.ok) {
        throw new Error(`DeepSeek API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
}

/**
 * 调用 GLM-4 API（通过硅基流动）
 */
export async function callGLM4(
    messages: ChatMessage[],
    personality: AIPersonality = 'master',
    chartContext: string = ''
): Promise<string> {
    const apiKey = process.env.GLM_API_KEY;
    const baseUrl = process.env.GLM_API_BASE_URL || 'https://api.siliconflow.cn/v1';

    const config = AI_PERSONALITIES[personality];
    const systemPrompt = config.systemPrompt + chartContext;

    const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: 'zai-org/GLM-4.6',  // 硅基流动的 GLM-4.6 模型
            messages: [
                { role: 'system', content: systemPrompt },
                ...messages.map(m => ({ role: m.role, content: m.content })),
            ],
            temperature: 0.7,
            max_tokens: 2000,
        }),
    });

    if (!response.ok) {
        throw new Error(`GLM-4 API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
}

/**
 * 生成模拟响应（用于演示和测试）
 */
function generateMockResponse(messages: ChatMessage[], personality: AIPersonality): string {
    const responses: Record<AIPersonality, string[]> = {
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

    const personalityResponses = responses[personality];
    return personalityResponses[Math.floor(Math.random() * personalityResponses.length)];
}

/**
 * 统一的 AI 调用接口
 */
export async function callAI(
    messages: ChatMessage[],
    personality: AIPersonality = 'master',
    preferredModel: 'deepseek' | 'glm' = 'deepseek',
    chartContext: string = ''
): Promise<string> {
    try {
        if (preferredModel === 'deepseek') {
            return await callDeepSeek(messages, personality, chartContext);
        } else {
            return await callGLM4(messages, personality, chartContext);
        }
    } catch (error) {
        console.error('AI API 调用失败，使用模拟响应:', error);
        return generateMockResponse(messages, personality);
    }
}

/**
 * 创建模拟流式响应
 */
function createMockStream(messages: ChatMessage[], personality: AIPersonality): ReadableStream<Uint8Array> {
    const mockContent = generateMockResponse(messages, personality);
    return new ReadableStream({
        start(controller) {
            const encoder = new TextEncoder();
            const words = mockContent.split('');
            let index = 0;

            const sendNextChar = () => {
                if (index < words.length) {
                    const chunk = { choices: [{ delta: { content: words[index] } }] };
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
    });
}

/**
 * 流式调用 AI API (支持 DeepSeek、GLM 和 Gemini)
 */
export async function callAIStream(
    messages: ChatMessage[],
    personality: AIPersonality = 'master',
    chartContext: string = '',
    model: 'deepseek' | 'glm' | 'gemini' = 'deepseek'
): Promise<ReadableStream<Uint8Array>> {
    const config = AI_PERSONALITIES[personality];
    const systemPrompt = config.systemPrompt + chartContext;

    // Gemini
    if (model === 'gemini') {
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return createMockStream(messages, personality);
        }

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:streamGenerateContent?alt=sse&key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [
                    { role: 'user', parts: [{ text: systemPrompt }] },
                    ...messages.map(m => ({
                        role: m.role === 'assistant' ? 'model' : 'user',
                        parts: [{ text: m.content }]
                    })),
                ],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 2000,
                },
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Gemini API error:', response.status, errorText);
            throw new Error(`Gemini API error: ${response.status}`);
        }

        // 直接返回 Gemini 流，由前端处理转换
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

    // GLM
    if (model === 'glm') {
        const apiKey = process.env.GLM_API_KEY;
        const baseUrl = process.env.GLM_API_BASE_URL || 'https://api.siliconflow.cn/v1';

        if (!apiKey) {
            return createMockStream(messages, personality);
        }

        const response = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'THUDM/GLM-4-9B-0414',
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...messages.map(m => ({ role: m.role, content: m.content })),
                ],
                temperature: 0.7,
                max_tokens: 2000,
                stream: true,
            }),
        });

        if (!response.ok) {
            throw new Error(`GLM API error: ${response.status}`);
        }

        return response.body!;
    }

    // DeepSeek (默认)
    const apiKey = process.env.DEEPSEEK_API_KEY;

    if (!apiKey || apiKey === 'your_deepseek_api_key_here') {
        // 没有配置 API，返回模拟流式响应
        return createMockStream(messages, personality);
    }

    const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
                { role: 'system', content: systemPrompt },
                ...messages.map(m => ({ role: m.role, content: m.content })),
            ],
            temperature: 0.7,
            max_tokens: 2000,
            stream: true,
        }),
    });

    if (!response.ok) {
        throw new Error(`DeepSeek API error: ${response.status}`);
    }

    return response.body!;
}
