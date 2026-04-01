/**
 * AI八字分析API
 *
 * 支持五行分析和人格分析
 * 支持流式输出 + 结果保存
 */

import { NextRequest } from 'next/server';
import { callAIWithReasoning, callAIUIMessageResult } from '@/lib/ai/ai';
import { DEFAULT_MODEL_ID } from '@/lib/ai/ai-config';
import { resolveModelAccessAsync } from '@/lib/ai/ai-access';
import { getSystemAdminClient, jsonError, jsonOk, requireUserContext } from '@/lib/api-utils';
import { getUserAuthInfo, useCredit, addCredits } from '@/lib/user/credits';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';
import { createAIAnalysisConversation } from '@/lib/ai/ai-analysis';
import { formatBaziPromptText } from '@/lib/bazi-prompt';
import { loadResolvedChartPromptDetailLevel } from '@/lib/ai/chart-prompt-detail';
import { getBaziCaseProfileByChartId } from '@/lib/server/bazi-case-profile';
import { USER_SETTINGS_SELECT, normalizeUserSettings } from '@/lib/user/settings';
import {
    buildVisualizationOutputContractPrompt,
    buildVisualizationPreferencePrompts,
} from '@/lib/visualization/prompt';
import { SOURCE_CHART_TYPE_MAP } from '@/lib/visualization/chart-types';
import { createPersistentStreamResponse } from '@/lib/api/divination-pipeline';

const RATE_LIMIT_CONFIG = {
    maxRequests: 10,
    windowMs: 60 * 1000,
};

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
        const { chartId, type, modelId, reasoning, stream } = await request.json();

        if (!chartId || typeof chartId !== 'string') return jsonError('缺少命盘ID', 400);
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(chartId)) return jsonError('命盘ID格式无效', 400);
        if (!type || !['wuxing', 'personality'].includes(type)) return jsonError('分析类型无效', 400);

        const auth = await requireUserContext(request);
        if ('error' in auth) return jsonError(auth.error.message, auth.error.status);
        const { user } = auth;
        userId = user.id;

        const clientIP = getClientIP(request);
        const rateLimit = await checkRateLimit(clientIP, '/api/bazi/analysis', RATE_LIMIT_CONFIG);
        if (!rateLimit.allowed) return jsonError('请求过于频繁，请稍后再试', 429);

        const supabase = getSystemAdminClient();
        const { data: chart, error: chartError } = await supabase
            .from('bazi_charts')
            .select('id, name, user_id, gender, birth_date, birth_time, birth_place, calendar_type, is_leap_month, chart_data')
            .eq('id', chartId)
            .eq('user_id', user.id)
            .single();
        if (chartError || !chart?.user_id) return jsonError('未找到命盘信息', 404);
        const resolvedChart = chart as {
            id: string;
            name: string | null;
            user_id: string;
            gender: 'male' | 'female' | null;
            birth_date: string;
            birth_time: string | null;
            birth_place: string | null;
            calendar_type: string | null;
            is_leap_month: boolean | null;
            chart_data: Record<string, unknown> | null;
        };

        const caseProfile = await getBaziCaseProfileByChartId(supabase, chartId, user.id);
        const promptDetailLevel = await loadResolvedChartPromptDetailLevel(user.id, 'bazi');
        const chartSummary = formatBaziPromptText({
            id: resolvedChart.id,
            name: resolvedChart.name || '命盘',
            gender: resolvedChart.gender || 'male',
            birthDate: resolvedChart.birth_date,
            birthTime: resolvedChart.birth_time || undefined,
            birthPlace: resolvedChart.birth_place || undefined,
            calendarType: (resolvedChart.calendar_type as 'solar' | 'lunar' | undefined) || 'solar',
            isLeapMonth: resolvedChart.is_leap_month || false,
            chartData: resolvedChart.chart_data || undefined,
        }, caseProfile, promptDetailLevel);
        const { data: userSettingsRow } = await supabase
            .from('user_settings')
            .select(USER_SETTINGS_SELECT)
            .eq('user_id', user.id)
            .maybeSingle();
        const userSettings = normalizeUserSettings((userSettingsRow ?? null) as Record<string, unknown> | null);
        const visualizationPrompts = buildVisualizationPreferencePrompts(userSettings.visualizationSettings);
        const allowedChartTypes = type === 'wuxing'
            ? [...SOURCE_CHART_TYPE_MAP.bazi_chart, 'fortune_calendar'] as const
            : ['personality_petal', 'life_timeline', 'fortune_radar', 'fortune_calendar'] as const;
        const systemPrompt = [
            type === 'wuxing' ? WUXING_PROMPT : PERSONALITY_PROMPT,
            visualizationPrompts.dimensionsPrompt,
            visualizationPrompts.dayunPrompt,
            visualizationPrompts.chartStylePrompt,
            buildVisualizationOutputContractPrompt([...allowedChartTypes]),
        ].filter(Boolean).join('\n\n');
        const userPrompt = `请分析以下八字：\n\n${chartSummary}`;

        const authInfo = await getUserAuthInfo(user.id);
        if (!authInfo) return jsonError('获取用户信息失败', 500);
        const access = await resolveModelAccessAsync(modelId, DEFAULT_MODEL_ID, authInfo.effectiveMembership, reasoning);
        if ('error' in access) return jsonError(access.error, access.status);
        const { modelId: resolvedModelId, reasoningEnabled } = access;
        if (!authInfo.hasCredits) return jsonError('积分不足，请充值后继续使用', 403);

        const remaining = await useCredit(user.id);
        if (remaining === null) return jsonError('积分扣减失败，请重试', 500);
        creditDeducted = true;

        const sourceType = type === 'wuxing' ? 'bazi_wuxing' : 'bazi_personality';
        const { generateBaziAnalysisTitle } = await import('@/lib/ai/ai-analysis');
        const title = generateBaziAnalysisTitle(resolvedChart.name || '命盘', type);

        async function persist(content: string, reasoningText: string | null) {
            return createAIAnalysisConversation({
                userId: resolvedChart.user_id,
                sourceType,
                sourceData: {
                    chart_id: chartId,
                    chart_name: resolvedChart.name,
                    chart_summary: chartSummary,
                    case_profile_id: caseProfile?.id || null,
                    case_profile_updated_at: caseProfile?.updatedAt || null,
                    case_prompt_snapshot: chartSummary,
                    model_id: resolvedModelId,
                    reasoning: reasoningEnabled,
                    reasoning_text: reasoningText || null,
                },
                title,
                aiResponse: content,
            });
        }

        if (stream) {
            const streamResult = await callAIUIMessageResult(
                [{ role: 'user', content: userPrompt }], 'bazi',
                `\n\n${systemPrompt}\n\n`, resolvedModelId,
                { reasoning: reasoningEnabled, temperature: 0.7 },
            );
            return createPersistentStreamResponse({
                streamResult,
                onStreamComplete: async ({ content, reasoning }) => {
                    try {
                        if (!content?.trim()) {
                            if (userId) await addCredits(userId, 1);
                            return { error: 'AI 分析结果为空，请稍后重试' };
                        }
                        await persist(content, reasoning);
                        return {};
                    } catch (e) {
                        console.error('[bazi/analysis] 保存流式结果失败:', e);
                        return { error: '保存结果失败，请稍后重试' };
                    }
                },
            });
        }

        const { content, reasoning: reasoningText } = await callAIWithReasoning(
            [{ role: 'user', content: userPrompt }], 'bazi', resolvedModelId,
            `\n\n${systemPrompt}\n\n`, { reasoning: reasoningEnabled, temperature: 0.7 },
        );
        if (!content) {
            if (creditDeducted && userId) { await addCredits(userId, 1); creditDeducted = false; }
            return jsonError('分析结果为空', 500);
        }

        const conversationId = await persist(content, reasoningText ?? null);
        return jsonOk({ success: true, content, reasoning: reasoningText, conversationId });
    } catch (error) {
        if (creditDeducted && userId) await addCredits(userId, 1);
        console.error('Analysis API error:', error);
        return jsonError('服务器错误', 500);
    }
}
