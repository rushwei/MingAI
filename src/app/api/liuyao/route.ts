/**
 * 六爻占卜 API 路由
 *
 * 提供 AI 解卦功能，包含传统六爻分析
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getServiceClient } from '@/lib/supabase-server';
import { useCredit, hasCredits } from '@/lib/credits';
import { callAIWithReasoning } from '@/lib/ai';
import { DEFAULT_MODEL_ID, getModelConfig } from '@/lib/ai-config';
import { getEffectiveMembershipType } from '@/lib/membership-server';
import { isModelAllowedForMembership, isReasoningAllowedForMembership } from '@/lib/ai-access';
import {
    type Hexagram,
    type Yao,
    calculateFullYaoInfo,
    determineYongShen,
    calculateTimeRecommendations,
    getTodayDayStem,
    yaosTpCode,
    getLiuQinMeaning,
} from '@/lib/liuyao';
import { getShiYingPosition, findPalace } from '@/lib/eight-palaces';
import { getHexagramText } from '@/lib/hexagram-texts';

interface LiuyaoRequest {
    action: 'interpret' | 'save' | 'history';
    question?: string;
    hexagram?: Hexagram;
    changedHexagram?: Hexagram;
    changedLines?: number[];
    yaos?: Yao[];
    dayStem?: string; // 可选：日干，默认使用今日
    divinationId?: string; // 已保存的起卦记录 ID，用于关联 AI 解读
    modelId?: string;
    reasoning?: boolean;
}

export async function POST(request: NextRequest) {
    try {
        const body: LiuyaoRequest = await request.json();
        const { action, question, hexagram, changedHexagram, changedLines, yaos, dayStem: inputDayStem, divinationId, modelId, reasoning } = body;

        switch (action) {
            // 保存起卦记录（不含 AI 解读）
            case 'save': {
                // 验证用户身份
                const saveAuthHeader = request.headers.get('authorization');
                if (!saveAuthHeader) {
                    return NextResponse.json({
                        success: false,
                        error: '请先登录'
                    }, { status: 401 });
                }

                const saveToken = saveAuthHeader.replace('Bearer ', '');
                const { data: { user: saveUser }, error: saveAuthError } = await supabase.auth.getUser(saveToken);

                if (saveAuthError || !saveUser) {
                    return NextResponse.json({
                        success: false,
                        error: '认证失败'
                    }, { status: 401 });
                }

                const hexagramCode = yaos?.map(y => y.type).join('') || '';
                const changedCode = changedHexagram ? yaos?.map((y, i) =>
                    changedLines?.includes(i + 1) ? (y.type === 1 ? 0 : 1) : y.type
                ).join('') : null;

                const serviceClient = getServiceClient();
                const { data: insertedDivination, error: insertError } = await serviceClient
                    .from('liuyao_divinations')
                    .insert({
                        user_id: saveUser.id,
                        question: question || '',
                        hexagram_code: hexagramCode,
                        changed_hexagram_code: changedCode,
                        changed_lines: changedLines,
                    })
                    .select('id')
                    .single();

                if (insertError) {
                    console.error('[liuyao] 保存起卦记录失败:', insertError.message);
                    return NextResponse.json({
                        success: false,
                        error: '保存记录失败'
                    }, { status: 500 });
                }

                return NextResponse.json({
                    success: true,
                    data: { divinationId: insertedDivination?.id }
                });
            }

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

                const requestedModelId = modelId || DEFAULT_MODEL_ID;
                const modelConfig = getModelConfig(requestedModelId);
                if (!modelConfig) {
                    return NextResponse.json({
                        success: false,
                        error: '模型不可用'
                    }, { status: 400 });
                }
                const membershipType = await getEffectiveMembershipType(user.id);
                if (!isModelAllowedForMembership(modelConfig, membershipType)) {
                    return NextResponse.json({
                        success: false,
                        error: '当前会员等级无法使用该模型'
                    }, { status: 403 });
                }
                const reasoningAllowed = isReasoningAllowedForMembership(modelConfig, membershipType);
                const reasoningEnabled = reasoningAllowed ? !!reasoning : false;

                // 获取日干（用于六神计算）
                const dayStem = inputDayStem || getTodayDayStem();

                // 计算传统分析数据
                let traditionalInfo = '';
                if (yaos && yaos.length === 6) {
                    const hexagramCode = yaosTpCode(yaos);
                    const fullYaos = calculateFullYaoInfo(yaos, hexagramCode, dayStem);
                    const shiYing = getShiYingPosition(hexagramCode);
                    const yongShen = determineYongShen(question || '', fullYaos);
                    const timeRecs = calculateTimeRecommendations(yongShen, fullYaos);
                    const palace = findPalace(hexagramCode);
                    const hexText = getHexagramText(hexagram.name);

                    // 构建传统分析信息
                    const yaoDetails = fullYaos.map((y, i) => {
                        const names = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'];
                        const shiYingMark = y.isShiYao ? '【世】' : y.isYingYao ? '【应】' : '';
                        const yongShenMark = y.position === yongShen.position ? '【用神】' : '';
                        const changeMark = y.change === 'changing' ? '（动）' : '';
                        return `${names[i]}：${y.liuQin} ${y.liuShen} ${y.naJia}${y.wuXing} ${shiYingMark}${yongShenMark}${changeMark}`;
                    }).join('\n');

                    traditionalInfo = `
【传统六爻分析】
起卦日干：${dayStem}日
所属宫位：${palace?.name || '未知'}（${palace?.element || ''}）
世爻位置：第${shiYing.shi}爻
应爻位置：第${shiYing.ying}爻

各爻六亲六神：
${yaoDetails}

用神分析：
- 用神类型：${yongShen.type}（${getLiuQinMeaning(yongShen.type)}）
- 用神位置：第${yongShen.position}爻
- 用神五行：${yongShen.element}
- 用神状态：${yongShen.strength === 'strong' ? '旺相' : yongShen.strength === 'moderate' ? '平和' : '衰弱'}
- 分析：${yongShen.analysis}

${hexText ? `卦辞：${hexText.gua}
象辞：${hexText.xiang}` : ''}

${timeRecs.length > 0 ? `时间建议：
${timeRecs.map(r => `- ${r.type === 'favorable' ? '有利' : r.type === 'unfavorable' ? '不利' : '关键'}（${r.timeframe}）：${r.description}`).join('\n')}` : ''}
`;
                }

                // 构建解读 prompt
                const yaoDescription = yaos?.map((y, i) => {
                    const names = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'];
                    const type = y.type === 1 ? '阳爻' : '阴爻';
                    const change = y.change === 'changing' ? '（变）' : '';
                    return `${names[i]}：${type}${change}`;
                }).join('\n') || '';

                const systemPrompt = `你是一位精通《周易》的资深易学大师，拥有数十年的六爻断卦经验。
请根据提供的卦象信息和传统六爻分析数据，为求卦者提供专业、详尽的解读。

解读要求：
1. 先介绍本卦的基本含义和象征
2. 结合六亲六神分析各爻的含义，特别关注变爻和用神
3. 分析世应关系，判断事态发展
4. 如有变卦，分析变卦的趋势指向
5. 结合问题给出具体的吉凶判断和时间建议
6. 语言应既专业又通俗易懂，避免过于晦涩
7. 解读字数控制在 600-1000 字`;

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
${traditionalInfo}
请为求卦者详细解读此卦，重点参考传统六爻分析中的用神、世应、六亲六神关系。`
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
${traditionalInfo}
请详细解读此卦的吉凶和指导意义，参考传统六爻分析数据。`;

                try {
                    const { content: interpretation, reasoning: reasoningText } = await callAIWithReasoning(
                        [{ role: 'user', content: userPrompt }],
                        'master',
                        requestedModelId,
                        `\n\n${systemPrompt}\n\n`,
                        {
                            reasoning: reasoningEnabled,
                            temperature: 0.7,
                            maxTokens: 1500,
                        }
                    );

                    // 扣除积分
                    const remainingCredits = await useCredit(user.id);
                    if (remainingCredits === null) {
                        console.error('[liuyao] 扣除积分失败');
                        return NextResponse.json({
                            success: false,
                            error: '积分扣减失败，请稍后重试'
                        }, { status: 500 });
                    }

                    // 保存 AI 分析到 conversations 表
                    const { createAIAnalysisConversation, generateLiuyaoTitle } = await import('@/lib/ai-analysis');
                    const hexagramCode = yaos?.map(y => y.type).join('') || '';
                    const changedCode = changedHexagram ? yaos?.map((y, i) =>
                        changedLines?.includes(i + 1) ? (y.type === 1 ? 0 : 1) : y.type
                    ).join('') : null;
                    const conversationId = await createAIAnalysisConversation({
                        userId: user.id,
                        sourceType: 'liuyao',
                        sourceData: {
                            hexagram_code: hexagramCode,
                            hexagram_name: hexagram.name,
                            changed_hexagram_code: changedCode,
                            changed_hexagram_name: changedHexagram?.name,
                            changed_lines: changedLines,
                            question: question || null,
                            model_id: requestedModelId,
                            reasoning: reasoningEnabled,
                            reasoning_text: reasoningText || null,
                        },
                        title: generateLiuyaoTitle(question, hexagram.name, changedHexagram?.name),
                        aiResponse: interpretation,
                    });

                    if (!conversationId) {
                        console.error('[liuyao] 保存 AI 分析对话失败');
                    }

                    // 更新已有记录的 conversation_id，或插入新记录（兼容旧调用）
                    const serviceClient = getServiceClient();
                    if (divinationId) {
                        // 更新已有记录
                        const { error: updateError } = await serviceClient
                            .from('liuyao_divinations')
                            .update({ conversation_id: conversationId })
                            .eq('id', divinationId)
                            .eq('user_id', user.id);

                        if (updateError) {
                            console.error('[liuyao] 更新起卦记录失败:', updateError.message);
                        }
                    } else {
                        // 兼容旧调用：插入新记录
                        const { error: insertError } = await serviceClient
                            .from('liuyao_divinations')
                            .insert({
                                user_id: user.id,
                                question: question || '',
                                hexagram_code: hexagramCode,
                                changed_hexagram_code: changedCode,
                                changed_lines: changedLines,
                                conversation_id: conversationId,
                            });

                        if (insertError) {
                            console.error('[liuyao] 保存起卦记录失败:', insertError.message);
                        }
                    }

                    return NextResponse.json({
                        success: true,
                        data: { interpretation, reasoning: reasoningText, conversationId }
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
