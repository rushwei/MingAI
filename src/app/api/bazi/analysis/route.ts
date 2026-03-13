/**
 * AI八字分析API
 *
 * 支持五行分析和人格分析
 * 支持流式输出 + 结果保存
 */

import { NextRequest } from 'next/server';
import { callAIWithReasoning, callAIStream, readAIStream } from '@/lib/ai/ai';
import { DEFAULT_MODEL_ID } from '@/lib/ai/ai-config';
import { resolveModelAccessAsync } from '@/lib/ai/ai-access';
import { getServiceRoleClient, jsonError, jsonOk, requireUserContext } from '@/lib/api-utils';
import { getUserAuthInfo, useCredit, addCredits } from '@/lib/user/credits';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';

// 速率限制配置：每分钟每 IP 最多 10 次
const RATE_LIMIT_CONFIG = {
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 分钟
};

// AI系统提示词
const WUXING_PROMPT = `你是一位专业的命理分析师，擅长八字五行分析。请根据用户提供的八字信息，进行专业的五行分析。

分析要求：
1. 分析五行的整体配置和平衡状态
2. 判断五行的强弱对比，结合日主在月令的十二长生状态（长生、帝旺为旺，病、死、绝为衰）
3. 确定喜用神和忌神
4. 分析地支关系（三合局、六合、六冲）对五行的影响：
   - 三合局（申子辰水、亥卯未木、寅午戌火、巳酉丑金）力量最强
   - 六合可增强相关五行
   - 六冲主动荡变化
5. 给出五行调理建议（颜色、方位、职业等）
6. 分析五行对性格和命运的影响

输出格式：
- 使用清晰的段落结构
- 每个要点单独成段
- 语言专业但通俗易懂
- 总字数控制在500-800字`;

const PERSONALITY_PROMPT = `你是一位专业的命理分析师，擅长通过八字分析人格特征。请根据用户提供的八字信息，进行深度人格分析。

分析要求：
1. 分析核心性格特征（3-5个主要特质），结合日主十二长生状态：
   - 长生、帝旺：有冲劲、主动积极
   - 沐浴、冠带：注重外表、追求进步
   - 衰、病、死：内敛稳重、深思熟虑
   - 墓、绝、胎、养：潜力待发、厚积薄发
2. 分析优势与潜质
3. 分析需要注意的性格盲点
4. 结合地支关系分析人际关系：
   - 三合局主团结协作
   - 六合主亲和人缘
   - 六冲主性格冲突或变动
5. 分析适合的发展方向

输出格式：
- 使用清晰的段落结构
- 每个特质单独成段并有具体说明
- 语言温暖亲切，富有洞察力
- 总字数控制在500-800字`;

export async function POST(request: NextRequest) {
    let creditDeducted = false;
    let userId: string | null = null;
    try {
        const { chartId, type, chartSummary, modelId, reasoning, stream } = await request.json();

        // 参数校验
        if (!chartId || typeof chartId !== 'string') {
            return jsonError('缺少命盘ID', 400);
        }
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(chartId)) {
            return jsonError('命盘ID格式无效', 400);
        }
        if (!chartSummary || typeof chartSummary !== 'string') {
            return jsonError('缺少命盘摘要', 400);
        }
        if (chartSummary.length > 5000) {
            return jsonError('命盘摘要过长', 400);
        }
        if (!type || !['wuxing', 'personality'].includes(type)) {
            return jsonError('分析类型无效', 400);
        }

        // 鉴权
        const auth = await requireUserContext(request);
        if ('error' in auth) {
            return jsonError(auth.error.message, auth.error.status);
        }
        const { user } = auth;
        userId = user.id;

        // 限流检查（鉴权之后、业务逻辑之前）
        const clientIP = getClientIP(request);
        const rateLimit = await checkRateLimit(clientIP, '/api/bazi/analysis', RATE_LIMIT_CONFIG);
        if (!rateLimit.allowed) {
            return jsonError('请求过于频繁，请稍后再试', 429);
        }

        // 根据分析类型选择系统提示词，确保模型走对应的分析维度
        const systemPrompt = type === 'wuxing' ? WUXING_PROMPT : PERSONALITY_PROMPT;
        // 用户提示词仅承载命盘摘要，避免混入系统规则
        const userPrompt = `请分析以下八字：\n\n${chartSummary}`;

        const supabase = getServiceRoleClient();
        const { data: chart, error: chartError } = await supabase
            .from('bazi_charts')
            .select('name, user_id')
            .eq('id', chartId)
            .eq('user_id', user.id)
            .single();

        if (chartError || !chart?.user_id) {
            return jsonError('未找到命盘信息', 404);
        }

        const authInfo = await getUserAuthInfo(user.id);
        if (!authInfo) {
            return jsonError('获取用户信息失败', 500);
        }
        const membershipType = authInfo.effectiveMembership;
        const access = await resolveModelAccessAsync(modelId, DEFAULT_MODEL_ID, membershipType, reasoning);
        if ('error' in access) {
            return jsonError(access.error, access.status);
        }
        const { modelId: requestedModelId, reasoningEnabled } = access;

        if (!authInfo.hasCredits) {
            return jsonError('积分不足，请充值后继续使用', 403);
        }

        const remaining = await useCredit(user.id);
        if (remaining === null) {
            return jsonError('积分扣减失败，请重试', 500);
        }
        creditDeducted = true;

        // 流式输出模式
        if (stream) {
            const streamBody = await callAIStream(
                [{ role: 'user', content: userPrompt }],
                'bazi',
                `\n\n${systemPrompt}\n\n`,
                requestedModelId,
                {
                    reasoning: reasoningEnabled,
                    temperature: 0.7,
                }
            );
            const [clientStream, tapStream] = streamBody.tee();

            // 异步持久化流式结果（含空流退款逻辑）
            void (async () => {
                try {
                    const { content: analysisContent, reasoning: reasoningText } = await readAIStream(tapStream);

                    // 空流检测：如果内容为空，退还积分
                    if (!analysisContent || analysisContent.trim() === '') {
                        console.error('[bazi/analysis] 流式结果为空，退还积分');
                        if (userId) {
                            await addCredits(userId, 1);
                        }
                        return;
                    }

                    const { createAIAnalysisConversation, generateBaziAnalysisTitle } = await import('@/lib/ai/ai-analysis');
                    await createAIAnalysisConversation({
                        userId: chart.user_id,
                        sourceType: type === 'wuxing' ? 'bazi_wuxing' : 'bazi_personality',
                        sourceData: {
                            chart_id: chartId,
                            chart_name: chart.name,
                            chart_summary: chartSummary,
                            model_id: requestedModelId,
                            reasoning: reasoningEnabled,
                            reasoning_text: reasoningText || null,
                        },
                        title: generateBaziAnalysisTitle(chart.name || '命盘', type),
                        aiResponse: analysisContent,
                        baziChartId: chartId,
                    });
                } catch (saveError) {
                    console.error('[bazi/analysis] 保存流式结果失败，退还积分:', saveError);
                    // 流式处理失败时退还积分
                    if (userId) {
                        await addCredits(userId, 1);
                    }
                }
            })();

            return new Response(clientStream, {
                headers: {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                },
            });
        }

        // 非流式输出模式
        const { content, reasoning: reasoningText } = await callAIWithReasoning(
            [{ role: 'user', content: userPrompt }],
            'bazi',
            requestedModelId,
            `\n\n${systemPrompt}\n\n`,
            {
                reasoning: reasoningEnabled,
                temperature: 0.7,
            }
        );

        if (!content) {
            if (creditDeducted && userId) {
                await addCredits(userId, 1);
                creditDeducted = false;
            }
            return jsonError('分析结果为空', 500);
        }

        // 获取命盘信息并保存到 conversations
        let conversationId: string | null = null;
        try {
            const { createAIAnalysisConversation, generateBaziAnalysisTitle } = await import('@/lib/ai/ai-analysis');
            conversationId = await createAIAnalysisConversation({
                userId: chart.user_id,
                sourceType: type === 'wuxing' ? 'bazi_wuxing' : 'bazi_personality',
                sourceData: {
                    chart_id: chartId,
                    chart_name: chart.name,
                    chart_summary: chartSummary,
                    model_id: requestedModelId,
                    reasoning: reasoningEnabled,
                    reasoning_text: reasoningText || null,
                },
                title: generateBaziAnalysisTitle(chart.name || '命盘', type),
                aiResponse: content,
                baziChartId: chartId,
            });

            if (conversationId) {
                console.log('[analysis] Saved to conversations:', chartId, type, conversationId);
            } else {
                console.error('[analysis] Failed to save to conversations');
            }
        } catch (saveError) {
            console.error('[analysis] Save exception:', saveError);
            // 非流式模式下保存失败也退还积分
            if (creditDeducted && userId) {
                await addCredits(userId, 1);
                creditDeducted = false;
            }
            return jsonError('保存分析结果失败', 500);
        }

        return jsonOk({
            success: true,
            content,
            reasoning: reasoningText,
            conversationId,
        });
    } catch (error) {
        if (creditDeducted && userId) {
            await addCredits(userId, 1);
        }
        console.error('Analysis API error:', error);
        return jsonError('服务器错误', 500);
    }
}
