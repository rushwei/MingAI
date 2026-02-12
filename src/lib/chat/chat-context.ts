import { getServiceRoleClient } from '@/lib/api-utils';
import { countTokens } from '@/lib/token-utils';
import { baziProvider } from '@/lib/data-sources/bazi';
import { dailyFortuneProvider } from '@/lib/data-sources/fortune';

export interface ChartIds {
    baziId?: string;
    ziweiId?: string;
    baziAnalysisMode?: 'traditional' | 'mangpai';
}

export interface ChartContext {
    baziChart?: {
        id?: string;
        name: string;
        gender: string;
        birthDate: string;
        birthTime?: string;
        chartData?: Record<string, unknown>;
    };
    ziweiChart?: {
        id?: string;
        name: string;
        gender: string;
        birthDate: string;
        birthTime?: string;
        chartData?: Record<string, unknown>;
    };
}

export type DreamContextPayload = {
    baziChartName?: string;
    baziText?: string;
    fortuneText?: string;
};

const MAX_BAZI_TOKENS = 1500;
const MAX_FORTUNE_TOKENS = 500;

function truncateToTokens(text: string, maxTokens: number): string {
    if (!text) return '';
    const tokens = countTokens(text);
    if (tokens <= maxTokens) return text;

    const ratio = maxTokens / tokens;
    const targetLength = Math.floor(text.length * ratio * 0.9);
    return text.slice(0, targetLength) + '...（已截断）';
}

// 加载命盘上下文（仅加载属于当前用户的命盘）
export async function loadChartContext(chartIds: ChartIds, userId: string): Promise<ChartContext> {
    const supabase = getServiceRoleClient();
    const context: ChartContext = {};

    if (chartIds.baziId) {
        const { data } = await supabase
            .from('bazi_charts')
            .select('id, name, gender, birth_date, birth_time, chart_data')
            .eq('id', chartIds.baziId)
            .eq('user_id', userId)
            .single();

        if (data) {
            const genderLabel = data.gender === 'male' ? '男' : data.gender === 'female' ? '女' : '';
            context.baziChart = {
                id: data.id,
                name: data.name,
                gender: genderLabel,
                birthDate: data.birth_date,
                birthTime: data.birth_time,
                chartData: data.chart_data,
            };
        }
    }

    if (chartIds.ziweiId) {
        const { data } = await supabase
            .from('ziwei_charts')
            .select('id, name, gender, birth_date, birth_time, chart_data')
            .eq('id', chartIds.ziweiId)
            .eq('user_id', userId)
            .single();

        if (data) {
            const genderLabel = data.gender === 'male' ? '男' : data.gender === 'female' ? '女' : '';
            context.ziweiChart = {
                id: data.id,
                name: data.name,
                gender: genderLabel,
                birthDate: data.birth_date,
                birthTime: data.birth_time,
                chartData: data.chart_data,
            };
        }
    }

    return context;
}

export async function buildDreamContextPayload(userId: string): Promise<{ payload: DreamContextPayload; context: { baziChartName?: string; dailyFortune?: string } }> {
    const supabase = getServiceRoleClient();

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
