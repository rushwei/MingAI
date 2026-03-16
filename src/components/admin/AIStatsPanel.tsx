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
    TrendingUp,
    TrendingDown,
    Clock,
    Zap,
    AlertCircle,
    Calendar,
    PieChart as PieChartIcon,
    BarChart3 as BarChart2,
    type LucideIcon,
} from 'lucide-react';
import { SoundWaveLoader } from '@/components/ui/SoundWaveLoader';
import { supabase } from '@/lib/supabase';
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    AreaChart,
    Area
} from 'recharts';

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
    [key: string]: string | number; // Recharts compatibility
}

interface DateStats {
    date: string;
    calls: number;
    success: number;
    errors: number;
    [key: string]: string | number; // Recharts compatibility
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

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
        return <SoundWaveLoader variant="block" />;
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
        <div className="space-y-6 animate-fade-in">
            {/* 顶部控制栏 */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <BarChart2 className="w-5 h-5 text-accent" />
                        AI 服务概览
                    </h3>
                    <p className="text-xs text-foreground-secondary mt-1">
                        实时监控 AI 模型的调用情况与性能指标
                    </p>
                </div>
                <div className="flex items-center gap-2 bg-background-secondary p-1 rounded-lg border border-border/50">
                    {[7, 14, 30].map((d) => (
                        <button
                            key={d}
                            onClick={() => setDays(d)}
                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${days === d
                                ? 'bg-background text-foreground shadow-sm'
                                : 'text-foreground-secondary hover:text-foreground'
                                }`}
                        >
                            近 {d} 天
                        </button>
                    ))}
                </div>
            </div>

            {/* 核心指标卡片 */}
            {summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card
                        title="总调用量"
                        value={formatNumber(summary.totalCalls)}
                        icon={Zap}
                        iconColor="text-blue-500"
                        subValue={`Tokens: ${formatNumber(summary.totalTokens)}`}
                    />
                    <Card
                        title="成功率"
                        value={`${successRate}%`}
                        icon={successRate >= 95 ? TrendingUp : TrendingDown}
                        iconColor={successRate >= 95 ? 'text-green-500' : 'text-red-500'}
                        subValue={`成功: ${formatNumber(summary.totalSuccess)}`}
                    />
                    <Card
                        title="平均耗时"
                        value={summary.avgResponseTime > 1000
                            ? `${(summary.avgResponseTime / 1000).toFixed(2)}s`
                            : `${Math.round(summary.avgResponseTime)}ms`}
                        icon={Clock}
                        iconColor="text-amber-500"
                        subValue="平均响应时间"
                    />
                    <Card
                        title="错误数"
                        value={formatNumber(summary.totalErrors)}
                        icon={AlertCircle}
                        iconColor={summary.totalErrors > 0 ? 'text-red-500' : 'text-green-500'}
                        subValue={`错误率: ${(100 - successRate).toFixed(1)}%`}
                    />
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 每日趋势图表 */}
                <div className="lg:col-span-2 bg-background-secondary/30 rounded-2xl p-5 border border-border/50">
                    <h4 className="font-medium text-sm mb-6 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-accent" />
                        调用趋势
                    </h4>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={byDate}>
                                <defs>
                                    <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8884d8" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#82ca9d" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(str) => str.slice(5)}
                                    tick={{ fontSize: 12, fill: '#888' }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis
                                    tick={{ fontSize: 12, fill: '#888' }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend />
                                <Area
                                    type="monotone"
                                    dataKey="calls"
                                    name="总调用"
                                    stroke="#8884d8"
                                    fillOpacity={1}
                                    fill="url(#colorCalls)"
                                    strokeWidth={2}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="success"
                                    name="成功"
                                    stroke="#82ca9d"
                                    fillOpacity={1}
                                    fill="url(#colorSuccess)"
                                    strokeWidth={2}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 模型分布图表 */}
                <div className="bg-background-secondary/30 rounded-2xl p-5 border border-border/50">
                    <h4 className="font-medium text-sm mb-6 flex items-center gap-2">
                        <PieChartIcon className="w-4 h-4 text-accent" />
                        模型分布
                    </h4>
                    <div className="h-[300px] w-full flex flex-col items-center justify-center">
                        {byModel.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={byModel}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="calls"
                                        nameKey="modelKey"
                                    >
                                        {byModel.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomPieTooltip />} />
                                    <Legend
                                        layout="vertical"
                                        verticalAlign="bottom"
                                        align="center"
                                        iconSize={8}
                                        wrapperStyle={{ fontSize: '12px' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="text-foreground-secondary text-sm">暂无数据</div>
                        )}
                    </div>
                </div>
            </div>

            {/* 详细数据表格 */}
            <div className="bg-background-secondary/30 rounded-2xl p-5 border border-border/50 overflow-hidden">
                <h4 className="font-medium text-sm mb-4">详细统计</h4>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border/50">
                                <th className="text-left px-4 py-3 font-medium text-foreground-secondary">模型名称</th>
                                <th className="text-right px-4 py-3 font-medium text-foreground-secondary">调用次数</th>
                                <th className="text-right px-4 py-3 font-medium text-foreground-secondary">成功率</th>
                                <th className="text-right px-4 py-3 font-medium text-foreground-secondary">平均耗时</th>
                                <th className="text-right px-4 py-3 font-medium text-foreground-secondary">Token 消耗</th>
                            </tr>
                        </thead>
                        <tbody>
                            {byModel.map((stat, index) => {
                                const rate = getSuccessRate(stat.success, stat.calls);
                                return (
                                    <tr
                                        key={stat.modelKey}
                                        className="hover:bg-background-secondary/50 transition-colors border-b border-border/30 last:border-0"
                                    >
                                        <td className="px-4 py-3 font-medium">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                                {stat.modelKey}
                                            </div>
                                        </td>
                                        <td className="text-right px-4 py-3">{formatNumber(stat.calls)}</td>
                                        <td className="text-right px-4 py-3">
                                            <div className="flex items-center justify-end gap-2">
                                                <div className="w-16 h-1.5 bg-border rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${rate >= 95 ? 'bg-green-500' : rate >= 80 ? 'bg-amber-500' : 'bg-red-500'}`}
                                                        style={{ width: `${rate}%` }}
                                                    />
                                                </div>
                                                <span className={`${rate >= 95 ? 'text-green-500' : rate >= 80 ? 'text-amber-500' : 'text-red-500'}`}>
                                                    {rate}%
                                                </span>
                                            </div>
                                        </td>
                                        <td className="text-right px-4 py-3">
                                            <span className="font-mono text-xs bg-background p-1 rounded border border-border/50">
                                                {stat.avgResponseTime > 1000
                                                    ? `${(stat.avgResponseTime / 1000).toFixed(2)}s`
                                                    : `${Math.round(stat.avgResponseTime)}ms`}
                                            </span>
                                        </td>
                                        <td className="text-right px-4 py-3 font-mono">{formatNumber(stat.tokens)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 无数据提示 */}
            {summary?.totalCalls === 0 && (
                <div className="text-center py-12 text-foreground-secondary bg-background-secondary/20 rounded-xl border-dashed border border-border">
                    <Zap className="w-12 h-12 mx-auto mb-3 opacity-30 text-accent" />
                    <p>暂无统计数据</p>
                    <p className="text-sm mt-1 opacity-70">AI 接口被调用后将自动生成图表</p>
                </div>
            )}
        </div>
    );
}

// 子组件：指标卡片
function Card({ title, value, icon: Icon, iconColor, subValue }: {
    title: string;
    value: string;
    icon: LucideIcon;
    iconColor: string;
    subValue: string;
}) {
    return (
        <div className="p-5 rounded-2xl bg-background-secondary/30 border border-border/50 hover:border-accent/30 transition-all hover:bg-background-secondary/50">
            <div className="flex items-start justify-between mb-2">
                <span className="text-sm text-foreground-secondary font-medium">{title}</span>
                <div className={`p-2 rounded-lg bg-background ${iconColor} bg-opacity-10`}>
                    <Icon className={`w-4 h-4 ${iconColor}`} />
                </div>
            </div>
            <div className="text-2xl font-bold mb-1">{value}</div>
            <div className="text-xs text-foreground-secondary opacity-80">{subValue}</div>
        </div>
    );
}

// Recharts tooltip types
interface TooltipPayloadEntry {
    color: string;
    name: string;
    value: number;
    percent?: number;
}

interface TooltipProps {
    active?: boolean;
    payload?: TooltipPayloadEntry[];
    label?: string;
}

// 子组件：自定义 Tooltip
const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-background/95 backdrop-blur-md p-3 border border-border/50 rounded-xl shadow-xl text-xs">
                <p className="font-semibold mb-2">{label}</p>
                {payload.map((entry, index: number) => (
                    <div key={index} className="flex items-center gap-2 mb-1 last:mb-0">
                        <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-foreground-secondary">{entry.name}:</span>
                        <span className="font-mono font-medium">{entry.value}</span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

const CustomPieTooltip = ({ active, payload }: TooltipProps) => {
    if (active && payload && payload.length) {
        const data = payload[0];
        return (
            <div className="bg-background/95 backdrop-blur-md p-3 border border-border/50 rounded-xl shadow-xl text-xs">
                <p className="font-semibold mb-1">{data.name}</p>
                <div className="flex items-center gap-2">
                    <span className="text-foreground-secondary">调用:</span>
                    <span className="font-mono font-medium">{data.value}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-foreground-secondary">占比:</span>
                    <span className="font-mono font-medium">
                        {((data.percent ?? 0) * 100).toFixed(1)}%
                    </span>
                </div>
            </div>
        );
    }
    return null;
};
