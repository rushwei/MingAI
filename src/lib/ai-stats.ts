/**
 * AI 模型调用统计记录
 *
 * 记录每次 AI 调用的统计数据到 ai_model_stats 表
 *
 * 注意：Serverless 环境中不能依赖定时器，需要立即写入
 */

import { createClient } from '@supabase/supabase-js';

interface StatsRecord {
    modelKey: string;
    sourceKey?: string;
    success: boolean;
    responseTimeMs?: number;
    tokensUsed?: number;
}

// 缓存 Supabase 客户端
let _supabase: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
    if (_supabase) return _supabase;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
        return null;
    }

    _supabase = createClient(supabaseUrl, serviceKey);
    return _supabase;
}

/**
 * 记录 AI 调用统计
 *
 * 使用 fire-and-forget 模式：立即发起写入但不等待结果
 * 这样不会阻塞 AI 响应，同时在 Serverless 环境中也能可靠写入
 */
export function recordAIStats(record: StatsRecord): void {
    // Fire-and-forget: 不 await，让写入在后台进行
    writeStats(record).catch(err => {
        console.error('[ai-stats] Failed to record stats:', err);
    });
}

/**
 * 同步记录统计（可等待版本，用于需要确保写入的场景）
 */
export async function recordAIStatsAsync(record: StatsRecord): Promise<void> {
    await writeStats(record);
}

/**
 * 写入单条统计记录
 */
async function writeStats(record: StatsRecord): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) {
        console.warn('[ai-stats] Supabase not configured, skipping stats');
        return;
    }

    const today = new Date().toISOString().split('T')[0];

    const { error } = await supabase.rpc('upsert_ai_model_stats', {
        p_model_key: record.modelKey,
        p_source_key: record.sourceKey || null,
        p_date: today,
        p_call_count: 1,
        p_success_count: record.success ? 1 : 0,
        p_error_count: record.success ? 0 : 1,
        p_total_tokens_used: record.tokensUsed || 0,
        p_total_response_time_ms: record.responseTimeMs || 0,
    });

    if (error) {
        console.error('[ai-stats] RPC error:', error);
    }
}
