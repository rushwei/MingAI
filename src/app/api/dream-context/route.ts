/**
 * 解梦上下文 API
 * 
 * 提供解梦模式所需的八字命盘和今日运势上下文数据
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '@/lib/api-utils';
import { baziProvider } from '@/lib/data-sources/bazi';
import { dailyFortuneProvider } from '@/lib/data-sources/fortune';
import { countTokens } from '@/lib/token-utils';

const getSupabase = () => getServiceRoleClient();

// Token 限制
const MAX_BAZI_TOKENS = 1500;
const MAX_FORTUNE_TOKENS = 500;

/**
 * 截断文本到指定 token 数量
 */
function truncateToTokens(text: string, maxTokens: number): string {
    if (!text) return '';
    const tokens = countTokens(text);
    if (tokens <= maxTokens) return text;

    // 按比例截断
    const ratio = maxTokens / tokens;
    const targetLength = Math.floor(text.length * ratio * 0.9); // 留出 10% 余量
    return text.slice(0, targetLength) + '...（已截断）';
}

export interface DreamContextPayload {
    baziChartName?: string;
    baziText?: string;
    fortuneText?: string;
}

export interface DreamContextResponse {
    dreamContext: {
        baziChartName?: string;
        dailyFortune?: string;
    };
    payload: DreamContextPayload;
}

async function buildDreamContextPayload(userId: string): Promise<{ payload: DreamContextPayload; context: DreamContextResponse['dreamContext'] }> {
    const supabase = getSupabase();

    const { data: settings } = await supabase
        .from('user_settings')
        .select('default_bazi_chart_id')
        .eq('user_id', userId)
        .maybeSingle();
    const defaultBaziId = (settings as { default_bazi_chart_id?: string | null } | null)?.default_bazi_chart_id ?? null;

    const baziQuery = supabase
        .from('bazi_charts')
        .select('*')
        .eq('user_id', userId);
    const { data: baziChart } = defaultBaziId
        ? await baziQuery.eq('id', defaultBaziId).maybeSingle()
        : await baziQuery.order('created_at', { ascending: false }).limit(1).maybeSingle();

    const fortune = await dailyFortuneProvider.get('today', userId, { client: supabase });

    let baziText = baziChart ? baziProvider.formatForAI(baziChart as Parameters<typeof baziProvider.formatForAI>[0]) : '';
    let fortuneText = fortune ? dailyFortuneProvider.formatForAI(fortune) : '';

    // Token 截断
    baziText = truncateToTokens(baziText, MAX_BAZI_TOKENS);
    fortuneText = truncateToTokens(fortuneText, MAX_FORTUNE_TOKENS);

    const payload: DreamContextPayload = {
        baziChartName: baziChart?.name,
        baziText: baziText || undefined,
        fortuneText: fortuneText || undefined
    };
    const context = {
        baziChartName: baziChart?.name,
        dailyFortune: fortuneText ? '已参考' : undefined
    };

    return { payload, context };
}

export async function GET(request: NextRequest) {
    const authClient = getSupabase();
    let userId: string | null = null;
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await authClient.auth.getUser(token);
        userId = user?.id || null;
    }

    if (!userId) {
        const accessToken = request.cookies.get('sb-access-token')?.value;
        if (accessToken) {
            const { data: { user } } = await authClient.auth.getUser(accessToken);
            userId = user?.id || null;
        }
    }

    if (!userId) {
        return NextResponse.json(
            { error: '请先登录后再使用 AI 对话' },
            { status: 401 }
        );
    }

    const { payload, context } = await buildDreamContextPayload(userId);
    return NextResponse.json({ dreamContext: context, payload });
}
