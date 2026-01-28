/**
 * AI 使用统计面板
 *
 * 功能：
 * - 显示模型调用统计
 * - 按日期、模型分组查看
 * - 成功率、响应时间等指标
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Loader2,
    TrendingUp,
    TrendingDown,
    Clock,
    Zap,
    AlertCircle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

// 类型定义
interface StatsSummary {
    totalCalls: number;
    totalSuccess: number;
    totalErrors: number;
    totalTokens: number;
    avgResponseTime: number;
}

interface ModelStats {
    modelKey: string;
    calls: number;
    success: number;
    errors: number;
    tokens: number;
    avgResponseTime: number;
}

interface DateStats {
    date: string;
    calls: number;
    success: number;
    errors: number;
}

export function AIStatsPanel() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [days, setDays] = useState(7);
    const [summary, setSummary] = useState<StatsSummary | null>(null);
    const [byModel, setByModel] = useState<ModelStats[]>([]);
    const [byDate, setByDate] = useState<DateStats[]>([]);

    // 获取 token
    const getToken = useCallback(async () => {
        const { data: { session } } = await supabase.auth.getSession();
        return session?.access_token;
    }, []);

    // 加载统计数据
    const loadStats = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const token = await getToken();
            if (!token) {
                setError('未登录');
                return;
            }

            const response = await fetch(`/api/admin/ai-models/stats?days=${days}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || '获取统计数据失败');
            }

            setSummary(data.summary);
            setByModel(data.byModel || []);
            setByDate(data.byDate || []);
        } catch (e) {
            setError(e instanceof Error ? e.message : '获取统计数据失败');
        } finally {
            setLoading(false);
        }
    }, [getToken, days]);

    useEffect(() => {
        loadStats();
    }, [loadStats]);

    // 格式化数字
    const formatNumber = (num: number): string => {
        if (num >= 1000000) {
            return `${(num / 1000000).toFixed(1)}M`;
        }
        if (num >= 1000) {
            return `${(num / 1000).toFixed(1)}K`;
        }
        return num.toString();
    };

    // 计算成功率
    const getSuccessRate = (success: number, total: number): number => {
        if (total === 0) return 0;
        return Math.round((success / total) * 100);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-accent" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-12">
                <p className="text-red-500 mb-4">{error}</p>
                <button
                    onClick={loadStats}
                    className="px-4 py-2 rounded-lg bg-accent text-white hover:bg-accent/90"
                >
                    重试
                </button>
            </div>
        );
    }

    const successRate = summary ? getSuccessRate(summary.totalSuccess, summary.totalCalls) : 0;

    return (
        <div className="space-y-6">
            {/* 时间范围选择 */}
            <div className="flex items-center justify-between">
                <h3 className="font-medium">使用统计</h3>
                <select
                    value={days}
                    onChange={(e) => setDays(parseInt(e.target.value))}
                    className="px-3 py-1.5 rounded-lg border border-border bg-background text-sm"
                >
                    <option value={7}>最近 7 天</option>
                    <option value={14}>最近 14 天</option>
                    <option value={30}>最近 30 天</option>
                </select>
            </div>

            {/* 汇总卡片 */}
            {summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl bg-background-secondary">
                        <div className="flex items-center gap-2 text-foreground-secondary text-sm mb-1">
                            <Zap className="w-4 h-4" />
                            总调用次数
                        </div>
                        <p className="text-2xl font-bold">{formatNumber(summary.totalCalls)}</p>
                    </div>

                    <div className="p-4 rounded-xl bg-background-secondary">
                        <div className="flex items-center gap-2 text-foreground-secondary text-sm mb-1">
                            {successRate >= 95 ? (
                                <TrendingUp className="w-4 h-4 text-green-500" />
                            ) : (
                                <TrendingDown className="w-4 h-4 text-red-500" />
                            )}
                            成功率
                        </div>
                        <p className="text-2xl font-bold">
                            {successRate}%
                        </p>
                    </div>

                    <div className="p-4 rounded-xl bg-background-secondary">
                        <div className="flex items-center gap-2 text-foreground-secondary text-sm mb-1">
                            <Clock className="w-4 h-4" />
                            平均响应时间
                        </div>
                        <p className="text-2xl font-bold">
                            {summary.avgResponseTime > 1000
                                ? `${(summary.avgResponseTime / 1000).toFixed(1)}s`
                                : `${summary.avgResponseTime}ms`}
                        </p>
                    </div>

                    <div className="p-4 rounded-xl bg-background-secondary">
                        <div className="flex items-center gap-2 text-foreground-secondary text-sm mb-1">
                            <AlertCircle className="w-4 h-4" />
                            错误次数
                        </div>
                        <p className="text-2xl font-bold text-red-500">
                            {formatNumber(summary.totalErrors)}
                        </p>
                    </div>
                </div>
            )}

            {/* 按模型统计 */}
            {byModel.length > 0 && (
                <div>
                    <h4 className="font-medium text-sm mb-3">按模型统计</h4>
                    <div className="border border-border rounded-xl overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-background-secondary">
                                <tr>
                                    <th className="text-left px-4 py-2 font-medium">模型</th>
                                    <th className="text-right px-4 py-2 font-medium">调用次数</th>
                                    <th className="text-right px-4 py-2 font-medium">成功率</th>
                                    <th className="text-right px-4 py-2 font-medium">Token 用量</th>
                                </tr>
                            </thead>
                            <tbody>
                                {byModel.map((stat, index) => (
                                    <tr
                                        key={stat.modelKey}
                                        className={index % 2 === 0 ? '' : 'bg-background-secondary/30'}
                                    >
                                        <td className="px-4 py-2">{stat.modelKey}</td>
                                        <td className="text-right px-4 py-2">{formatNumber(stat.calls)}</td>
                                        <td className="text-right px-4 py-2">
                                            <span className={
                                                getSuccessRate(stat.success, stat.calls) >= 95
                                                    ? 'text-green-500'
                                                    : getSuccessRate(stat.success, stat.calls) >= 80
                                                        ? 'text-amber-500'
                                                        : 'text-red-500'
                                            }>
                                                {getSuccessRate(stat.success, stat.calls)}%
                                            </span>
                                        </td>
                                        <td className="text-right px-4 py-2">{formatNumber(stat.tokens)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* 按日期统计 */}
            {byDate.length > 0 && (
                <div>
                    <h4 className="font-medium text-sm mb-3">每日趋势</h4>
                    <div className="border border-border rounded-xl p-4">
                        <div className="flex items-end gap-1 h-32">
                            {byDate.map((stat) => {
                                const maxCalls = Math.max(...byDate.map(d => d.calls));
                                const height = maxCalls > 0 ? (stat.calls / maxCalls) * 100 : 0;
                                const rate = getSuccessRate(stat.success, stat.calls);

                                return (
                                    <div
                                        key={stat.date}
                                        className="flex-1 flex flex-col items-center gap-1"
                                    >
                                        <div className="w-full flex flex-col-reverse" style={{ height: '100px' }}>
                                            <div
                                                className={`w-full rounded-t transition-all ${rate >= 95 ? 'bg-green-500' : rate >= 80 ? 'bg-amber-500' : 'bg-red-500'
                                                    }`}
                                                style={{ height: `${height}%`, minHeight: stat.calls > 0 ? '4px' : '0' }}
                                                title={`${stat.date}: ${stat.calls} 次调用`}
                                            />
                                        </div>
                                        <span className="text-[10px] text-foreground-secondary">
                                            {stat.date.slice(5)}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* 无数据提示 */}
            {summary?.totalCalls === 0 && (
                <div className="text-center py-8 text-foreground-secondary">
                    <Zap className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>暂无统计数据</p>
                    <p className="text-sm mt-1">AI 调用后数据将自动记录</p>
                </div>
            )}
        </div>
    );
}
