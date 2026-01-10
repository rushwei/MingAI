/**
 * 六爻占卜 API 路由
 * 
 * 提供 AI 解卦功能
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getServiceClient } from '@/lib/supabase-server';
import { useCredit, hasCredits } from '@/lib/credits';
import { type Hexagram, type Yao, getHexagramBrief } from '@/lib/liuyao';

interface LiuyaoRequest {
    action: 'interpret' | 'save' | 'history';
    question?: string;
    hexagram?: Hexagram;
    changedHexagram?: Hexagram;
    changedLines?: number[];
    yaos?: Yao[];
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
    return data.choices?.[0]?.message?.content || '解读生成失败';
}

export async function POST(request: NextRequest) {
    try {
        const body: LiuyaoRequest = await request.json();
        const { action, question, hexagram, changedHexagram, changedLines, yaos } = body;

        switch (action) {
            case 'interpret': {
                if (!hexagram) {
                    return NextResponse.json({
                        success: false,
                        error: '请提供卦象'
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

                // 构建解读 prompt
                const yaoDescription = yaos?.map((y, i) => {
                    const names = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'];
                    const type = y.type === 1 ? '阳爻' : '阴爻';
                    const change = y.change === 'changing' ? '（变）' : '';
                    return `${names[i]}：${type}${change}`;
                }).join('\n') || '';

                const systemPrompt = `你是一位精通《周易》的资深易学大师，拥有数十年的六爻断卦经验。
请根据提供的卦象信息，为求卦者提供专业、详尽的解读。

解读要求：
1. 先介绍本卦的基本含义和象征
2. 分析各爻的含义，特别关注变爻
3. 如有变卦，分析变卦的趋势指向
4. 结合问题给出具体的吉凶判断和建议
5. 语言应既专业又通俗易懂，避免过于晦涩
6. 解读字数控制在 500-800 字`;

                const userPrompt = question
                    ? `求卦问题：${question}

本卦：${hexagram.name}
上卦：${hexagram.upperTrigram}（${hexagram.nature}）
下卦：${hexagram.lowerTrigram}
五行：${hexagram.element}

各爻情况：
${yaoDescription}

${changedLines && changedLines.length > 0 ? `变爻位置：${changedLines.map(l => `第${l}爻`).join('、')}

变卦：${changedHexagram?.name || '无'}
${changedHexagram ? `上卦：${changedHexagram.upperTrigram}
下卦：${changedHexagram.lowerTrigram}` : ''}` : '无变爻'}

请为求卦者详细解读此卦。`
                    : `请为以下卦象提供通用解读：

本卦：${hexagram.name}
上卦：${hexagram.upperTrigram}（${hexagram.nature}）
下卦：${hexagram.lowerTrigram}
五行：${hexagram.element}

各爻情况：
${yaoDescription}

${changedLines && changedLines.length > 0 ? `变爻位置：${changedLines.map(l => `第${l}爻`).join('、')}

变卦：${changedHexagram?.name || '无'}
${changedHexagram ? `上卦：${changedHexagram.upperTrigram}
下卦：${changedHexagram.lowerTrigram}` : ''}` : '无变爻'}

请详细解读此卦的吉凶和指导意义。`;

                try {
                    const interpretation = await callDeepSeekAI(systemPrompt, userPrompt);

                    // 扣除积分
                    const remainingCredits = await useCredit(user.id);
                    if (remainingCredits === null) {
                        console.error('[liuyao] 扣除积分失败');
                    }

                    // 保存记录
                    const serviceClient = getServiceClient();
                    const hexagramCode = yaos?.map(y => y.type).join('') || '';
                    const changedCode = changedHexagram ? yaos?.map((y, i) =>
                        changedLines?.includes(i + 1) ? (y.type === 1 ? 0 : 1) : y.type
                    ).join('') : null;

                    await serviceClient
                        .from('liuyao_divinations')
                        .insert({
                            user_id: user.id,
                            question,
                            hexagram_code: hexagramCode,
                            changed_hexagram_code: changedCode,
                            changed_lines: changedLines,
                            ai_interpretation: interpretation,
                        });

                    return NextResponse.json({
                        success: true,
                        data: { interpretation }
                    });

                } catch (aiError) {
                    console.error('[liuyao] AI 解读失败:', aiError);
                    return NextResponse.json({
                        success: false,
                        error: 'AI 解读失败，请稍后重试'
                    }, { status: 500 });
                }
            }

            case 'history': {
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

                const serviceClient = getServiceClient();
                const { data: history, error: historyError } = await serviceClient
                    .from('liuyao_divinations')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(20);

                if (historyError) {
                    return NextResponse.json({
                        success: false,
                        error: '获取历史记录失败'
                    }, { status: 500 });
                }

                return NextResponse.json({
                    success: true,
                    data: { history }
                });
            }

            default:
                return NextResponse.json({
                    success: false,
                    error: '未知操作'
                }, { status: 400 });
        }
    } catch (error) {
        console.error('[liuyao] API 错误:', error);
        return NextResponse.json({
            success: false,
            error: '服务器错误'
        }, { status: 500 });
    }
}
