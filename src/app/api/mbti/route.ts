/**
 * MBTI 性格测试 API 路由
 * 
 * 提供 AI 性格分析功能
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { useCredit, hasCredits } from '@/lib/credits';
import { type MBTIType, PERSONALITY_BASICS, getDimensionDescription } from '@/lib/mbti';

interface MBTIRequest {
    action: 'analyze';
    type: MBTIType;
    scores: Record<string, number>;
    percentages: {
        EI: { E: number; I: number };
        SN: { S: number; N: number };
        TF: { T: number; F: number };
        JP: { J: number; P: number };
    };
}

// 调用 DeepSeek AI
async function callDeepSeekAI(systemPrompt: string, userPrompt: string): Promise<string> {
    const aiApiUrl = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1/chat/completions';
    const apiKey = process.env.DEEPSEEK_API_KEY;

    if (!apiKey) {
        throw new Error('DeepSeek API key not configured');
    }

    const response = await fetch(aiApiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.7,
            max_tokens: 1500,
        }),
    });

    if (!response.ok) {
        throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '分析生成失败';
}

export async function POST(request: NextRequest) {
    try {
        const body: MBTIRequest = await request.json();
        const { action, type, scores, percentages } = body;

        if (action !== 'analyze') {
            return NextResponse.json({
                success: false,
                error: '未知操作'
            }, { status: 400 });
        }

        if (!type || !percentages) {
            return NextResponse.json({
                success: false,
                error: '请提供完整的测试结果'
            }, { status: 400 });
        }

        // 验证用户身份
        const authHeader = request.headers.get('authorization');
        if (!authHeader) {
            return NextResponse.json({
                success: false,
                error: '请先登录'
            }, { status: 401 });
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({
                success: false,
                error: '认证失败'
            }, { status: 401 });
        }

        // 检查积分
        const hasEnoughCredits = await hasCredits(user.id);
        if (!hasEnoughCredits) {
            return NextResponse.json({
                success: false,
                error: '积分不足，请充值后使用'
            }, { status: 403 });
        }

        const basic = PERSONALITY_BASICS[type];

        const systemPrompt = `你是一位专业的心理学家和 MBTI 性格分析专家。
请根据用户的 MBTI 测试结果，提供个性化的深度分析和建议。

分析应包括：
1. 对该类型的深入解读
2. 结合维度百分比的个性化分析
3. 职业发展建议
4. 人际关系建议
5. 个人成长建议

语言应专业但易懂，具有鼓励性和建设性。
字数控制在 600-800 字。`;

        const userPrompt = `用户的 MBTI 测试结果：

性格类型：${type} - ${basic.title}
${basic.description}

维度分析：
- 外向(E) ${percentages.EI.E}% vs 内向(I) ${percentages.EI.I}%
- 实感(S) ${percentages.SN.S}% vs 直觉(N) ${percentages.SN.N}%
- 思考(T) ${percentages.TF.T}% vs 情感(F) ${percentages.TF.F}%
- 判断(J) ${percentages.JP.J}% vs 知觉(P) ${percentages.JP.P}%

请为这位用户提供个性化的深度分析。`;

        try {
            const analysis = await callDeepSeekAI(systemPrompt, userPrompt);

            // 扣除积分
            const remainingCredits = await useCredit(user.id);
            if (remainingCredits === null) {
                console.error('[mbti] 扣除积分失败');
            }

            return NextResponse.json({
                success: true,
                data: { analysis }
            });

        } catch (aiError) {
            console.error('[mbti] AI 分析失败:', aiError);
            return NextResponse.json({
                success: false,
                error: 'AI 分析失败，请稍后重试'
            }, { status: 500 });
        }

    } catch (error) {
        console.error('[mbti] API 错误:', error);
        return NextResponse.json({
            success: false,
            error: '服务器错误'
        }, { status: 500 });
    }
}
