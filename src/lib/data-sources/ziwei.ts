import { getSystemAdminClient } from '@/lib/api-utils';
import { type ZiweiChart } from '@/lib/divination/ziwei';
import { formatZiweiPromptText } from '@/lib/ziwei-chart-prompt';
import type { DataSourceProvider, DataSourceQueryContext, DataSourceSummary } from '@/lib/data-sources/types';

type ZiweiRow = {
    id: string;
    user_id: string | null;
    name: string;
    gender: string | null;
    birth_date: string;
    birth_time: string | null;
    calendar_type: string | null;
    is_leap_month: boolean | null;
    birth_place: string | null;
    chart_data: Record<string, unknown> | null;
    created_at: string;
};

export const ziweiProvider: DataSourceProvider<ZiweiRow> = {
    type: 'ziwei_chart',
    displayName: '紫微命盘',

    async list(userId: string, ctx?: DataSourceQueryContext): Promise<DataSourceSummary[]> {
        const supabase = ctx?.client ?? getSystemAdminClient();
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
        const supabase = ctx?.client ?? getSystemAdminClient();
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
        const canonicalText = formatZiweiPromptText({
            ...(chartData as Partial<ZiweiChart>),
            name,
            gender: (chart.gender === 'male' || chart.gender === 'female') ? chart.gender : undefined,
            birthDate: chart.birth_date,
            birthTime: chart.birth_time || undefined,
            birthPlace: chart.birth_place || undefined,
            calendarType: (chart.calendar_type as 'solar' | 'lunar' | undefined) || 'solar',
            isLeapMonth: chart.is_leap_month ?? false,
            chartData,
        });
        if (canonicalText) return canonicalText;

        // Fallback: 尝试提取更多有用信息
        const lines = [`## 紫微命盘：${name}`, `- 出生时间：${birth}`];
        if (chart.gender) lines.push(`- 性别：${chart.gender}`);
        if (chart.calendar_type) lines.push(`- 历法：${chart.calendar_type === 'lunar' ? '农历' : '阳历'}`);
        if (chart.is_leap_month) lines.push(`- 闰月：是`);
        if (chart.birth_place) lines.push(`- 出生地：${chart.birth_place}`);

        // 尝试从 chartData 中提取关键字段
        const cd = chartData as Record<string, unknown>;
        if (cd.fiveElement) lines.push(`- 五行局：${cd.fiveElement}`);
        if (cd.soul) lines.push(`- 命主：${cd.soul}`);
        if (cd.body) lines.push(`- 身主：${cd.body}`);
        if (cd.solarDate) lines.push(`- 阳历：${cd.solarDate}`);
        if (cd.lunarDate) lines.push(`- 农历：${cd.lunarDate}`);

        return lines.join('\n');
    },

    summarize(chart: ZiweiRow): string {
        return `${chart.name || '未命名'} - ${chart.birth_date}`;
    }
};
