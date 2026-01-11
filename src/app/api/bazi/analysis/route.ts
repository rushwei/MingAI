/**
 * AI八字分析API
 * 
 * 支持五行分析和人格分析
 * 非流式输出 + 结果保存
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase-server';

// AI系统提示词
const WUXING_PROMPT = `你是一位专业的命理分析师，擅长八字五行分析。请根据用户提供的八字信息，进行专业的五行分析。

分析要求：
1. 分析五行的整体配置和平衡状态
2. 判断五行的强弱对比
3. 确定喜用神和忌神
4. 给出五行调理建议（颜色、方位、职业等）
5. 分析五行对性格和命运的影响

输出格式：
- 使用清晰的段落结构
- 每个要点单独成段
- 语言专业但通俗易懂
- 总字数控制在500-800字`;

const PERSONALITY_PROMPT = `你是一位专业的命理分析师，擅长通过八字分析人格特征。请根据用户提供的八字信息，进行深度人格分析。

分析要求：
1. 分析核心性格特征（3-5个主要特质）
2. 分析优势与潜质
3. 分析需要注意的性格盲点
4. 给出人际关系建议
5. 分析适合的发展方向

输出格式：
- 使用清晰的段落结构
- 每个特质单独成段并有具体说明
- 语言温暖亲切，富有洞察力
- 总字数控制在500-800字`;

export async function POST(request: NextRequest) {
    try {
        const { chartId, type, chartSummary } = await request.json();

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

        const systemPrompt = type === 'wuxing' ? WUXING_PROMPT : PERSONALITY_PROMPT;

        // 调用AI API（非流式）
        const aiApiKey = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;
        const aiApiUrl = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1/chat/completions';

        if (!aiApiKey) {
            return NextResponse.json(
                { error: 'AI服务未配置' },
                { status: 500 }
            );
        }

        const aiResponse = await fetch(aiApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${aiApiKey}`,
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `请分析以下八字：\n\n${chartSummary}` },
                ],
                stream: false,
                temperature: 0.7,
                max_tokens: 2000,
            }),
        });

        if (!aiResponse.ok) {
            console.error('AI API error:', await aiResponse.text());
            return NextResponse.json(
                { error: 'AI分析失败' },
                { status: 500 }
            );
        }

        const aiResult = await aiResponse.json();
        const content = aiResult.choices?.[0]?.message?.content || '';

        if (!content) {
            return NextResponse.json(
                { error: '分析结果为空' },
                { status: 500 }
            );
        }

        // 获取命盘信息并保存到 conversations
        let conversationId: string | null = null;
        if (chartId) {
            try {
                const supabase = getServiceClient();

                // 获取命盘信息
                const { data: chart } = await supabase
                    .from('bazi_charts')
                    .select('name, user_id')
                    .eq('id', chartId)
                    .single();

                if (chart?.user_id) {
                    // 保存 AI 分析到 conversations 表
                    const { createAIAnalysisConversation, generateBaziAnalysisTitle } = await import('@/lib/ai-analysis');
                    conversationId = await createAIAnalysisConversation({
                        userId: chart.user_id,
                        sourceType: type === 'wuxing' ? 'bazi_wuxing' : 'bazi_personality',
                        sourceData: {
                            chart_id: chartId,
                            chart_name: chart.name,
                            chart_summary: chartSummary,
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
                }
            } catch (saveError) {
                console.error('[analysis] Save exception:', saveError);
            }
        }

        return NextResponse.json({
            success: true,
            content,
            conversationId,
        });
    } catch (error) {
        console.error('Analysis API error:', error);
        return NextResponse.json(
            { error: '服务器错误' },
            { status: 500 }
        );
    }
}
