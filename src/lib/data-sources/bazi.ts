import { getSystemAdminClient } from '@/lib/api-utils';
import { generateBaziChartText } from '@/lib/divination/bazi';
import type { BaziChart } from '@/types';
import type { DataSourceProvider, DataSourceQueryContext, DataSourceSummary } from '@/lib/data-sources/types';

type BaziRow = {
    id: string;
    user_id: string | null;
    name: string;
    gender: 'male' | 'female' | null;
    birth_date: string;
    birth_time: string | null;
    birth_place: string | null;
    calendar_type: string | null;
    is_leap_month: boolean | null;
    chart_data: Record<string, unknown> | null;
    created_at: string;
};

export const baziProvider: DataSourceProvider<BaziRow> = {
    type: 'bazi_chart',
    displayName: '八字命盘',

    async list(userId: string, ctx?: DataSourceQueryContext): Promise<DataSourceSummary[]> {
        const supabase = ctx?.client ?? getSystemAdminClient();
        const limit = ctx?.limit ?? 50;
        const { data, error } = await supabase
            .from('bazi_charts')
            .select('id, name, birth_date, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw new Error(error.message);
        const rows = (data || []) as Array<{ id: string; name: string | null; birth_date: string; created_at: string }>;
        return rows.map((chart) => ({
            id: chart.id,
            type: 'bazi_chart',
            name: chart.name || '未命名命盘',
            preview: `八字命盘 - ${chart.birth_date}`,
            createdAt: chart.created_at
        }));
    },

    async get(id: string, userId: string, ctx?: DataSourceQueryContext): Promise<BaziRow | null> {
        const supabase = ctx?.client ?? getSystemAdminClient();
        const { data, error } = await supabase
            .from('bazi_charts')
            .select('*')
            .eq('id', id)
            .eq('user_id', userId)
            .maybeSingle();
        if (error) throw new Error(error.message);
        return (data as BaziRow) || null;
    },

    formatForAI(chart: BaziRow): string {
        const chartData = chart.chart_data || {};
        const name = chart.name || '未命名';
        const birthDate = chart.birth_date;
        const birthTime = chart.birth_time || '';
        const payload = chartData as Partial<BaziChart> & Record<string, unknown>;
        const gender = payload.gender ?? chart.gender;
        const normalized: Omit<BaziChart, 'id' | 'createdAt' | 'userId'> = {
            ...(payload as Omit<BaziChart, 'id' | 'createdAt' | 'userId'>),
            name: payload.name ?? name,
            gender: (gender === 'male' || gender === 'female') ? gender : (chart.gender ?? 'male'),
            birthDate: payload.birthDate ?? birthDate,
            birthTime: payload.birthTime ?? birthTime,
            birthPlace: payload.birthPlace ?? chart.birth_place ?? undefined,
            calendarType: (payload.calendarType ?? chart.calendar_type ?? 'solar') as BaziChart['calendarType'],
            isLeapMonth: payload.isLeapMonth ?? chart.is_leap_month ?? undefined,
        };

        if (normalized.fourPillars) {
            return generateBaziChartText(normalized);
        }

        return [
            `## 八字命盘：${name}`,
            `- 出生时间：${birthDate}${birthTime ? ` ${birthTime}` : ''}`,
            `- 结构化数据：${JSON.stringify(chartData)}`
        ].join('\n');
    },

    summarize(chart: BaziRow): string {
        return `${chart.name || '未命名'} - ${chart.birth_date}`;
    }
};
