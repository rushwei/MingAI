/**
 * 六爻占卜 API 路由
 *
 * 提供 AI 解卦功能，包含传统六爻分析
 */
import { NextRequest } from 'next/server';
import { getServiceRoleClient, jsonError, jsonOk, requireBearerUser } from '@/lib/api-utils';
import { useCredit, hasCredits, addCredits } from '@/lib/user/credits';
import { callAIWithReasoning, callAIStream, readAIStream } from '@/lib/ai/ai';
import { DEFAULT_MODEL_ID } from '@/lib/ai/ai-config';
import { getEffectiveMembershipType } from '@/lib/user/membership-server';
import { resolveModelAccessAsync } from '@/lib/ai/ai-access';
import {
    type Hexagram,
    type Yao,
    type LiuQin,
    performFullAnalysis,
    yaosTpCode,
} from '@/lib/divination/liuyao';
import { getShiYingPosition, findPalace } from '@/lib/divination/eight-palaces';
import { getHexagramText } from '@/lib/divination/hexagram-texts';
import {
    YONG_SHEN_STATUS_LABELS,
    YAO_POSITION_NAMES,
    traditionalYaoName,
    buildYongShenMarkers,
    formatGuaLevelLines,
    formatKongWangLines,
    formatGanZhiTime,
    sortYaosDescending,
    formatYaoDetailLine,
    buildShenSystemMap,
    formatShenSystemParts,
} from '@/lib/divination/liuyao-format-utils';

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

function computeChangedCode(yaos: Yao[] | undefined, changedLines: number[] | undefined, hasChanged: boolean): string | undefined {
    if (!hasChanged || !yaos) return undefined;
    return yaos.map((y, i) =>
        changedLines?.includes(i + 1) ? (y.type === 1 ? 0 : 1) : y.type
    ).join('');
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

function parseQuestionInput(value: unknown): { question: string; error?: string } {
    if (value == null) {
        return { question: '' };
    }
    if (typeof value !== 'string') {
        return { question: '', error: '问题格式错误' };
    }
    return { question: value };
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
                const parsedQuestion = parseQuestionInput(question);
                if (parsedQuestion.error) {
                    return jsonError(parsedQuestion.error, 400, { success: false });
                }
                const normalizedQuestion = parsedQuestion.question;
                const needsTargets = Boolean(normalizedQuestion.trim());
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
                const changedCode = computeChangedCode(yaos, changedLines, Boolean(changedHexagram));

                const serviceClient = getServiceRoleClient();
                const { data: insertedDivination, error: insertError } = await serviceClient
                    .from('liuyao_divinations')
                    .insert({
                        user_id: saveUser.id,
                        question: normalizedQuestion,
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
                const confirmedHexagram = hexagram;
                const parsedQuestion = parseQuestionInput(question);
                if (parsedQuestion.error) {
                    return jsonError(parsedQuestion.error, 400, { success: false });
                }

                // 验证用户身份
                const authResult = await requireBearerUser(request);
                if ('error' in authResult) {
                    return jsonError(authResult.error.message, authResult.error.status, { success: false });
                }
                const { user } = authResult;

                const serviceClient = getServiceRoleClient();
                let analysisDate = new Date();
                let effectiveQuestion = parsedQuestion.question;
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

                if (!effectiveQuestion.trim()) {
                    return jsonError('请先明确问题后再解卦', 400, { success: false });
                }

                const parsedTargets = parseYongShenTargets(
                    yongShenTargets ?? persistedTargets,
                    { required: true }
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

                // 预计算卦码（持久化和分析共用）
                const hexagramCode = yaos ? yaosTpCode(yaos) : '';
                const changedCode = computeChangedCode(yaos, changedLines, Boolean(changedHexagram));

                // 计算传统分析数据（使用完整分析函数）
                let traditionalInfo = '';
                if (yaos && yaos.length === 6) {

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
                        liuHeGuaInfo,
                        chongHeTransition,
                        guaFanFuYin,
                        sanHeAnalysis,
                        warnings,
                    } = analysis;
                    const palace = findPalace(hexagramCode);
                    const shiYing = getShiYingPosition(hexagramCode);
                    const changedPalace = changedCode ? findPalace(changedCode) : undefined;
                    const hexText = getHexagramText(hexagram.name);
                    const changedHexText = changedHexagram ? getHexagramText(changedHexagram.name) : undefined;
                    const yongShenMarkers = buildYongShenMarkers(yongShen);

                    // 构建各爻详细信息（上爻→初爻）
                    const yaoByPosition = new Map(fullYaos.map(y => [y.position, y] as const));
                    const sortedYaos = sortYaosDescending(fullYaos);
                    const yaoDetails = sortedYaos.map((y) =>
                        formatYaoDetailLine(y, { yongShenMarkers })
                    ).join('\n');

                    const shenSystemMap = buildShenSystemMap(shenSystemByYongShen);
                    const yongShenInfo = yongShen.map((group) => {
                        const main = group.selected;
                        const statusLabel = YONG_SHEN_STATUS_LABELS[group.selectionStatus] || group.selectionStatus;
                        const candidates = group.candidates.length > 0
                            ? `\n候选：${group.candidates.map(c => `${c.liuQin}${c.position ? `@${traditionalYaoName(c.position, yaoByPosition.get(c.position)?.type ?? 1)}` : ''}${c.naJia ? `（${c.naJia}）` : ''}${c.evidence.length > 0 ? `：${c.evidence.join('、')}` : ''}`).join('、')}`
                            : '';
                        const system = shenSystemMap.get(group.targetLiuQin);
                        const systemParts = formatShenSystemParts(system);
                        const systemText = systemParts.length > 0 ? `\n神系：${systemParts.join('；')}` : '';
                        const recs = timeRecommendations.filter(rec => rec.targetLiuQin === group.targetLiuQin);
                        const recText = recs.length > 0
                            ? `\n应期线索：${recs.map(rec => `${rec.trigger}：${rec.description}`).join('；')}`
                            : '';
                        const selectionText = group.selectionNote ? `\n取用说明：${group.selectionNote}` : '';
                        const mainEvidence = main.evidence.length > 0 ? `\n依据：${main.evidence.join('、')}` : '';
                        return `- 目标${group.targetLiuQin}（${statusLabel}）\n  主用神：${main.liuQin}${main.naJia ? `（${main.naJia}）` : ''}${main.position ? ` @${traditionalYaoName(main.position, yaoByPosition.get(main.position)?.type ?? 1)}` : ''} ${main.element} ${main.strengthLabel} ${main.movementLabel}${mainEvidence}${candidates}${selectionText}${systemText}${recText}`;
                    }).join('\n');

                    let fuShenInfo = '';
                    if (fuShen && fuShen.length > 0) {
                        const fuShenLines = fuShen.map(fs => {
                            const posName = YAO_POSITION_NAMES[fs.feiShenPosition - 1];
                            return `- ${fs.liuQin}伏于${posName}${fs.feiShenLiuQin ? `（${fs.feiShenLiuQin}）` : ''}下，纳甲${fs.naJia}${fs.wuXing}，${fs.availabilityReason}`;
                        });
                        fuShenInfo = `\n伏神分析：\n${fuShenLines.join('\n')}`;
                    }

                    // 构建变卦信息
                    const changedLines = fullYaos.filter(y => y.isChanging).map(y => y.position);
                    let changedHexagramInfo: string;
                    if (changedHexagram && changedLines.length > 0) {
                        const changedPalaceName = changedPalace?.name || '未知';
                        const changedEl = changedHexagram.element || '';
                        const changedLineNames = changedLines.map(l => {
                            const yao = yaoByPosition.get(l);
                            return yao ? traditionalYaoName(l, yao.type) : YAO_POSITION_NAMES[l - 1];
                        }).join('、');
                        const parts = [
                            `变卦：${changedHexagram.name}（${changedPalaceName}宫·${changedEl}）`,
                            `变爻：${changedLineNames}`,
                        ];
                        if (changedHexText) {
                            parts.push(`变卦卦辞：${changedHexText.gua}`);
                            parts.push(`变卦象辞：${changedHexText.xiang}`);
                        }
                        // 动爻爻辞
                        if (hexText?.yao) {
                            for (const pos of changedLines) {
                                const yaoCi = hexText.yao[pos - 1];
                                if (yaoCi) {
                                    const yao = yaoByPosition.get(pos);
                                    parts.push(`${traditionalYaoName(pos, yao?.type ?? 1)}爻辞：${yaoCi.text}`);
                                }
                            }
                        }
                        changedHexagramInfo = parts.join('\n');
                    } else {
                        changedHexagramInfo = '无变爻';
                    }

                    // 卦级分析
                    const guaLevelParts = formatGuaLevelLines({
                        liuChongGuaInfo, liuHeGuaInfo, chongHeTransition, guaFanFuYin, sanHeAnalysis, globalShenSha,
                    });

                    // 四柱旬空
                    const kongWangLines = formatKongWangLines(kongWangByPillar, kongWang);

                    traditionalInfo = [
                        '【卦象信息】',
                        `本卦：${hexagram.name}（${palace?.name || '未知'}宫·${hexagram.element}）`,
                        `上卦：${hexagram.upperTrigram}（${hexagram.nature}）`,
                        `下卦：${hexagram.lowerTrigram}`,
                        hexText ? `卦辞：${hexText.gua}` : '',
                        hexText ? `象辞：${hexText.xiang}` : '',
                        changedHexagramInfo,
                        '',
                        '【起卦时间】',
                        formatGanZhiTime(ganZhiTime),
                        ...kongWangLines,
                        `世爻：第${shiYing.shi}爻 | 应爻：第${shiYing.ying}爻`,
                        '',
                        guaLevelParts.length > 0 ? `【卦级分析】\n${guaLevelParts.join('\n')}` : '',
                        '',
                        '【六爻排盘】',
                        yaoDetails,
                        '',
                        '【用神分析】',
                        yongShenInfo,
                        fuShenInfo,
                        '',
                        warnings && warnings.length > 0 ? `【风险提示】\n${warnings.join('；')}` : '',
                        timeRecommendations.length > 0
                            ? `【应期参考】\n${timeRecommendations.map(r => `${r.type === 'favorable' ? '利' : r.type === 'unfavorable' ? '忌' : '要'}（${r.targetLiuQin} ${r.trigger}）：${r.description}`).join('\n')}`
                            : '',
                    ].filter(Boolean).join('\n');
                }

                // 六爻解读系统提示词：固定的断卦规则 + 输出结构约束
                const systemPrompt = `你是一位精通《周易》的资深易学大师，深谙野鹤老人《增删卜易》、王洪绪《卜筮正宗》之精髓。

核心断卦原则：
- 月建为纲，日辰为领：月建主宰爻的旺衰，日辰可生克冲合
- 旺相休囚死：爻在月令的五种状态决定其根本力量
- 暗动与日破：静爻旺相逢日冲为暗动（有力），静爻休囚逢日冲为日破（无力）
- 空亡论断：静空、动空、冲空、临建都要结合月日与动变，不能单凭一条征象直接定吉凶
- 用神为核心：先定用神，再看旺衰、生克、动静、空实与世应
- 取用顺序：本卦明现优先；本卦无用神而变爻化出者，先取变爻；本卦与变爻俱无，再看月建日辰是否可代用；仍无稳定落点时才转伏神
- 原神忌神仇神：原神生用神为吉，忌神克用神为凶，仇神克原神助忌神
- 三合局论断：三合、半合都必须结合成局条件，不能见合即断成局
- 六冲卦论断：六冲多主变动、分散之象，但不能脱离用神独断
- 伏神论断：伏神只是线索，不等于已经明现；若 selectionStatus=ambiguous，必须说明并看而不是伪造唯一答案

解读格式：
1. 【卦象概述】本卦象征和基本含义
2. 【用神分析】用神旺衰、空亡、月日生克情况
3. 【神系作用】原神、忌神、仇神对用神的影响
4. 【动变分析】动爻的化进化退、回头生克等（若有动爻）
5. 【伏神论断】伏神可用性分析（若用神不上卦）
6. 【世应关系】世爻与应爻的关系分析
7. 【综合判断】明确吉凶判断和应期建议

                要求：专业而通俗易懂，让求卦者理解断卦依据。字数800-1200字。`;

                const userPrompt = `【求卦问题】${effectiveQuestion}

${traditionalInfo}

请根据以上卦象信息，为求卦者详细解读此卦。`;

                const remainingCredits = await useCredit(user.id);
                if (remainingCredits === null) {
                    console.error('[liuyao] 扣除积分失败');
                    return jsonError('积分扣减失败，请稍后重试', 500, { success: false });
                }

                // 持久化函数（流式/非流式共用）
                async function persistLiuyaoResult(interpretation: string, reasoningText: string | null) {
                    const { createAIAnalysisConversation, generateLiuyaoTitle } = await import('@/lib/ai/ai-analysis');
                    const conversationId = await createAIAnalysisConversation({
                        userId: user.id,
                        sourceType: 'liuyao',
                        sourceData: {
                            hexagram_code: hexagramCode,
                            hexagram_name: confirmedHexagram.name,
                            changed_hexagram_code: changedCode || null,
                            changed_hexagram_name: changedHexagram?.name,
                            changed_lines: changedLines,
                            question: effectiveQuestion || null,
                            yongshen_targets: parsedTargets.targets,
                            model_id: requestedModelId,
                            reasoning: reasoningEnabled,
                            reasoning_text: reasoningText || null,
                        },
                        title: generateLiuyaoTitle(effectiveQuestion, confirmedHexagram.name, changedHexagram?.name),
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
                                changed_hexagram_code: changedCode || null,
                                changed_lines: changedLines,
                                conversation_id: conversationId,
                            });
                        if (insertError) {
                            console.error('[liuyao] 保存起卦记录失败:', insertError.message);
                        }
                    }
                    return conversationId;
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
                                await persistLiuyaoResult(interpretation, reasoningText ?? null);
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

                    // 保存 AI 分析
                    const conversationId = await persistLiuyaoResult(interpretation, reasoningText ?? null);

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
