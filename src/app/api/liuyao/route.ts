/**
 * 六爻占卜 API 路由
 *
 * 提供 AI 解卦功能，包含传统六爻分析
 */
import { NextRequest } from 'next/server';
import { getSystemAdminClient, jsonError, jsonOk, requireBearerUser } from '@/lib/api-utils';
import { useCredit, getUserAuthInfo, addCredits } from '@/lib/user/credits';
import { callAIWithReasoning, callAIUIMessageResult } from '@/lib/ai/ai';
import { DEFAULT_MODEL_ID } from '@/lib/ai/ai-config';
import { resolveModelAccessAsync } from '@/lib/ai/ai-access';
import {
    type Hexagram,
    type Yao,
    type LiuQin,
    yaosTpCode,
} from '@/lib/divination/liuyao';
import { createAIAnalysisConversation } from '@/lib/ai/ai-analysis';
import { buildTraditionalInfo } from '@/lib/divination/liuyao-format-utils';
import { loadResolvedChartPromptDetailLevel } from '@/lib/ai/chart-prompt-detail';
import { buildVisualizationOutputContractPrompt } from '@/lib/visualization/prompt';
import { SOURCE_CHART_TYPE_MAP } from '@/lib/visualization/chart-types';
import { createPersistentStreamResponse } from '@/lib/api/divination-pipeline';

interface LiuyaoRequest {
    action: 'interpret' | 'save' | 'history' | 'update';
    question?: string;
    yongShenTargets?: LiuQin[];
    hexagram?: Hexagram;
    changedHexagram?: Hexagram;
    changedLines?: number[];
    yaos?: Yao[];
    dayStem?: string;
    divinationId?: string;
    modelId?: string;
    reasoning?: boolean;
    stream?: boolean;
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
        return options.required ? { targets: [], error: '请至少选择一个分析目标' } : { targets: [] };
    }
    if (!Array.isArray(value)) return { targets: [], error: '分析目标格式错误' };
    if (value.length === 0) {
        return options.required ? { targets: [], error: '请至少选择一个分析目标' } : { targets: [] };
    }
    const unique = new Set<LiuQin>();
    for (const item of value) {
        if (typeof item !== 'string' || !LIU_QIN_VALUES.includes(item as LiuQin)) {
            return { targets: [], error: '分析目标包含非法值' };
        }
        unique.add(item as LiuQin);
    }
    if (unique.size === 0 && options.required) return { targets: [], error: '请至少选择一个分析目标' };
    return { targets: Array.from(unique) };
}

function toPersistedYongShenTargets(targets: LiuQin[]): LiuQin[] | null {
    return targets.length > 0 ? targets : null;
}

function parseQuestionInput(value: unknown): { question: string; error?: string } {
    if (value == null) return { question: '' };
    if (typeof value !== 'string') return { question: '', error: '问题格式错误' };
    return { question: value };
}

let _liuyaoVizContract: string | null = null;
function getLiuyaoVizContract(): string {
    if (!_liuyaoVizContract) {
        _liuyaoVizContract = buildVisualizationOutputContractPrompt([...SOURCE_CHART_TYPE_MAP.liuyao_divination]);
    }
    return _liuyaoVizContract;
}

export async function POST(request: NextRequest) {
    try {
        const body: LiuyaoRequest = await request.json();
        const { action, question, yongShenTargets, changedHexagram, changedLines, yaos, divinationId } = body;

        switch (action) {
            case 'save': {
                const parsedQuestion = parseQuestionInput(question);
                if (parsedQuestion.error) return jsonError(parsedQuestion.error, 400, { success: false });
                const needsTargets = Boolean(parsedQuestion.question.trim());
                const parsedTargets = parseYongShenTargets(yongShenTargets, { required: needsTargets });
                if (parsedTargets.error) return jsonError(parsedTargets.error, 400, { success: false });

                const authResult = await requireBearerUser(request);
                if ('error' in authResult) return jsonError(authResult.error.message, authResult.error.status, { success: false });

                const hexagramCode = yaos?.map(y => y.type).join('') || '';
                const changedCode = computeChangedCode(yaos, changedLines, Boolean(changedHexagram));
                const serviceClient = getSystemAdminClient();
                const { data, error } = await serviceClient
                    .from('liuyao_divinations')
                    .insert({
                        user_id: authResult.user.id, question: parsedQuestion.question,
                        yongshen_targets: parsedTargets.targets.length > 0 ? parsedTargets.targets : null,
                        hexagram_code: hexagramCode, changed_hexagram_code: changedCode, changed_lines: changedLines,
                    })
                    .select('id').single();
                if (error) return jsonError('保存记录失败', 500, { success: false });
                return jsonOk({ success: true, data: { divinationId: data?.id } });
            }

            case 'interpret':
                return handleInterpret(request, body);

            case 'history': {
                const authResult = await requireBearerUser(request);
                if ('error' in authResult) return jsonError(authResult.error.message, authResult.error.status, { success: false });
                const serviceClient = getSystemAdminClient();
                const { data: history, error } = await serviceClient
                    .from('liuyao_divinations').select('*')
                    .eq('user_id', authResult.user.id)
                    .order('created_at', { ascending: false }).limit(20);
                if (error) return jsonError('获取历史记录失败', 500, { success: false });
                return jsonOk({ success: true, data: { history } });
            }

            case 'update': {
                if (!divinationId) return jsonError('缺少记录 ID', 400, { success: false });
                const parsedTargets = parseYongShenTargets(yongShenTargets, { required: true });
                if (parsedTargets.error) return jsonError(parsedTargets.error, 400, { success: false });
                const authResult = await requireBearerUser(request);
                if ('error' in authResult) return jsonError(authResult.error.message, authResult.error.status, { success: false });
                const serviceClient = getSystemAdminClient();
                const { data, error } = await serviceClient
                    .from('liuyao_divinations')
                    .update({ yongshen_targets: parsedTargets.targets })
                    .eq('id', divinationId).eq('user_id', authResult.user.id).select('id');
                if (error) return jsonError('更新分析目标失败', 500, { success: false });
                if (!data || data.length === 0) return jsonError('记录不存在或无权限', 404, { success: false });
                return jsonOk({ success: true, data: { divinationId, yongShenTargets: parsedTargets.targets } });
            }

            default:
                return jsonError('未知操作', 400, { success: false });
        }
    } catch (error) {
        console.error('[liuyao] API 错误:', error);
        return jsonError('服务器错误', 500, { success: false });
    }
}

async function handleInterpret(request: NextRequest, body: LiuyaoRequest): Promise<Response> {
    const { hexagram, changedHexagram, changedLines, yaos, divinationId, modelId, reasoning, stream } = body;
    if (!hexagram) return jsonError('请提供卦象', 400, { success: false });
    const resolvedHexagram = hexagram;

    const parsedQuestion = parseQuestionInput(body.question);
    if (parsedQuestion.error) return jsonError(parsedQuestion.error, 400, { success: false });

    const authResult = await requireBearerUser(request);
    if ('error' in authResult) return jsonError(authResult.error.message, authResult.error.status, { success: false });
    const { user } = authResult;

    const serviceClient = getSystemAdminClient();
    let analysisDate = new Date();
    let effectiveQuestion = parsedQuestion.question;
    let persistedTargets: unknown = undefined;

    if (divinationId) {
        const { data } = await serviceClient
            .from('liuyao_divinations')
            .select('created_at, question, yongshen_targets')
            .eq('id', divinationId).eq('user_id', user.id).maybeSingle();
        if (data) {
            if (data.created_at) analysisDate = new Date(data.created_at);
            if (!effectiveQuestion.trim() && typeof data.question === 'string') effectiveQuestion = data.question;
            if (body.yongShenTargets == null) persistedTargets = data.yongshen_targets;
        }
    }

    if (!effectiveQuestion.trim()) return jsonError('请先明确问题后再解卦', 400, { success: false });

    const parsedTargets = parseYongShenTargets(body.yongShenTargets ?? persistedTargets, { required: true });
    if (parsedTargets.error) return jsonError(parsedTargets.error, 400, { success: false });

    const authInfo = await getUserAuthInfo(user.id);
    if (!authInfo || !authInfo.hasCredits) return jsonError('积分不足，请充值后使用', 403, { success: false });

    const access = await resolveModelAccessAsync(modelId, DEFAULT_MODEL_ID, authInfo.effectiveMembership, reasoning);
    if ('error' in access) return jsonError(access.error, access.status, { success: false });
    const { modelId: resolvedModelId, reasoningEnabled } = access;

    const hexagramCode = yaos ? yaosTpCode(yaos) : '';
    const changedCode = computeChangedCode(yaos, changedLines, Boolean(changedHexagram));

    // Build traditional analysis
    const promptDetailLevel = await loadResolvedChartPromptDetailLevel(user.id, 'liuyao');
    const traditionalInfo = buildTraditionalInfo(yaos, hexagramCode, changedCode, effectiveQuestion, analysisDate, parsedTargets.targets, resolvedHexagram, changedHexagram, promptDetailLevel);

    const userPrompt = `${traditionalInfo}\n\n请根据以上卦象信息，为求卦者详细解读此卦。`;

    const remaining = await useCredit(user.id);
    if (remaining === null) return jsonError('积分扣减失败，请稍后重试', 500, { success: false });

    async function persist(interpretation: string, reasoningText: string | null) {
        const { generateLiuyaoTitle } = await import('@/lib/ai/ai-analysis');
        const conversationId = await createAIAnalysisConversation({
            userId: user.id, sourceType: 'liuyao',
            sourceData: {
                hexagram_code: hexagramCode, hexagram_name: resolvedHexagram.name,
                changed_hexagram_code: changedCode || null, changed_hexagram_name: changedHexagram?.name,
                changed_lines: changedLines, question: effectiveQuestion || null,
                yongshen_targets: parsedTargets.targets, model_id: resolvedModelId,
                reasoning: reasoningEnabled, reasoning_text: reasoningText || null,
            },
            title: generateLiuyaoTitle(effectiveQuestion, resolvedHexagram.name, changedHexagram?.name),
            aiResponse: interpretation,
        });
        if (divinationId) {
            await serviceClient.from('liuyao_divinations')
                .update({ conversation_id: conversationId, yongshen_targets: toPersistedYongShenTargets(parsedTargets.targets) })
                .eq('id', divinationId).eq('user_id', user.id);
        } else {
            await serviceClient.from('liuyao_divinations')
                .insert({
                    user_id: user.id, question: effectiveQuestion,
                    yongshen_targets: toPersistedYongShenTargets(parsedTargets.targets),
                    hexagram_code: hexagramCode, changed_hexagram_code: changedCode || null,
                    changed_lines: changedLines, conversation_id: conversationId,
                });
        }
        return conversationId;
    }

    try {
        if (stream) {
            const streamResult = await callAIUIMessageResult(
                [{ role: 'user', content: userPrompt }], 'liuyao',
                `\n\n${getLiuyaoVizContract()}\n\n`, resolvedModelId,
                { reasoning: reasoningEnabled, temperature: 0.7 },
            );
            return createPersistentStreamResponse({
                streamResult,
                onStreamComplete: async ({ content, reasoning }) => {
                    try {
                        if (!content?.trim()) {
                            await addCredits(user.id, 1);
                            return { error: 'AI 解读结果为空，请稍后重试' };
                        }
                        await persist(content, reasoning);
                        return {};
                    } catch (e) {
                        console.error('[liuyao] 流式结果保存失败:', e);
                        return { error: '保存结果失败，请稍后重试' };
                    }
                },
            });
        }

        const { content, reasoning: reasoningText } = await callAIWithReasoning(
            [{ role: 'user', content: userPrompt }], 'liuyao', resolvedModelId,
            `\n\n${getLiuyaoVizContract()}\n\n`, { reasoning: reasoningEnabled, temperature: 0.7 },
        );
        const conversationId = await persist(content, reasoningText ?? null);
        return jsonOk({ success: true, data: { interpretation: content, reasoning: reasoningText, conversationId } });
    } catch (aiError) {
        await addCredits(user.id, 1);
        console.error('[liuyao] AI 解读失败:', aiError);
        return jsonError('AI 解读失败，请稍后重试', 500, { success: false });
    }
}

/* PLACEHOLDER_TRADITIONAL_INFO */
