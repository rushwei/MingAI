import 'server-only';

import { getSystemAdminClient } from '@/lib/api-utils';
import { truncateToTokens } from '@/lib/token-utils';
import { baziProvider } from '@/lib/data-sources/bazi';
import { dailyFortuneProvider } from '@/lib/data-sources/fortune';
import { getBaziCaseProfileByChartId } from '@/lib/server/bazi-case-profile';

export type DreamContextPayload = {
    baziChartName?: string;
    baziText?: string;
    fortuneText?: string;
};

const MAX_BAZI_TOKENS = 1500;
const MAX_FORTUNE_TOKENS = 500;

export async function buildDreamContextPayload(userId: string): Promise<{ payload: DreamContextPayload; context: { baziChartName?: string; dailyFortune?: string } }> {
    const supabase = getSystemAdminClient();

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
    const caseProfile = baziChart?.id
        ? await getBaziCaseProfileByChartId(supabase, baziChart.id, userId)
        : null;

    const fortune = await dailyFortuneProvider.get('today', userId, { client: supabase });

    let baziText = baziChart
        ? baziProvider.formatForAI({
            ...(baziChart as Parameters<typeof baziProvider.formatForAI>[0]),
            caseProfile,
        })
        : '';
    let fortuneText = fortune ? dailyFortuneProvider.formatForAI(fortune) : '';

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
