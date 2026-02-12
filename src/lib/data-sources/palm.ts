import { getServiceRoleClient } from '@/lib/api-utils';
import { PALM_ANALYSIS_TYPES } from '@/lib/divination/palm';
import type { DataSourceProvider, DataSourceQueryContext, DataSourceSummary } from '@/lib/data-sources/types';

type PalmRow = {
    id: string;
    user_id: string;
    analysis_type: string | null;
    hand_type: string | null;
    created_at: string;
    conversation_id: string | null;
    conversation?: { messages?: unknown; source_data?: Record<string, unknown> } | null;
};

const extractConversationAnalysis = (conversation?: { messages?: unknown } | null): string | null => {
    const messages = Array.isArray(conversation?.messages) ? conversation?.messages : [];
    const assistant = messages.find((m: { role?: string; content?: string }) => m?.role === 'assistant' && m?.content);
    return assistant?.content || null;
};

export const palmProvider: DataSourceProvider<PalmRow> = {
    type: 'palm_reading',
    displayName: '手相记录',

    async list(userId: string, ctx?: DataSourceQueryContext): Promise<DataSourceSummary[]> {
        const supabase = ctx?.client ?? getServiceRoleClient();
        const limit = ctx?.limit ?? 50;
        const { data, error } = await supabase
            .from('palm_readings')
            .select('id, analysis_type, hand_type, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw new Error(error.message);
        const handTypeMap: Record<string, string> = {
            left: '左手',
            right: '右手',
            both: '双手'
        };
        return (data || []).map((row: { id: string; analysis_type: string | null; hand_type: string | null; created_at: string }) => {
            const typeName = PALM_ANALYSIS_TYPES.find(t => t.id === row.analysis_type)?.name || row.analysis_type || '综合分析';
            const handName = row.hand_type ? (handTypeMap[row.hand_type] || row.hand_type) : '';
            const previewParts = [
                handName ? `手：${handName}` : '',
                row.analysis_type ? `类型：${typeName}` : ''
            ].filter(Boolean);
            return {
                id: row.id,
                type: 'palm_reading',
                name: `手相分析 - ${handName ? `${handName} ${typeName}` : typeName}`,
                preview: previewParts.length ? previewParts.join(' / ') : '手相分析记录',
                createdAt: row.created_at
            };
        });
    },

    async get(id: string, userId: string, ctx?: DataSourceQueryContext): Promise<PalmRow | null> {
        const supabase = ctx?.client ?? getServiceRoleClient();
        const { data, error } = await supabase
            .from('palm_readings')
            .select('*, conversation:conversations(messages, source_data)')
            .eq('id', id)
            .eq('user_id', userId)
            .maybeSingle();
        if (error) throw new Error(error.message);
        return (data as PalmRow) || null;
    },

    formatForAI(r: PalmRow): string {
        const analysisText = extractConversationAnalysis(r.conversation);
        const sourceData = r.conversation?.source_data || {};
        return [
            '## 手相分析记录',
            r.hand_type ? `- 手：${r.hand_type}` : '',
            r.analysis_type ? `- 类型：${r.analysis_type}` : '',
            typeof sourceData?.question === 'string' && sourceData.question ? `- 提问：${sourceData.question}` : '',
            r.conversation_id ? `- 对应对话：${r.conversation_id}` : '',
            analysisText ? `\n【AI解读】\n${analysisText}` : ''
        ].filter(Boolean).join('\n');
    },

    summarize(r: PalmRow): string {
        const handTypeMap: Record<string, string> = {
            left: '左手',
            right: '右手',
            both: '双手'
        };
        const handName = r.hand_type ? (handTypeMap[r.hand_type] || r.hand_type) : '';
        const typeName = PALM_ANALYSIS_TYPES.find(t => t.id === r.analysis_type)?.name || r.analysis_type || '综合分析';
        return handName ? `手相(${handName} · ${typeName})` : `手相(${typeName})`;
    }
};
