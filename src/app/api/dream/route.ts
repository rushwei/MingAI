import { NextRequest } from 'next/server';
import { getAuthContext, jsonError, jsonOk, getServiceRoleClient } from '@/lib/api-utils';
import { hasCredits, useCredit, addCredits } from '@/lib/credits';
import { getEffectiveMembershipType } from '@/lib/membership-server';
import { DEFAULT_MODEL_ID } from '@/lib/ai-config';
import { resolveModelAccess } from '@/lib/ai-access';
import { callAI } from '@/lib/ai';
import { baziProvider } from '@/lib/data-sources/bazi';
import { dailyFortuneProvider } from '@/lib/data-sources/fortune';

type DreamRequestBody = {
    dream?: string;
    question?: string;
    modelId?: string;
    reasoning?: boolean;
};

async function getDefaultBaziChart(userId: string) {
    const service = getServiceRoleClient();
    const { data: settings } = await service
        .from('user_settings')
        .select('default_bazi_chart_id')
        .eq('user_id', userId)
        .maybeSingle();
    const defaultId = (settings as { default_bazi_chart_id?: string | null } | null)?.default_bazi_chart_id ?? null;

    const baseQuery = service
        .from('bazi_charts')
        .select('*')
        .eq('user_id', userId);

    const { data } = defaultId
        ? await baseQuery.eq('id', defaultId).maybeSingle()
        : await baseQuery.order('created_at', { ascending: false }).limit(1).maybeSingle();

    return data ?? null;
}

export async function POST(request: NextRequest) {
    const { user } = await getAuthContext(request);
    if (!user) return jsonError('请先登录', 401);

    let body: DreamRequestBody;
    try {
        body = (await request.json()) as DreamRequestBody;
    } catch {
        return jsonError('请求体不是有效的 JSON', 400);
    }

    const dream = typeof body.dream === 'string' ? body.dream.trim() : '';
    if (!dream) return jsonError('梦境内容不能为空', 400);

    const question = typeof body.question === 'string' ? body.question.trim() : '';
    const membershipType = await getEffectiveMembershipType(user.id);
    const access = resolveModelAccess(body.modelId, DEFAULT_MODEL_ID, membershipType, body.reasoning, {
        invalidModelMessage: '无效的模型',
    });
    if ('error' in access) {
        return jsonError(access.error, access.status);
    }
    const { modelId: requestedModelId, reasoningEnabled } = access;

    const hasEnough = await hasCredits(user.id);
    if (!hasEnough) {
        return jsonError('积分不足，请充值后继续使用', 402);
    }

    const service = getServiceRoleClient();
    const baziChart = await getDefaultBaziChart(user.id);
    const baziText = baziChart ? baziProvider.formatForAI(baziChart as Parameters<typeof baziProvider.formatForAI>[0]) : '';

    const fortune = await dailyFortuneProvider.get('today', user.id, { client: service });
    const fortuneText = fortune ? dailyFortuneProvider.formatForAI(fortune) : '';

    // 解梦系统提示词：组合梦境规则 + 命盘 + 今日运势（若存在）
    const systemPrompt = [
        '你是一位精通周公解梦与命理的分析师，需结合梦境内容、命盘信息与今日运势给出解读。',
        '解读应包括：象征含义、现实关联、情绪与潜意识、可执行建议。',
        baziText ? `以下为用户命盘信息：\n${baziText}` : '',
        fortuneText ? `以下为今日运势信息：\n${fortuneText}` : ''
    ].filter(Boolean).join('\n\n');

    // 用户提示词：仅包含梦境与问题
    const userMessage = [
        `梦境内容：${dream}`,
        question ? `用户问题：${question}` : ''
    ].filter(Boolean).join('\n');

    const remaining = await useCredit(user.id);
    if (remaining === null) {
        return jsonError('积分扣减失败，请重试', 500);
    }

    try {
        // 用系统提示词 override 默认人格，保持解梦结构一致
        const content = await callAI(
            [{ role: 'user', content: userMessage }],
            'master',
            requestedModelId,
            '',
            { reasoning: reasoningEnabled, systemPromptOverride: systemPrompt }
        );
        return jsonOk({ content, modelId: requestedModelId, remaining });
    } catch {
        await addCredits(user.id, 1);
        return jsonError('服务暂时不可用', 500);
    }
}
