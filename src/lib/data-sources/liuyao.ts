import { getServiceRoleClient } from '@/lib/api-utils';
import { findHexagram } from '@/lib/liuyao';
import type { DataSourceProvider, DataSourceQueryContext, DataSourceSummary } from './types';

type LiuyaoRow = {
    id: string;
    user_id: string | null;
    question: string;
    hexagram_code: string;
    changed_hexagram_code: string | null;
    changed_lines: unknown;
    created_at: string;
    conversation_id: string | null;
};

export const liuyaoProvider: DataSourceProvider<LiuyaoRow> = {
    type: 'liuyao_divination',
    displayName: '六爻记录',

    async list(userId: string, ctx?: DataSourceQueryContext): Promise<DataSourceSummary[]> {
        const supabase = ctx?.client ?? getServiceRoleClient();
        const limit = ctx?.limit ?? 50;
        const { data, error } = await supabase
            .from('liuyao_divinations')
            .select('id, question, hexagram_code, changed_hexagram_code, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw new Error(error.message);
        return (data || []).map((row: { id: string; question: string | null; hexagram_code: string; changed_hexagram_code: string | null; created_at: string }) => {
            const baseHexagram = findHexagram(row.hexagram_code);
            const baseName = baseHexagram?.name || '未知卦';
            const changedHexagram = row.changed_hexagram_code ? findHexagram(row.changed_hexagram_code) : undefined;
            const changedName = changedHexagram?.name || (row.changed_hexagram_code ? '未知卦' : '');
            const hexagramDisplay = changedName ? `${baseName} → ${changedName}` : baseName;
            return {
                id: row.id,
                type: 'liuyao_divination',
                name: `六爻 - ${hexagramDisplay}`,
                preview: row.question
                    ? `问题：${row.question}`
                    : `本卦：${baseName}${changedName ? ` / 变卦：${changedName}` : ''}`,
                createdAt: row.created_at
            };
        });
    },

    async get(id: string, userId: string, ctx?: DataSourceQueryContext): Promise<LiuyaoRow | null> {
        const supabase = ctx?.client ?? getServiceRoleClient();
        const { data, error } = await supabase
            .from('liuyao_divinations')
            .select('*')
            .eq('id', id)
            .eq('user_id', userId)
            .maybeSingle();
        if (error) throw new Error(error.message);
        return (data as LiuyaoRow) || null;
    },

    formatForAI(r: LiuyaoRow): string {
        return [
            '## 六爻占卜',
            `- 问题：${r.question}`,
            `- 本卦：${r.hexagram_code}`,
            r.changed_hexagram_code ? `- 变卦：${r.changed_hexagram_code}` : '',
            r.changed_lines ? `- 动爻：${JSON.stringify(r.changed_lines)}` : ''
        ].filter(Boolean).join('\n');
    },

    summarize(r: LiuyaoRow): string {
        return r.question;
    }
};
