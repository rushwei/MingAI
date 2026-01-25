import { getServiceRoleClient } from '@/lib/api-utils';
import type { DataSourceProvider, DataSourceQueryContext, DataSourceSummary } from './types';

type BaziRow = {
    id: string;
    user_id: string | null;
    name: string;
    birth_date: string;
    birth_time: string | null;
    chart_data: Record<string, unknown> | null;
    created_at: string;
};

export const baziProvider: DataSourceProvider<BaziRow> = {
    type: 'bazi_chart',
    displayName: '八字命盘',

    async list(userId: string, ctx?: DataSourceQueryContext): Promise<DataSourceSummary[]> {
        const supabase = ctx?.client ?? getServiceRoleClient();
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
        const supabase = ctx?.client ?? getServiceRoleClient();
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
        const birth = `${chart.birth_date}${chart.birth_time ? ` ${chart.birth_time}` : ''}`;

        const knownKeys = ['yearPillar', 'monthPillar', 'dayPillar', 'hourPillar', 'dayMaster', 'wuxingCount', 'shiShen'];
        const extracted: Record<string, unknown> = {};
        for (const k of knownKeys) {
            if (k in chartData) extracted[k] = chartData[k];
        }

        const payload = Object.keys(extracted).length ? extracted : chartData;

        return [
            `## 八字命盘：${name}`,
            `- 出生时间：${birth}`,
            `- 结构化数据：${JSON.stringify(payload)}`
        ].join('\n');
    },

    summarize(chart: BaziRow): string {
        return `${chart.name || '未命名'} - ${chart.birth_date}`;
    }
};
