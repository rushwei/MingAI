import { getSystemAdminClient } from '@/lib/api-utils';
import { getHepanTypeName, type HepanType } from '@/lib/divination/hepan';
import type { DataSourceProvider, DataSourceQueryContext, DataSourceSummary } from '@/lib/data-sources/types';

type HepanRow = {
    id: string;
    user_id: string | null;
    type: string;
    person1_name: string;
    person1_birth: unknown;
    person2_name: string;
    person2_birth: unknown;
    compatibility_score: number | null;
    created_at: string;
    conversation_id: string | null;
    result_data: unknown;
};

export const hepanProvider: DataSourceProvider<HepanRow> = {
    type: 'hepan_chart',
    displayName: '合盘记录',

    async list(userId: string, ctx?: DataSourceQueryContext): Promise<DataSourceSummary[]> {
        const supabase = ctx?.client ?? getSystemAdminClient();
        const limit = ctx?.limit ?? 50;
        const { data, error } = await supabase
            .from('hepan_charts')
            .select('id, type, person1_name, person2_name, compatibility_score, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw new Error(error.message);
        return (data || []).map((row: { id: string; type: string; person1_name: string; person2_name: string; compatibility_score: number | null; created_at: string }) => {
            const typeName = getHepanTypeName(row.type as HepanType);
            const preview = row.compatibility_score != null
                ? `匹配度：${row.compatibility_score} / ${typeName}`
                : `类型：${typeName}`;
            return {
                id: row.id,
                type: 'hepan_chart',
                name: `${typeName} - ${row.person1_name} × ${row.person2_name}`,
                preview,
                createdAt: row.created_at,
                hepanType: row.type as HepanType
            };
        });
    },

    async get(id: string, userId: string, ctx?: DataSourceQueryContext): Promise<HepanRow | null> {
        const supabase = ctx?.client ?? getSystemAdminClient();
        const { data, error } = await supabase
            .from('hepan_charts')
            .select('*')
            .eq('id', id)
            .eq('user_id', userId)
            .maybeSingle();
        if (error) throw new Error(error.message);
        return (data as HepanRow) || null;
    },

    formatForAI(r: HepanRow): string {
        return [
            `## 合盘：${r.person1_name} × ${r.person2_name}`,
            `- 类型：${r.type}`,
            `- 类型名称：${getHepanTypeName(r.type as HepanType)}`,
            r.compatibility_score != null ? `- 匹配度：${r.compatibility_score}` : '',
            r.result_data ? `- 结构化结果：${JSON.stringify(r.result_data)}` : ''
        ].filter(Boolean).join('\n');
    },

    summarize(r: HepanRow): string {
        return `${r.person1_name} × ${r.person2_name}`;
    }
};
