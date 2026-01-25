import { getServiceRoleClient } from '@/lib/api-utils';
import type { DataSourceProvider, DataSourceQueryContext, DataSourceSummary } from './types';

type ZiweiRow = {
    id: string;
    user_id: string | null;
    name: string;
    birth_date: string;
    birth_time: string | null;
    chart_data: Record<string, unknown> | null;
    created_at: string;
};

export const ziweiProvider: DataSourceProvider<ZiweiRow> = {
    type: 'ziwei_chart',
    displayName: '紫微命盘',

    async list(userId: string, ctx?: DataSourceQueryContext): Promise<DataSourceSummary[]> {
        const supabase = ctx?.client ?? getServiceRoleClient();
        const limit = ctx?.limit ?? 50;
        const { data, error } = await supabase
            .from('ziwei_charts')
            .select('id, name, birth_date, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw new Error(error.message);
        return (data || []).map((chart: { id: string; name: string | null; birth_date: string; created_at: string }) => ({
            id: chart.id,
            type: 'ziwei_chart',
            name: chart.name || '未命名命盘',
            preview: `紫微命盘 - ${chart.birth_date}`,
            createdAt: chart.created_at
        }));
    },

    async get(id: string, userId: string, ctx?: DataSourceQueryContext): Promise<ZiweiRow | null> {
        const supabase = ctx?.client ?? getServiceRoleClient();
        const { data, error } = await supabase
            .from('ziwei_charts')
            .select('*')
            .eq('id', id)
            .eq('user_id', userId)
            .maybeSingle();
        if (error) throw new Error(error.message);
        return (data as ZiweiRow) || null;
    },

    formatForAI(chart: ZiweiRow): string {
        const chartData = chart.chart_data || {};
        const name = chart.name || '未命名';
        const birth = `${chart.birth_date}${chart.birth_time ? ` ${chart.birth_time}` : ''}`;

        return [
            `## 紫微命盘：${name}`,
            `- 出生时间：${birth}`,
            `- 结构化数据：${JSON.stringify(chartData)}`
        ].join('\n');
    },

    summarize(chart: ZiweiRow): string {
        return `${chart.name || '未命名'} - ${chart.birth_date}`;
    }
};
