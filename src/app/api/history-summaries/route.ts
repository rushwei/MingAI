import { type NextRequest } from 'next/server';
import { jsonError, jsonOk, requireUserContext } from '@/lib/api-utils';

type HistoryType = 'tarot' | 'liuyao' | 'mbti' | 'hepan';

type HistorySummary = {
    id: string;
    title: string;
    createdAt: string;
};

const HISTORY_CONFIG: Record<HistoryType, {
    table: string;
    select: string;
    buildTitle: (row: Record<string, unknown>) => string;
}> = {
    tarot: {
        table: 'tarot_readings',
        select: 'id, question, created_at',
        buildTitle: (row) => String(row.question || '未命名'),
    },
    liuyao: {
        table: 'liuyao_divinations',
        select: 'id, question, created_at',
        buildTitle: (row) => String(row.question || '未命名'),
    },
    mbti: {
        table: 'mbti_readings',
        select: 'id, mbti_type, created_at',
        buildTitle: (row) => `${String(row.mbti_type || '未知')} 人格`,
    },
    hepan: {
        table: 'hepan_charts',
        select: 'id, person1_name, person2_name, created_at',
        buildTitle: (row) => `${String(row.person1_name || 'A')} & ${String(row.person2_name || 'B')}`,
    },
};

export async function GET(request: NextRequest) {
    const auth = await requireUserContext(request);
    if ('error' in auth) return jsonError(auth.error.message, auth.error.status);

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as HistoryType | null;

    if (!type || !(type in HISTORY_CONFIG)) {
        return jsonError('无效的历史类型', 400);
    }

    const config = HISTORY_CONFIG[type];
    const { data, error } = await auth.supabase
        .from(config.table)
        .select(config.select)
        .eq('user_id', auth.user.id)
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error('[history-summaries] failed to load history:', error);
        return jsonError('加载历史记录失败', 500);
    }

    const items: HistorySummary[] = (data || []).map((item) => {
        const row = item as Record<string, unknown>;
        const title = config.buildTitle(row);
        return {
            id: String(row.id || ''),
            title: title.length > 20 ? `${title.slice(0, 20)}...` : title,
            createdAt: String(row.created_at || ''),
        };
    });

    return jsonOk({ items });
}
