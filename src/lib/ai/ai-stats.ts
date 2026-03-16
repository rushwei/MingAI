/**
 * AI 模型调用统计记录
 *
 * 通过 RPC 记录统计，不依赖 service role key。
 */

import { getSystemAdminClient } from '@/lib/supabase-server';

interface StatsRecord {
    modelKey: string;
    sourceKey?: string;
    success: boolean;
    responseTimeMs?: number;
    tokensUsed?: number;
}

export function recordAIStats(record: StatsRecord): void {
    void writeStats(record).catch(err => {
        console.error('[ai-stats] Failed to record stats:', err);
    });
}

export async function recordAIStatsAsync(record: StatsRecord): Promise<void> {
    await writeStats(record);
}

async function writeStats(record: StatsRecord): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = getSystemAdminClient() as any;
    if (!supabase || typeof supabase.rpc !== 'function') {
        return;
    }

    const { error } = await supabase.rpc('record_ai_model_call', {
        p_model_key: record.modelKey,
        p_source_key: record.sourceKey || null,
        p_success: record.success,
        p_tokens_used: record.tokensUsed || 0,
        p_response_time_ms: record.responseTimeMs || 0,
    });

    if (error) {
        console.error('[ai-stats] RPC error:', error);
    }
}
