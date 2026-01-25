import { getServiceRoleClient } from '@/lib/api-utils';
import { TAROT_SPREADS } from '@/lib/tarot';
import type { DataSourceProvider, DataSourceQueryContext, DataSourceSummary } from './types';

type TarotRow = {
    id: string;
    user_id: string;
    spread_id: string;
    question: string | null;
    cards: unknown;
    created_at: string;
    conversation_id: string | null;
};

export const tarotProvider: DataSourceProvider<TarotRow> = {
    type: 'tarot_reading',
    displayName: '塔罗记录',

    async list(userId: string, ctx?: DataSourceQueryContext): Promise<DataSourceSummary[]> {
        const supabase = ctx?.client ?? getServiceRoleClient();
        const limit = ctx?.limit ?? 50;
        const { data, error } = await supabase
            .from('tarot_readings')
            .select('id, spread_id, question, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw new Error(error.message);
        return (data || []).map((row: { id: string; spread_id: string; question: string | null; created_at: string }) => {
            const spreadName = TAROT_SPREADS.find(spread => spread.id === row.spread_id)?.name || row.spread_id || '塔罗占卜';
            return {
                id: row.id,
                type: 'tarot_reading',
                name: `塔罗 - ${spreadName}`,
                preview: row.question ? `问题：${row.question}` : `牌阵：${spreadName}`,
                createdAt: row.created_at
            };
        });
    },

    async get(id: string, userId: string, ctx?: DataSourceQueryContext): Promise<TarotRow | null> {
        const supabase = ctx?.client ?? getServiceRoleClient();
        const { data, error } = await supabase
            .from('tarot_readings')
            .select('*')
            .eq('id', id)
            .eq('user_id', userId)
            .maybeSingle();
        if (error) throw new Error(error.message);
        return (data as TarotRow) || null;
    },

    formatForAI(reading: TarotRow): string {
        return [
            `## 塔罗占卜：${reading.spread_id}`,
            reading.question ? `- 问题：${reading.question}` : '',
            `- 抽到的牌：${JSON.stringify(reading.cards)}`
        ].filter(Boolean).join('\n');
    },

    summarize(reading: TarotRow): string {
        const spreadName = TAROT_SPREADS.find(spread => spread.id === reading.spread_id)?.name || reading.spread_id || '塔罗占卜';
        return reading.question ? `${spreadName} - ${reading.question}` : spreadName;
    }
};
