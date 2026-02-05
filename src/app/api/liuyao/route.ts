/**
 * 六爻占卜 API 路由
 *
 * 提供 AI 解卦功能，包含传统六爻分析
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/api-utils';
import { useCredit, hasCredits, addCredits } from '@/lib/credits';
import { callAIWithReasoning, callAIStream, readAIStream } from '@/lib/ai';
import { DEFAULT_MODEL_ID } from '@/lib/ai-config';
import { getEffectiveMembershipType } from '@/lib/membership-server';
import { resolveModelAccessAsync } from '@/lib/ai-access';
import {
    type Hexagram,
    type Yao,
    performFullAnalysis,
    yaosTpCode,
    getLiuQinMeaning,
    WANG_SHUAI_LABELS,
    KONG_WANG_LABELS,
    HUA_TYPE_LABELS,
    SPECIAL_STATUS_LABELS,
} from '@/lib/liuyao';
import { getShiYingPosition, findPalace } from '@/lib/eight-palaces';
import { getHexagramText } from '@/lib/hexagram-texts';
import { requireBearerUser } from '@/lib/api-utils';

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
    stream?: boolean;  // 是否使用流式输出
}

export async function POST(request: NextRequest) {
    try {
        const body: LiuyaoRequest = await request.json();
        const { action, question, hexagram, changedHexagram, changedLines, yaos, divinationId, modelId, reasoning, stream } = body;

        switch (action) {
            // 保存起卦记录（不含 AI 解读）
            case 'save': {
                // 验证用户身份
                const authResult = await requireBearerUser(request);
                if ('error' in authResult) {
                    return NextResponse.json({
                        success: false,
                        error: authResult.error.message
                    }, { status: authResult.error.status });
                }
                const { user: saveUser } = authResult;

                const hexagramCode = yaos?.map(y => y.type).join('') || '';
                const changedCode = changedHexagram ? yaos?.map((y, i) =>
                    changedLines?.includes(i + 1) ? (y.type === 1 ? 0 : 1) : y.type
                ).join('') : null;

                const serviceClient = getServiceRoleClient();
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
                const authResult = await requireBearerUser(request);
                if ('error' in authResult) {
                    return NextResponse.json({
                        success: false,
                        error: authResult.error.message
                    }, { status: authResult.error.status });
                }
                const { user } = authResult;

                // 检查积分
                const hasEnoughCredits = await hasCredits(user.id);
                if (!hasEnoughCredits) {
                    return NextResponse.json({
                        success: false,
                        error: '积分不足，请充值后使用'
                    }, { status: 403 });
                }

                const membershipType = await getEffectiveMembershipType(user.id);
                const access = await resolveModelAccessAsync(modelId, DEFAULT_MODEL_ID, membershipType, reasoning);
                if ('error' in access) {
                    return NextResponse.json({
                        success: false,
                        error: access.error
                    }, { status: access.status });
                }
                const { modelId: requestedModelId, reasoningEnabled } = access;

                // 计算传统分析数据（使用完整分析函数）
                let traditionalInfo = '';
                let analysisDate = new Date();
                const serviceClient = getServiceRoleClient();

                if (divinationId) {
                    const { data, error } = await serviceClient
                        .from('liuyao_divinations')
                        .select('created_at')
                        .eq('id', divinationId)
                        .eq('user_id', user.id)
                        .maybeSingle();

                    if (error) {
                        console.error('[liuyao] 获取起卦时间失败:', error.message);
                    } else if (data?.created_at) {
                        analysisDate = new Date(data.created_at);
                    }
                }
                if (yaos && yaos.length === 6) {
                    const hexagramCode = yaosTpCode(yaos);
                    const changedCode = changedHexagram ? yaosTpCode(yaos.map((y: Yao, i: number) =>
                        changedLines?.includes(i + 1) ? { ...y, type: (y.type === 1 ? 0 : 1) as 0 | 1 } : y
                    )) : undefined;

                    // 执行完整分析
                    const analysis = performFullAnalysis(
                        yaos,
                        hexagramCode,
                        changedCode,
                        question || '',
                        analysisDate
                    );

                    const { ganZhiTime, kongWangByPillar, kongWang, fullYaos, yongShen, fuShen, shenSystem, timeRecommendations, summary, liuChongGuaInfo, sanHeAnalysis } = analysis;
                    const shiYing = getShiYingPosition(hexagramCode);
                    const palace = findPalace(hexagramCode);
                    const hexText = getHexagramText(hexagram.name);
                    const yaoNames = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'];

                    // 构建各爻详细信息（包含暗动/日破、十二长生）
                    const yaoDetails = fullYaos.map((y) => {
                        const shiYingMark = y.isShiYao ? '【世】' : y.isYingYao ? '【应】' : '';
                        const yongShenMark = y.position === yongShen.position ? '【用神】' : '';
                        const changeMark = y.change === 'changing' ? '（动）' : '';
                        const wangShuaiMark = WANG_SHUAI_LABELS[y.strength.wangShuai];
                        const kongMark = y.kongWangState !== 'not_kong' ? KONG_WANG_LABELS[y.kongWangState] : '';
                        const huaMark = y.changeAnalysis && y.changeAnalysis.huaType !== 'none'
                            ? HUA_TYPE_LABELS[y.changeAnalysis.huaType]
                            : '';
                        // 暗动/日破标记
                        const specialMark = y.strength.specialStatus !== 'none'
                            ? SPECIAL_STATUS_LABELS[y.strength.specialStatus]
                            : '';
                        // 十二长生标记
                        const changShengMark = y.changSheng
                            ? `${y.changSheng.stage}`
                            : '';
                        return `${yaoNames[y.position - 1]}：${y.liuQin} ${y.liuShen} ${y.naJia}${y.wuXing} ${shiYingMark}${yongShenMark}${changeMark} [${wangShuaiMark}${kongMark ? '·' + kongMark : ''}${huaMark ? '·' + huaMark : ''}${specialMark ? '·' + specialMark : ''}${changShengMark ? '·' + changShengMark : ''}] ${y.influence.description}`;
                    }).join('\n');

                    // 构建伏神信息
                    let fuShenInfo = '';
                    if (fuShen && fuShen.length > 0) {
                        fuShenInfo = `\n伏神分析（用神${yongShen.type}不上卦）：
                        ${fuShen.map(fs => `- ${fs.liuQin}伏于${yaoNames[fs.feiShenPosition - 1]}（${fs.feiShenLiuQin}）下，纳甲${fs.naJia}${fs.wuXing}，${fs.availabilityReason}`).join('\n')}`;
                    }

                    // 构建神系信息
                    let shenSystemInfo = '';
                    if (shenSystem) {
                        const parts = [];
                        if (shenSystem.yuanShen) {
                            parts.push(`原神（生用神）：${shenSystem.yuanShen.liuQin}（${shenSystem.yuanShen.wuXing}）${shenSystem.yuanShen.positions.length > 0 ? `在${shenSystem.yuanShen.positions.map(p => yaoNames[p - 1]).join('、')}` : '不上卦'}`);
                        }
                        if (shenSystem.jiShen) {
                            parts.push(`忌神（克用神）：${shenSystem.jiShen.liuQin}（${shenSystem.jiShen.wuXing}）${shenSystem.jiShen.positions.length > 0 ? `在${shenSystem.jiShen.positions.map(p => yaoNames[p - 1]).join('、')}` : '不上卦'}`);
                        }
                        if (shenSystem.chouShen) {
                            parts.push(`仇神（克原神）：${shenSystem.chouShen.liuQin}（${shenSystem.chouShen.wuXing}）${shenSystem.chouShen.positions.length > 0 ? `在${shenSystem.chouShen.positions.map(p => yaoNames[p - 1]).join('、')}` : '不上卦'}`);
                        }
                        if (parts.length > 0) {
                            shenSystemInfo = `\n神系分析：
                            ${parts.join('\n')}`;
                        }
                    }

                    // 构建变卦信息
                    const changedHexagramInfo = changedHexagram && changedLines && changedLines.length > 0
                        ? `变卦：${changedHexagram.name}（${changedHexagram.upperTrigram}/${changedHexagram.lowerTrigram}）
变爻：${changedLines.map(l => yaoNames[l - 1]).join('、')}`
                        : '无变爻';

                    traditionalInfo = `【卦象信息】
本卦：${hexagram.name}
上卦：${hexagram.upperTrigram}（${hexagram.nature}）
下卦：${hexagram.lowerTrigram}
五行：${hexagram.element}
宫位：${palace?.name || '未知'}（${palace?.element || ''}）
${changedHexagramInfo}

【起卦时间】
${ganZhiTime.year.gan}${ganZhiTime.year.zhi}年 ${ganZhiTime.month.gan}${ganZhiTime.month.zhi}月 ${ganZhiTime.day.gan}${ganZhiTime.day.zhi}日 ${ganZhiTime.hour.gan}${ganZhiTime.hour.zhi}时
年旬空：${kongWangByPillar?.year.xun || kongWang.xun}，空亡地支：${(kongWangByPillar?.year.kongDizhi || kongWang.kongDizhi).join('、')}
月旬空：${kongWangByPillar?.month.xun || kongWang.xun}，空亡地支：${(kongWangByPillar?.month.kongDizhi || kongWang.kongDizhi).join('、')}
日旬空：${kongWangByPillar?.day.xun || kongWang.xun}，空亡地支：${(kongWangByPillar?.day.kongDizhi || kongWang.kongDizhi).join('、')}
时旬空：${kongWangByPillar?.hour.xun || kongWang.xun}，空亡地支：${(kongWangByPillar?.hour.kongDizhi || kongWang.kongDizhi).join('、')}
注：六爻断卦判空亡以“日旬空”为主，年/月/时旬空供参考。
世爻：第${shiYing.shi}爻 | 应爻：第${shiYing.ying}爻
${liuChongGuaInfo.isLiuChongGua ? '六冲卦：是（主事散、应期急）' : liuChongGuaInfo.description ? liuChongGuaInfo.description : ''}
${sanHeAnalysis.hasFullSanHe && sanHeAnalysis.fullSanHe ? `三合局：${sanHeAnalysis.fullSanHe.name}（合力强大，可解冲解空）` : sanHeAnalysis.hasBanHe && sanHeAnalysis.banHe && sanHeAnalysis.banHe.length > 0 ? `半合：${sanHeAnalysis.banHe.map(b => `${b.branches.join('')}${b.type === 'sheng' ? '生方' : '墓方'}半合${b.result}`).join('、')}` : ''}

【六爻排盘】
${yaoDetails}

【用神分析】
用神：${yongShen.type}（${getLiuQinMeaning(yongShen.type)}）
位置：第${yongShen.position}爻 | 五行：${yongShen.element} | 状态：${yongShen.strength === 'strong' ? '旺相' : yongShen.strength === 'moderate' ? '平和' : '衰弱'}
${yongShen.analysis}
${fuShenInfo}
${shenSystemInfo}

【综合判断】
趋势：${summary.overallTrend === 'favorable' ? '吉' : summary.overallTrend === 'unfavorable' ? '凶' : '平'}
关键：${summary.keyFactors.join('、')}
${hexText ? `
【卦辞象辞】
卦辞：${hexText.gua}
象辞：${hexText.xiang}` : ''}
${timeRecommendations.length > 0 ? `
【应期参考】
${timeRecommendations.map((r: { type: string; timeframe: string; description: string }) => `${r.type === 'favorable' ? '利' : r.type === 'unfavorable' ? '忌' : '要'}（${r.timeframe}）：${r.description}`).join('\n')}` : ''}`;
                }

                // 六爻解读系统提示词：固定的断卦规则 + 输出结构约束
                const systemPrompt = `你是一位精通《周易》的资深易学大师，深谙野鹤老人《增删卜易》、王洪绪《卜筮正宗》之精髓。

核心断卦原则：
- 月建为纲，日辰为领：月建主宰爻的旺衰，日辰可生克冲合
- 旺相休囚死：爻在月令的五种状态决定其根本力量
- 暗动与日破：静爻旺相逢日冲为暗动（有力），静爻休囚逢日冲为日破（无力）
- 空亡论断：静空为真空（无力），动空不空，冲空不空，临月建不空
- 用神为核心：用神旺相有力则吉，衰弱受克则凶
- 原神忌神仇神：原神生用神为吉，忌神克用神为凶，仇神克原神助忌神
- 三合局论断：申子辰合水、亥卯未合木、寅午戌合火、巳酉丑合金，三合可解冲解空，力量强大
- 十二长生：长生、沐浴、冠带、临官、帝旺为旺相，病、死、墓、绝为衰弱
- 六冲卦论断：六冲卦主事散、应期急、变动大

解读格式：
1. 【卦象概述】本卦象征和基本含义
2. 【用神分析】用神旺衰、空亡、月日生克情况
3. 【神系作用】原神、忌神、仇神对用神的影响
4. 【动变分析】动爻的化进化退、回头生克等（若有动爻）
5. 【伏神论断】伏神可用性分析（若用神不上卦）
6. 【世应关系】世爻与应爻的关系分析
7. 【综合判断】明确吉凶判断和应期建议

要求：专业而通俗易懂，让求卦者理解断卦依据。字数800-1200字。`;

                // 用户提示词：携带起卦信息与用户问题，不含系统规则
                const userPrompt = question
                    ? `【求卦问题】${question}

${traditionalInfo}

请根据以上卦象信息，为求卦者详细解读此卦。`
                    : `${traditionalInfo}

请详细解读此卦的吉凶和指导意义。`;

                const remainingCredits = await useCredit(user.id);
                if (remainingCredits === null) {
                    console.error('[liuyao] 扣除积分失败');
                    return NextResponse.json({
                        success: false,
                        error: '积分扣减失败，请稍后重试'
                    }, { status: 500 });
                }

                try {
                    // 流式输出模式
                    if (stream) {
                        const streamBody = await callAIStream(
                            [{ role: 'user', content: userPrompt }],
                            'general',
                            `\n\n${systemPrompt}\n\n`,
                            requestedModelId,
                            {
                                reasoning: reasoningEnabled,
                                temperature: 0.7,
                            }
                        );
                        const [clientStream, tapStream] = streamBody.tee();

                        // 异步持久化流式结果
                        void (async () => {
                            try {
                                const { content: interpretation, reasoning: reasoningText } = await readAIStream(tapStream);
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

                                if (divinationId) {
                                    const { error: updateError } = await serviceClient
                                        .from('liuyao_divinations')
                                        .update({ conversation_id: conversationId })
                                        .eq('id', divinationId)
                                        .eq('user_id', user.id);

                                    if (updateError) {
                                        console.error('[liuyao] 更新起卦记录失败:', updateError.message);
                                    }
                                } else {
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
                            } catch (streamError) {
                                console.error('[liuyao] 流式结果保存失败:', streamError);
                            }
                        })();

                        // 返回 SSE 格式响应
                        return new Response(clientStream, {
                            headers: {
                                'Content-Type': 'text/event-stream',
                                'Cache-Control': 'no-cache',
                                'Connection': 'keep-alive',
                            },
                        });
                    }

                    // 非流式模式：用系统提示词 override 默认人格，确保解读格式一致
                    const { content: interpretation, reasoning: reasoningText } = await callAIWithReasoning(
                        [{ role: 'user', content: userPrompt }],
                        'general',
                        requestedModelId,
                        `\n\n${systemPrompt}\n\n`,
                        {
                            reasoning: reasoningEnabled,
                            temperature: 0.7,
                        }
                    );

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
                    await addCredits(user.id, 1);
                    console.error('[liuyao] AI 解读失败:', aiError);
                    return NextResponse.json({
                        success: false,
                        error: 'AI 解读失败，请稍后重试'
                    }, { status: 500 });
                }
            }

            case 'history': {
                const authResult = await requireBearerUser(request);
                if ('error' in authResult) {
                    return NextResponse.json({
                        success: false,
                        error: authResult.error.message
                    }, { status: authResult.error.status });
                }
                const { user } = authResult;

                const serviceClient = getServiceRoleClient();
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
