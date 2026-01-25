import { getServiceRoleClient } from '@/lib/api-utils';
import { FACE_ANALYSIS_TYPES } from '@/lib/face';
import type { DataSourceProvider, DataSourceQueryContext, DataSourceSummary } from './types';

type FaceRow = {
    id: string;
    user_id: string;
    analysis_type: string | null;
    created_at: string;
    conversation_id: string | null;
};

export const faceProvider: DataSourceProvider<FaceRow> = {
    type: 'face_reading',
    displayName: '面相记录',

    async list(userId: string, ctx?: DataSourceQueryContext): Promise<DataSourceSummary[]> {
        const supabase = ctx?.client ?? getServiceRoleClient();
        const limit = ctx?.limit ?? 50;
        const { data, error } = await supabase
            .from('face_readings')
            .select('id, analysis_type, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw new Error(error.message);
        return (data || []).map((row: { id: string; analysis_type: string | null; created_at: string }) => {
            const typeName = FACE_ANALYSIS_TYPES.find(t => t.id === row.analysis_type)?.name || row.analysis_type || '面相分析';
            return {
                id: row.id,
                type: 'face_reading',
                name: `面相分析 - ${typeName}`,
                preview: row.analysis_type ? `类型：${typeName}` : '面相分析记录',
                createdAt: row.created_at
            };
        });
    },

    async get(id: string, userId: string, ctx?: DataSourceQueryContext): Promise<FaceRow | null> {
        const supabase = ctx?.client ?? getServiceRoleClient();
        const { data, error } = await supabase
            .from('face_readings')
            .select('*')
            .eq('id', id)
            .eq('user_id', userId)
            .maybeSingle();
        if (error) throw new Error(error.message);
        return (data as FaceRow) || null;
    },

    formatForAI(r: FaceRow): string {
        return [
            '## 面相分析记录',
            r.analysis_type ? `- 类型：${r.analysis_type}` : '',
            r.conversation_id ? `- 对应对话：${r.conversation_id}` : ''
        ].filter(Boolean).join('\n');
    },

    summarize(r: FaceRow): string {
        return FACE_ANALYSIS_TYPES.find(t => t.id === r.analysis_type)?.name || r.analysis_type || '面相分析';
    }
};
