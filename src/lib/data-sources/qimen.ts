import { getSystemAdminClient } from '@/lib/api-utils';
import { generateQimenResultText, type QimenOutput } from '@/lib/divination/qimen-shared';
import type { DataSourceProvider, DataSourceQueryContext, DataSourceSummary } from '@/lib/data-sources/types';

type QimenRow = {
    id: string;
    user_id: string;
    question: string | null;
    dun_type: string;
    ju_number: number;
    chart_data: QimenOutput;
    created_at: string;
};

const DUN_LABEL: Record<string, string> = { yang: '阳遁', yin: '阴遁' };

export const qimenProvider: DataSourceProvider<QimenRow> = {
    type: 'qimen_chart',
    displayName: '奇门遁甲',

    async list(userId: string, ctx?: DataSourceQueryContext): Promise<DataSourceSummary[]> {
        const supabase = ctx?.client ?? getSystemAdminClient();
        const limit = ctx?.limit ?? 50;
        const { data, error } = await supabase
            .from('qimen_charts')
            .select('id, question, dun_type, ju_number, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw new Error(error.message);
        return (data || []).map((row: { id: string; question: string | null; dun_type: string; ju_number: number; created_at: string }) => {
            const dunLabel = DUN_LABEL[row.dun_type] || row.dun_type;
            return {
                id: row.id,
                type: 'qimen_chart' as const,
                name: `奇门遁甲 - ${dunLabel}${row.ju_number}局`,
                preview: row.question ? `问题：${row.question}` : `${dunLabel}${row.ju_number}局`,
                createdAt: row.created_at,
            };
        });
    },

    async get(id: string, userId: string, ctx?: DataSourceQueryContext): Promise<QimenRow | null> {
        const supabase = ctx?.client ?? getSystemAdminClient();
        const { data, error } = await supabase
            .from('qimen_charts')
            .select('id, question, dun_type, ju_number, chart_data, created_at')
            .eq('id', id)
            .eq('user_id', userId)
            .maybeSingle();
        if (error) throw new Error(error.message);
        return (data as QimenRow) || null;
    },

    formatForAI(r: QimenRow, ctx?: DataSourceQueryContext): string {
        const c = r.chart_data;
        if (!c) return '奇门遁甲排盘数据缺失';
        return generateQimenResultText({
            ...c,
            question: r.question || undefined,
        }, { detailLevel: ctx?.chartPromptDetailLevel });
    },

    summarize(r: QimenRow): string {
        return r.question || '奇门遁甲排盘';
    },
};
