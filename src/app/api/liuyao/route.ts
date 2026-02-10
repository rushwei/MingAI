/**
 * 六爻占卜 API 路由
 *
 * 提供 AI 解卦功能，包含传统六爻分析
 */
import { NextRequest } from 'next/server';
import { getServiceRoleClient, jsonError, jsonOk, requireBearerUser } from '@/lib/api-utils';
import { useCredit, hasCredits, addCredits } from '@/lib/credits';
import { callAIWithReasoning, callAIStream, readAIStream } from '@/lib/ai';
import { DEFAULT_MODEL_ID } from '@/lib/ai-config';
import { getEffectiveMembershipType } from '@/lib/membership-server';
import { resolveModelAccessAsync } from '@/lib/ai-access';
import {
    type Hexagram,
    type Yao,
    type LiuQin,
    performFullAnalysis,
    yaosTpCode,
    WANG_SHUAI_LABELS,
    KONG_WANG_LABELS,
} from '@/lib/liuyao';
import { getShiYingPosition, findPalace } from '@/lib/eight-palaces';
import { getHexagramText } from '@/lib/hexagram-texts';

interface LiuyaoRequest {
    action: 'interpret' | 'save' | 'history' | 'update';
    question?: string;
    yongShenTargets?: LiuQin[];
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

const LIU_QIN_VALUES: LiuQin[] = ['父母', '兄弟', '子孙', '妻财', '官鬼'];

function parseYongShenTargets(
    value: unknown,
    options: { required: boolean }
): { targets: LiuQin[]; error?: string } {
    if (value == null) {
        if (options.required) {
            return { targets: [], error: '请至少选择一个分析目标' };
        }
        return { targets: [] };
    }
    if (!Array.isArray(value)) {
        return { targets: [], error: '分析目标格式错误' };
    }
    if (value.length === 0) {
        if (options.required) {
            return { targets: [], error: '请至少选择一个分析目标' };
        }
        return { targets: [] };
    }
    const unique = new Set<LiuQin>();
    for (const item of value) {
        if (typeof item !== 'string' || !LIU_QIN_VALUES.includes(item as LiuQin)) {
            return { targets: [], error: '分析目标包含非法值' };
        }
        unique.add(item as LiuQin);
    }
    if (unique.size === 0 && options.required) {
        return { targets: [], error: '请至少选择一个分析目标' };
    }
    return { targets: Array.from(unique) };
}

function toPersistedYongShenTargets(targets: LiuQin[]): LiuQin[] | null {
    return targets.length > 0 ? targets : null;
}

export async function POST(request: NextRequest) {
    try {
        const body: LiuyaoRequest = await request.json();
        const {
            action,
            question,
            yongShenTargets,
            hexagram,
            changedHexagram,
            changedLines,
            yaos,
            divinationId,
            modelId,
            reasoning,
            stream,
        } = body;

        switch (action) {
            // 保存起卦记录（不含 AI 解读）
            case 'save': {
                const needsTargets = Boolean(question?.trim());
                const parsedTargets = parseYongShenTargets(yongShenTargets, { required: needsTargets });
                if (parsedTargets.error) {
                    return jsonError(parsedTargets.error, 400, { success: false });
                }

                // 验证用户身份
                const authResult = await requireBearerUser(request);
                if ('error' in authResult) {
                    return jsonError(authResult.error.message, authResult.error.status, { success: false });
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
                        yongshen_targets: parsedTargets.targets.length > 0 ? parsedTargets.targets : null,
                        hexagram_code: hexagramCode,
                        changed_hexagram_code: changedCode,
                        changed_lines: changedLines,
                    })
                    .select('id')
                    .single();

                if (insertError) {
                    console.error('[liuyao] 保存起卦记录失败:', insertError.message);
                    return jsonError('保存记录失败', 500, { success: false });
                }

                return jsonOk({
                    success: true,
                    data: { divinationId: insertedDivination?.id }
                });
            }

            case 'interpret': {
                if (!hexagram) {
                    return jsonError('请提供卦象', 400, { success: false });
                }

                // 验证用户身份
                const authResult = await requireBearerUser(request);
                if ('error' in authResult) {
                    return jsonError(authResult.error.message, authResult.error.status, { success: false });
                }
                const { user } = authResult;

                const serviceClient = getServiceRoleClient();
                let analysisDate = new Date();
                let effectiveQuestion = typeof question === 'string' ? question : '';
                let persistedTargets: unknown = undefined;

                if (divinationId) {
                    const { data, error } = await serviceClient
                        .from('liuyao_divinations')
                        .select('created_at, question, yongshen_targets')
                        .eq('id', divinationId)
                        .eq('user_id', user.id)
                        .maybeSingle();

                    if (error) {
                        console.error('[liuyao] 获取起卦上下文失败:', error.message);
                    } else if (data) {
                        if (data.created_at) {
                            analysisDate = new Date(data.created_at);
                        }
                        if (!effectiveQuestion.trim() && typeof data.question === 'string') {
                            effectiveQuestion = data.question;
                        }
                        if (yongShenTargets == null) {
                            persistedTargets = data.yongshen_targets;
                        }
                    }
                }

                const needsTargets = Boolean(effectiveQuestion.trim());
                const parsedTargets = parseYongShenTargets(
                    yongShenTargets ?? persistedTargets,
                    { required: needsTargets }
                );
                if (parsedTargets.error) {
                    return jsonError(parsedTargets.error, 400, { success: false });
                }

                // 检查积分
                const hasEnoughCredits = await hasCredits(user.id);
                if (!hasEnoughCredits) {
                    return jsonError('积分不足，请充值后使用', 403, { success: false });
                }

                const membershipType = await getEffectiveMembershipType(user.id);
                const access = await resolveModelAccessAsync(modelId, DEFAULT_MODEL_ID, membershipType, reasoning);
                if ('error' in access) {
                    return jsonError(access.error, access.status, { success: false });
                }
                const { modelId: requestedModelId, reasoningEnabled } = access;

                // 计算传统分析数据（使用完整分析函数）
                let traditionalInfo = '';
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
                        effectiveQuestion,
                        analysisDate,
                        { yongShenTargets: parsedTargets.targets }
                    );

                    const {
                        ganZhiTime,
                        kongWangByPillar,
                        kongWang,
                        fullYaos,
                        yongShen,
                        fuShen,
                        shenSystemByYongShen,
                        globalShenSha,
                        timeRecommendations,
                        liuChongGuaInfo,
                        sanHeAnalysis,
                        warnings,
                    } = analysis;
                    const shiYing = getShiYingPosition(hexagramCode);
                    const palace = findPalace(hexagramCode);
                    const hexText = getHexagramText(hexagram.name);
                    const yaoNames = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'];
                    const yongShenPositions = new Set(
                        yongShen
                            .map(group => group.selected.position)
                            .filter((position): position is number => typeof position === 'number')
                    );

                    // 构建各爻详细信息
                    const yaoDetails = fullYaos.map((y) => {
                        const shiYingMark = y.isShiYao ? '【世】' : y.isYingYao ? '【应】' : '';
                        const yongShenMark = yongShenPositions.has(y.position) ? '【用神】' : '';
                        const changeMark = y.isChanging ? '（动）' : '';
                        const statusParts = [
                            WANG_SHUAI_LABELS[y.strength.wangShuai],
                            y.kongWangState !== 'not_kong' ? KONG_WANG_LABELS[y.kongWangState] : '',
                            y.movementLabel,
                            y.changSheng?.stage,
                            y.changedYao?.relation,
                        ].filter(Boolean);
                        const shenShaMark = y.shenSha.length > 0 ? ` 神煞:${y.shenSha.join('、')}` : '';
                        return `${yaoNames[y.position - 1]}：${y.liuQin} ${y.liuShen} ${y.naJia}${y.wuXing} ${shiYingMark}${yongShenMark}${changeMark} [${statusParts.join('·')}] ${y.influence.description}${shenShaMark}`;
                    }).join('\n');

                    const yongShenInfo = yongShen.map((group) => {
                        const main = group.selected;
                        const candidates = group.candidates.length > 0
                            ? `\n候选（按参考优先级）：${group.candidates.map(c => `${c.liuQin}${c.position ? `@${yaoNames[c.position - 1]}` : ''}`).join('、')}${group.candidates.length > 1 ? '\n说明：候选顺序越靠后，参考度越低。' : ''}`
                            : '';
                        const system = shenSystemByYongShen.find(item => item.targetLiuQin === group.targetLiuQin);
                        const systemParts: string[] = [];
                        if (system?.yuanShen) systemParts.push(`原神 ${system.yuanShen.liuQin}(${system.yuanShen.wuXing})`);
                        if (system?.jiShen) systemParts.push(`忌神 ${system.jiShen.liuQin}(${system.jiShen.wuXing})`);
                        if (system?.chouShen) systemParts.push(`仇神 ${system.chouShen.liuQin}(${system.chouShen.wuXing})`);
                        const systemText = systemParts.length > 0 ? `\n神系：${systemParts.join('；')}` : '';
                        const recs = timeRecommendations.filter(rec => rec.targetLiuQin === group.targetLiuQin);
                        const recText = recs.length > 0
                            ? `\n应期：${recs.map(rec => `${rec.startDate}~${rec.endDate}(参考度${rec.confidence})`).join('；')}`
                            : '';
                        return `- 目标${group.targetLiuQin}（手动指定）\n  主用神：${main.liuQin}${main.position ? ` 第${main.position}爻` : ''} ${main.element} ${main.strengthLabel} ${main.movementLabel}${candidates}${systemText}${recText}`;
                    }).join('\n');

                    let fuShenInfo = '';
                    if (fuShen && fuShen.length > 0) {
                        fuShenInfo = `\n伏神分析：
                        ${fuShen.map(fs => `- ${fs.liuQin}伏于${yaoNames[fs.feiShenPosition - 1]}（${fs.feiShenLiuQin}）下，纳甲${fs.naJia}${fs.wuXing}，${fs.availabilityReason}`).join('\n')}`;
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
${yongShenInfo}
${globalShenSha.length > 0 ? `\n全局神煞：${globalShenSha.join('、')}` : ''}
${fuShenInfo}

${warnings && warnings.length > 0 ? `【风险提示】\n${warnings.join('；')}\n` : ''}
${hexText ? `
【卦辞象辞】
卦辞：${hexText.gua}
象辞：${hexText.xiang}` : ''}
${timeRecommendations.length > 0 ? `
【应期参考】
${timeRecommendations.map((r: { type: string; targetLiuQin: string; startDate: string; endDate: string; confidence: number; description: string }) => `${r.type === 'favorable' ? '利' : r.type === 'unfavorable' ? '忌' : '要'}（${r.targetLiuQin} ${r.startDate}~${r.endDate} 参考度${r.confidence}）：${r.description}`).join('\n')}` : ''}`;
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
                const userPrompt = effectiveQuestion
                    ? `【求卦问题】${effectiveQuestion}

${traditionalInfo}

请根据以上卦象信息，为求卦者详细解读此卦。`
                    : `${traditionalInfo}

请详细解读此卦的吉凶和指导意义。`;

                const remainingCredits = await useCredit(user.id);
                if (remainingCredits === null) {
                    console.error('[liuyao] 扣除积分失败');
                    return jsonError('积分扣减失败，请稍后重试', 500, { success: false });
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
                                        question: effectiveQuestion || null,
                                        yongshen_targets: parsedTargets.targets,
                                        model_id: requestedModelId,
                                        reasoning: reasoningEnabled,
                                        reasoning_text: reasoningText || null,
                                    },
                                    title: generateLiuyaoTitle(effectiveQuestion, hexagram.name, changedHexagram?.name),
                                    aiResponse: interpretation,
                                });

                                if (!conversationId) {
                                    console.error('[liuyao] 保存 AI 分析对话失败');
                                }

                                if (divinationId) {
                                    const { error: updateError } = await serviceClient
                                        .from('liuyao_divinations')
                                        .update({
                                            conversation_id: conversationId,
                                            yongshen_targets: toPersistedYongShenTargets(parsedTargets.targets),
                                        })
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
                                            question: effectiveQuestion,
                                            yongshen_targets: toPersistedYongShenTargets(parsedTargets.targets),
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
                            question: effectiveQuestion || null,
                            yongshen_targets: parsedTargets.targets,
                            model_id: requestedModelId,
                            reasoning: reasoningEnabled,
                            reasoning_text: reasoningText || null,
                        },
                        title: generateLiuyaoTitle(effectiveQuestion, hexagram.name, changedHexagram?.name),
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
                            .update({
                                conversation_id: conversationId,
                                yongshen_targets: toPersistedYongShenTargets(parsedTargets.targets),
                            })
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
                                question: effectiveQuestion,
                                yongshen_targets: toPersistedYongShenTargets(parsedTargets.targets),
                                hexagram_code: hexagramCode,
                                changed_hexagram_code: changedCode,
                                changed_lines: changedLines,
                                conversation_id: conversationId,
                            });

                        if (insertError) {
                            console.error('[liuyao] 保存起卦记录失败:', insertError.message);
                        }
                    }

                    return jsonOk({
                        success: true,
                        data: { interpretation, reasoning: reasoningText, conversationId }
                    });

                } catch (aiError) {
                    await addCredits(user.id, 1);
                    console.error('[liuyao] AI 解读失败:', aiError);
                    return jsonError('AI 解读失败，请稍后重试', 500, { success: false });
                }
            }

            case 'history': {
                const authResult = await requireBearerUser(request);
                if ('error' in authResult) {
                    return jsonError(authResult.error.message, authResult.error.status, { success: false });
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
                    return jsonError('获取历史记录失败', 500, { success: false });
                }

                return jsonOk({
                    success: true,
                    data: { history }
                });
            }

            case 'update': {
                if (!divinationId) {
                    return jsonError('缺少记录 ID', 400, { success: false });
                }
                const parsedTargets = parseYongShenTargets(yongShenTargets, { required: true });
                if (parsedTargets.error) {
                    return jsonError(parsedTargets.error, 400, { success: false });
                }

                const authResult = await requireBearerUser(request);
                if ('error' in authResult) {
                    return jsonError(authResult.error.message, authResult.error.status, { success: false });
                }
                const { user } = authResult;

                const serviceClient = getServiceRoleClient();
                const { data: updatedRows, error: updateError } = await serviceClient
                    .from('liuyao_divinations')
                    .update({ yongshen_targets: parsedTargets.targets })
                    .eq('id', divinationId)
                    .eq('user_id', user.id)
                    .select('id');

                if (updateError) {
                    console.error('[liuyao] 更新分析目标失败:', updateError.message);
                    return jsonError('更新分析目标失败', 500, { success: false });
                }
                if (!updatedRows || updatedRows.length === 0) {
                    return jsonError('记录不存在或无权限', 404, { success: false });
                }

                return jsonOk({
                    success: true,
                    data: { divinationId, yongShenTargets: parsedTargets.targets }
                });
            }

            default:
                return jsonError('未知操作', 400, { success: false });
        }
    } catch (error) {
        console.error('[liuyao] API 错误:', error);
        return jsonError('服务器错误', 500, { success: false });
    }
}
