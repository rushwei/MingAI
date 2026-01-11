/**
 * 关系合盘 API 路由
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getServiceClient } from '@/lib/supabase-server';
import { useCredit, hasCredits } from '@/lib/credits';
import { type HepanResult, getHepanTypeName } from '@/lib/hepan';

interface HepanRequest {
    action: 'analyze' | 'save' | 'list';
    result?: HepanResult;
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
        const body: HepanRequest = await request.json();
        const { action, result } = body;

        if (action === 'analyze') {
            if (!result) {
                return NextResponse.json({
                    success: false,
                    error: '请提供合盘结果'
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

            const typeName = getHepanTypeName(result.type);
            const dimensionsSummary = result.dimensions
                .map(d => `${d.name}: ${d.score}分 - ${d.description}`)
                .join('\n');
            const conflictsSummary = result.conflicts.length > 0
                ? result.conflicts.map(c => `[${c.severity}] ${c.title}: ${c.description}`).join('\n')
                : '无明显冲突';

            const systemPrompt = `你是一位资深的命理学家和关系咨询师，精通八字合盘分析。
请根据提供的合盘分析结果，给出专业、实用的深度解读和相处建议。

分析应包括：
1. 对整体契合度的解读
2. 双方相处的优势分析
3. 需要注意的问题和化解方法
4. 针对具体关系类型的实用建议
5. 未来发展展望

语言应温和、建设性，避免过于绝对的论断。
字数控制在 600-800 字。`;

            const userPrompt = `合盘类型：${typeName}

双方信息：
- ${result.person1.name}：${result.person1.year}年${result.person1.month}月${result.person1.day}日
- ${result.person2.name}：${result.person2.year}年${result.person2.month}月${result.person2.day}日

综合契合度：${result.overallScore}分

各维度分析：
${dimensionsSummary}

潜在冲突点：
${conflictsSummary}

请为这对关系提供深度分析和相处建议。`;

            try {
                const analysis = await callDeepSeekAI(systemPrompt, userPrompt);

                // 扣除积分
                const remainingCredits = await useCredit(user.id);
                if (remainingCredits === null) {
                    console.error('[hepan] 扣除积分失败');
                    return NextResponse.json({
                        success: false,
                        error: '积分扣减失败，请稍后重试'
                    }, { status: 500 });
                }

                // 保存合盘记录到 hepan_charts（不含 AI 分析）
                const serviceClient = getServiceClient();
                await serviceClient
                    .from('hepan_charts')
                    .insert({
                        user_id: user.id,
                        type: result.type,
                        person1_name: result.person1.name,
                        person1_birth: {
                            year: result.person1.year,
                            month: result.person1.month,
                            day: result.person1.day,
                            hour: result.person1.hour,
                        },
                        person2_name: result.person2.name,
                        person2_birth: {
                            year: result.person2.year,
                            month: result.person2.month,
                            day: result.person2.day,
                            hour: result.person2.hour,
                        },
                        compatibility_score: result.overallScore,
                    });

                // 保存 AI 分析到 conversations 表
                const { createAIAnalysisConversation, generateHepanTitle } = await import('@/lib/ai-analysis');
                const conversationId = await createAIAnalysisConversation({
                    userId: user.id,
                    sourceType: 'hepan',
                    sourceData: {
                        type: result.type,
                        person1_name: result.person1.name,
                        person1_birth: result.person1,
                        person2_name: result.person2.name,
                        person2_birth: result.person2,
                        compatibility_score: result.overallScore,
                        dimensions: result.dimensions,
                        conflicts: result.conflicts,
                    },
                    title: generateHepanTitle(result.person1.name, result.person2.name, result.type),
                    aiResponse: analysis,
                });

                if (!conversationId) {
                    console.error('[hepan] 保存 AI 分析对话失败');
                }

                return NextResponse.json({
                    success: true,
                    data: { analysis, conversationId }
                });

            } catch (aiError) {
                console.error('[hepan] AI 分析失败:', aiError);
                return NextResponse.json({
                    success: false,
                    error: 'AI 分析失败，请稍后重试'
                }, { status: 500 });
            }
        }

        if (action === 'list') {
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
            const { data: charts, error: listError } = await serviceClient
                .from('hepan_charts')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(20);

            if (listError) {
                return NextResponse.json({
                    success: false,
                    error: '获取历史记录失败'
                }, { status: 500 });
            }

            return NextResponse.json({
                success: true,
                data: { charts }
            });
        }

        return NextResponse.json({
            success: false,
            error: '未知操作'
        }, { status: 400 });

    } catch (error) {
        console.error('[hepan] API 错误:', error);
        return NextResponse.json({
            success: false,
            error: '服务器错误'
        }, { status: 500 });
    }
}
