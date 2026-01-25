import { getServiceRoleClient } from '@/lib/api-utils';
import type { DataSourceProvider, DataSourceQueryContext, DataSourceSummary } from './types';

type MbtiRow = {
    id: string;
    user_id: string;
    mbti_type: string;
    scores: unknown;
    percentages: unknown;
    created_at: string;
    conversation_id: string | null;
};

export const mbtiProvider: DataSourceProvider<MbtiRow> = {
    type: 'mbti_reading',
    displayName: 'MBTI记录',

    async list(userId: string, ctx?: DataSourceQueryContext): Promise<DataSourceSummary[]> {
        const supabase = ctx?.client ?? getServiceRoleClient();
        const limit = ctx?.limit ?? 50;
        const { data, error } = await supabase
            .from('mbti_readings')
            .select('id, mbti_type, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw new Error(error.message);
        return (data || []).map((row: { id: string; mbti_type: string; created_at: string }) => ({
            id: row.id,
            type: 'mbti_reading',
            name: `MBTI · ${row.mbti_type}`,
            preview: `人格类型：${row.mbti_type}`,
            createdAt: row.created_at
        }));
    },

    async get(id: string, userId: string, ctx?: DataSourceQueryContext): Promise<MbtiRow | null> {
        const supabase = ctx?.client ?? getServiceRoleClient();
        const { data, error } = await supabase
            .from('mbti_readings')
            .select('*')
            .eq('id', id)
            .eq('user_id', userId)
            .maybeSingle();
        if (error) throw new Error(error.message);
        return (data as MbtiRow) || null;
    },

    formatForAI(r: MbtiRow): string {
        return [
            `## MBTI 测评：${r.mbti_type}`,
            r.scores ? `- 分数：${JSON.stringify(r.scores)}` : '',
            r.percentages ? `- 比例：${JSON.stringify(r.percentages)}` : ''
        ].filter(Boolean).join('\n');
    },

    summarize(r: MbtiRow): string {
        return r.mbti_type;
    }
};
