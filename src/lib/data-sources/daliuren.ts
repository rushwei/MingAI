import { getSystemAdminClient } from '@/lib/api-utils';
import type { DataSourceProvider, DataSourceQueryContext, DataSourceSummary } from '@/lib/data-sources/types';

type DaliurenRow = {
    id: string;
    user_id: string | null;
    question: string | null;
    solar_date: string;
    day_ganzhi: string;
    hour_ganzhi: string;
    yue_jiang: string;
    result_data: Record<string, unknown>;
    settings: Record<string, unknown> | null;
    conversation_id: string | null;
    created_at: string;
};

export const daliurenProvider: DataSourceProvider<DaliurenRow> = {
    type: 'daliuren_divination',
    displayName: '大六壬记录',

    async list(userId: string, ctx?: DataSourceQueryContext): Promise<DataSourceSummary[]> {
        const supabase = ctx?.client ?? getSystemAdminClient();
        const limit = ctx?.limit ?? 50;
        const { data, error } = await supabase
            .from('daliuren_divinations')
            .select('id, question, solar_date, day_ganzhi, hour_ganzhi, yue_jiang, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw new Error(error.message);
        return (data || []).map((row: { id: string; question: string | null; solar_date: string; day_ganzhi: string; hour_ganzhi: string; created_at: string }) => ({
            id: row.id,
            type: 'daliuren_divination' as const,
            name: `大六壬 · ${row.day_ganzhi}日`,
            preview: row.question || `${row.solar_date} 起课`,
            createdAt: row.created_at,
        }));
    },

    async get(id: string, userId: string, ctx?: DataSourceQueryContext): Promise<DaliurenRow | null> {
        const supabase = ctx?.client ?? getSystemAdminClient();
        const { data, error } = await supabase
            .from('daliuren_divinations')
            .select('*')
            .eq('id', id)
            .eq('user_id', userId)
            .maybeSingle();

        if (error) throw new Error(error.message);
        return data as DaliurenRow | null;
    },

    formatForAI(row: DaliurenRow): string {
        const rd = row.result_data as Record<string, unknown>;
        const dateInfo = rd.dateInfo as Record<string, unknown> | undefined;
        const sanChuan = rd.sanChuan as Record<string, unknown> | undefined;
        const keTi = rd.keTi as Record<string, unknown> | undefined;
        const lines: string[] = [
            `大六壬排盘记录`,
            `日期：${dateInfo?.solarDate || row.solar_date}`,
            `八字：${dateInfo?.bazi || ''}`,
            `月将：${dateInfo?.yueJiang || row.yue_jiang}（${dateInfo?.yueJiangName || ''}）`,
            `课名：${rd.keName || ''}`,
            `课体：${(keTi?.subTypes as string[] | undefined)?.join('、') || ''}${((keTi?.extraTypes as string[] | undefined)?.length ?? 0) > 0 ? '，' + (keTi?.extraTypes as string[]).join('、') : ''}`,
            `三传：初传${(sanChuan?.chu as string[] | undefined)?.[0] || ''} 中传${(sanChuan?.zhong as string[] | undefined)?.[0] || ''} 末传${(sanChuan?.mo as string[] | undefined)?.[0] || ''}`,
        ];
        if (row.question) lines.push(`占事：${row.question}`);
        return lines.join('\n');
    },

    summarize(row: DaliurenRow): string {
        const rd = row.result_data as Record<string, unknown>;
        const keName = rd.keName as string | undefined;
        return `大六壬 ${keName || row.day_ganzhi + '日'}${row.question ? ' · ' + row.question : ''}`;
    },
};
