/**
 * AI 模型统计 API
 *
 * GET: 获取调用统计
 */
import { NextRequest } from 'next/server';
import { requireAdminUser, jsonError, jsonOk } from '@/lib/api-utils';
import { getServiceClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
    // 验证管理员权限
    const authResult = await requireAdminUser(request);
    if ('error' in authResult) {
        return jsonError(authResult.error.message, authResult.error.status);
    }

    const supabase = getServiceClient();
    const url = new URL(request.url);

    // 解析查询参数
    const daysParam = url.searchParams.get('days');
    const days = daysParam ? parseInt(daysParam, 10) : 7;
    const modelKey = url.searchParams.get('modelKey');

    // 计算日期范围
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    // 构建查询
    let query = supabase
        .from('ai_model_stats')
        .select('*')
        .gte('date', startDateStr)
        .order('date', { ascending: false });

    if (modelKey) {
        query = query.eq('model_key', modelKey);
    }

    const { data: stats, error } = await query;

    if (error) {
        console.error('[ai-models] Failed to fetch stats:', error);
        return jsonError('获取统计数据失败', 500);
    }

    // 计算汇总数据
    const summary = {
        totalCalls: 0,
        totalSuccess: 0,
        totalErrors: 0,
        totalTokens: 0,
        avgResponseTime: 0,
    };

    let totalResponseTime = 0;
    stats?.forEach(stat => {
        summary.totalCalls += stat.call_count || 0;
        summary.totalSuccess += stat.success_count || 0;
        summary.totalErrors += stat.error_count || 0;
        summary.totalTokens += Number(stat.total_tokens_used) || 0;
        totalResponseTime += Number(stat.total_response_time_ms) || 0;
    });

    if (summary.totalCalls > 0) {
        summary.avgResponseTime = Math.round(totalResponseTime / summary.totalCalls);
    }

    // 按模型聚合
    const byModel: Record<string, {
        modelKey: string;
        calls: number;
        success: number;
        errors: number;
        tokens: number;
        totalResponseTime: number;
        avgResponseTime: number;
    }> = {};

    stats?.forEach(stat => {
        const key = stat.model_key;
        if (!byModel[key]) {
            byModel[key] = {
                modelKey: key,
                calls: 0,
                success: 0,
                errors: 0,
                tokens: 0,
                totalResponseTime: 0,
                avgResponseTime: 0,
            };
        }
        byModel[key].calls += stat.call_count || 0;
        byModel[key].success += stat.success_count || 0;
        byModel[key].errors += stat.error_count || 0;
        byModel[key].tokens += Number(stat.total_tokens_used) || 0;
        byModel[key].totalResponseTime += Number(stat.total_response_time_ms) || 0;
    });

    // 计算每个模型的平均响应时间
    Object.values(byModel).forEach(model => {
        if (model.calls > 0) {
            model.avgResponseTime = Math.round(model.totalResponseTime / model.calls);
        }
    });

    // 按日期聚合（用于图表）
    const byDate: Record<string, {
        date: string;
        calls: number;
        success: number;
        errors: number;
    }> = {};

    stats?.forEach(stat => {
        const date = stat.date;
        if (!byDate[date]) {
            byDate[date] = {
                date,
                calls: 0,
                success: 0,
                errors: 0,
            };
        }
        byDate[date].calls += stat.call_count || 0;
        byDate[date].success += stat.success_count || 0;
        byDate[date].errors += stat.error_count || 0;
    });

    return jsonOk({
        summary,
        byModel: Object.values(byModel).sort((a, b) => b.calls - a.calls),
        byDate: Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date)),
        raw: stats?.map(stat => ({
            modelKey: stat.model_key,
            sourceKey: stat.source_key,
            date: stat.date,
            calls: stat.call_count,
            success: stat.success_count,
            errors: stat.error_count,
            tokens: Number(stat.total_tokens_used),
            totalResponseTime: Number(stat.total_response_time_ms),
        })),
    });
}
