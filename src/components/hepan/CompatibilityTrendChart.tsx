/**
 * 合盘兼容性趋势图组件
 *
 * 显示半年/一年的兼容性走势曲线
 */
'use client';

import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
    Area,
    AreaChart,
} from 'recharts';
import { TrendingUp } from 'lucide-react';

export interface CompatibilityTrendPoint {
    month: string;           // 月份标签 (e.g., "1月", "2月")
    fullMonth: string;       // 完整日期 (e.g., "2024-01")
    score: number;           // 兼容性分数 (0-100)
    dimension?: {
        wuxing: number;      // 五行配合
        communication: number; // 沟通契合
        emotion: number;     // 情感共鸣
    };
    event?: string;          // 特殊事件提示
}

type CompatibilityTooltipProps = {
    active?: boolean;
    payload?: { payload: CompatibilityTrendPoint }[];
};

function CompatibilityTrendTooltip({ active, payload }: CompatibilityTooltipProps) {
    if (!active || !payload || !payload.length) return null;

    const point = payload[0].payload;
    return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
            <div className="font-medium text-foreground mb-1">{point.fullMonth}</div>
            <div className="text-lg font-bold text-accent">{point.score}分</div>
            {point.dimension && (
                <div className="mt-2 space-y-1 text-xs text-foreground-secondary">
                    <div>五行配合: {point.dimension.wuxing}</div>
                    <div>沟通契合: {point.dimension.communication}</div>
                    <div>情感共鸣: {point.dimension.emotion}</div>
                </div>
            )}
            {point.event && (
                <div className="mt-2 text-xs text-amber-500">⚡ {point.event}</div>
            )}
        </div>
    );
}

interface CompatibilityTrendChartProps {
    data: CompatibilityTrendPoint[];
    period: 6 | 12;
    onPeriodChange?: (period: 6 | 12) => void;
    height?: number;
}

export function CompatibilityTrendChart({
    data,
    period,
    onPeriodChange,
    height = 280,
}: CompatibilityTrendChartProps) {
    // 计算平均分
    const averageScore = Math.round(
        data.reduce((sum, d) => sum + d.score, 0) / data.length
    );

    // 找出最高和最低点
    const maxPoint = data.reduce((max, d) => (d.score > max.score ? d : max), data[0]);
    const minPoint = data.reduce((min, d) => (d.score < min.score ? d : min), data[0]);

    // 计算趋势（正向、负向、平稳）
    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));
    const firstAvg = firstHalf.reduce((sum, d) => sum + d.score, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, d) => sum + d.score, 0) / secondHalf.length;
    const trend = secondAvg - firstAvg > 3 ? 'up' : secondAvg - firstAvg < -3 ? 'down' : 'stable';

    const trendText = trend === 'up' ? '整体呈上升趋势' : trend === 'down' ? '整体呈下降趋势' : '整体较为平稳';
    const trendColor = trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-amber-500';

    return (
        <div className="bg-background-secondary rounded-xl p-4 border border-border">
            {/* 标题和时间选择 */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-accent" />
                    兼容性走势
                </h3>
                {onPeriodChange && (
                    <div className="flex items-center bg-background rounded-lg p-1">
                        <button
                            onClick={() => onPeriodChange(6)}
                            className={`px-3 py-1 text-xs rounded-md transition-all ${
                                period === 6
                                    ? 'bg-accent text-white'
                                    : 'text-foreground-secondary hover:text-foreground'
                            }`}
                        >
                            半年
                        </button>
                        <button
                            onClick={() => onPeriodChange(12)}
                            className={`px-3 py-1 text-xs rounded-md transition-all ${
                                period === 12
                                    ? 'bg-accent text-white'
                                    : 'text-foreground-secondary hover:text-foreground'
                            }`}
                        >
                            一年
                        </button>
                    </div>
                )}
            </div>

            {/* 趋势概要 */}
            <div className="grid grid-cols-3 gap-4 mb-4 text-center">
                <div className="bg-background rounded-lg p-2">
                    <div className="text-xs text-foreground-secondary">平均分</div>
                    <div className="text-lg font-bold text-accent">{averageScore}</div>
                </div>
                <div className="bg-background rounded-lg p-2">
                    <div className="text-xs text-foreground-secondary">最高点</div>
                    <div className="text-lg font-bold text-green-500">{maxPoint?.score}</div>
                    <div className="text-xs text-foreground-secondary">{maxPoint?.month}</div>
                </div>
                <div className="bg-background rounded-lg p-2">
                    <div className="text-xs text-foreground-secondary">最低点</div>
                    <div className="text-lg font-bold text-red-500">{minPoint?.score}</div>
                    <div className="text-xs text-foreground-secondary">{minPoint?.month}</div>
                </div>
            </div>

            {/* 趋势描述 */}
            <div className="text-center text-sm mb-4">
                <span className="text-foreground-secondary">未来{period}个月</span>
                <span className={`ml-1 font-medium ${trendColor}`}>{trendText}</span>
            </div>

            {/* 图表 */}
            <ResponsiveContainer width="100%" height={height}>
                <AreaChart
                    data={data}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                    <defs>
                        <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="var(--border)"
                    />
                    <XAxis
                        dataKey="month"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: 'var(--foreground-secondary)' }}
                        interval={period === 12 ? 1 : 0}
                    />
                    <YAxis
                        domain={[30, 100]}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: 'var(--foreground-secondary)' }}
                        ticks={[40, 60, 80, 100]}
                    />
                    <Tooltip content={<CompatibilityTrendTooltip />} />
                    <ReferenceLine
                        y={averageScore}
                        stroke="#D4AF37"
                        strokeDasharray="5 5"
                        strokeOpacity={0.5}
                    />
                    <Area
                        type="monotone"
                        dataKey="score"
                        stroke="#D4AF37"
                        strokeWidth={2}
                        fill="url(#colorScore)"
                        activeDot={{
                            r: 6,
                            stroke: '#D4AF37',
                            strokeWidth: 2,
                            fill: 'var(--background)',
                        }}
                    />
                </AreaChart>
            </ResponsiveContainer>

            {/* 图例 */}
            <div className="flex items-center justify-center gap-6 mt-4 text-xs text-foreground-secondary">
                <div className="flex items-center gap-1">
                    <div className="w-3 h-0.5 bg-accent opacity-50" style={{ borderStyle: 'dashed' }} />
                    <span>平均线</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span>高峰期</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span>低谷期</span>
                </div>
            </div>
        </div>
    );
}
