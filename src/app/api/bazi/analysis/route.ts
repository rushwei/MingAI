/**
 * AI八字分析API
 * 
 * 支持五行分析和人格分析
 * 非流式输出 + 结果保存
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/api-utils';
import { callAIWithReasoning } from '@/lib/ai';
import { DEFAULT_MODEL_ID } from '@/lib/ai-config';
import { getEffectiveMembershipType } from '@/lib/membership-server';
import { resolveModelAccess } from '@/lib/ai-access';
import { getAuthContext } from '@/lib/api-utils';
import { hasCredits, useCredit, addCredits } from '@/lib/credits';

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
        const { chartId, type, chartSummary, modelId, reasoning } = await request.json();

        if (!chartId || !type || !chartSummary) {
            return NextResponse.json(
                { error: '缺少必要参数' },
                { status: 400 }
            );
        }

        if (!['wuxing', 'personality'].includes(type)) {
            return NextResponse.json(
                { error: '无效的分析类型' },
                { status: 400 }
            );
        }

        const { user } = await getAuthContext(request);
        if (!user) {
            return NextResponse.json({ error: '请先登录' }, { status: 401 });
        }
        userId = user.id;

        const systemPrompt = type === 'wuxing' ? WUXING_PROMPT : PERSONALITY_PROMPT;
        const userPrompt = `请分析以下八字：\n\n${chartSummary}`;

        const supabase = getServiceRoleClient();
        const { data: chart, error: chartError } = await supabase
            .from('bazi_charts')
            .select('name, user_id')
            .eq('id', chartId)
            .eq('user_id', user.id)
            .single();

        if (chartError || !chart?.user_id) {
            return NextResponse.json(
                { error: '未找到命盘信息' },
                { status: 404 }
            );
        }

        const membershipType = await getEffectiveMembershipType(user.id);
        const access = resolveModelAccess(modelId, DEFAULT_MODEL_ID, membershipType, reasoning);
        if ('error' in access) {
            return NextResponse.json(
                { error: access.error },
                { status: access.status }
            );
        }
        const { modelId: requestedModelId, reasoningEnabled } = access;

        const hasEnough = await hasCredits(user.id);
        if (!hasEnough) {
            return NextResponse.json(
                { error: '积分不足，请充值后继续使用' },
                { status: 402 }
            );
        }

        const remaining = await useCredit(user.id);
        if (remaining === null) {
            return NextResponse.json(
                { error: '积分扣减失败，请重试' },
                { status: 500 }
            );
        }
        creditDeducted = true;

        const { content, reasoning: reasoningText } = await callAIWithReasoning(
            [{ role: 'user', content: userPrompt }],
            'master',
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
            return NextResponse.json(
                { error: '分析结果为空' },
                { status: 500 }
            );
        }

        // 获取命盘信息并保存到 conversations
        let conversationId: string | null = null;
        try {
            const { createAIAnalysisConversation, generateBaziAnalysisTitle } = await import('@/lib/ai-analysis');
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
        }

        return NextResponse.json({
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
        return NextResponse.json(
            { error: '服务器错误' },
            { status: 500 }
        );
    }
}
