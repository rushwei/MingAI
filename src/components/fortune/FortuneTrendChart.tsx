/**
 * 运势趋势图组件
 *
 * 使用 Recharts 展示运势趋势变化
 */
'use client';

import React, { useState, useMemo } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceDot,
    Legend,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { FortuneScores } from '@/lib/fortune';

// 运势维度类型
export type FortuneDimension = 'overall' | 'career' | 'love' | 'wealth' | 'health' | 'social';

// 单日趋势数据
export interface FortuneTrendDataPoint {
    date: string;          // 'MM-DD' 格式
    fullDate: string;      // 'YYYY-MM-DD' 格式
    dayOfMonth: number;
    scores: FortuneScores;
    isKeyDate?: boolean;   // 是否为关键日期
    keyDateType?: 'lucky' | 'warning' | 'turning' | 'peak' | 'valley';
    keyDateDesc?: string;  // 关键日期描述
}

interface FortuneTrendChartProps {
    /** 趋势数据数组 */
    data: FortuneTrendDataPoint[];
    /** 当前选中的日期（用于高亮） */
    selectedDate?: string;
    /** 点击日期的回调 */
    onDateClick?: (date: string) => void;
    /** 图表高度 */
    height?: number;
    /** 是否显示图例 */
    showLegend?: boolean;
    /** 是否显示多维度 */
    multiDimension?: boolean;
}

// 维度配置
const DIMENSION_CONFIG: Record<FortuneDimension, { label: string; color: string }> = {
    overall: { label: '综合', color: '#f59e0b' },
    career: { label: '事业', color: '#3b82f6' },
    love: { label: '感情', color: '#ec4899' },
    wealth: { label: '财运', color: '#22c55e' },
    health: { label: '健康', color: '#ef4444' },
    social: { label: '人际', color: '#8b5cf6' },
};

// 关键日期颜色
const KEY_DATE_COLORS: Record<string, string> = {
    lucky: '#22c55e',
    warning: '#ef4444',
    turning: '#f59e0b',
    peak: '#3b82f6',
    valley: '#9ca3af',
};

export function FortuneTrendChart({
    data,
    selectedDate,
    onDateClick,
    height = 250,
    showLegend = false,
    multiDimension = false,
}: FortuneTrendChartProps) {
    const [activeDimensions, setActiveDimensions] = useState<FortuneDimension[]>(
        multiDimension ? ['overall', 'career', 'wealth'] : ['overall']
    );

    // 转换数据为 Recharts 格式
    const chartData = useMemo(() => {
        return data.map((point) => ({
            date: point.date,
            fullDate: point.fullDate,
            dayOfMonth: point.dayOfMonth,
            overall: point.scores.overall,
            career: point.scores.career,
            love: point.scores.love,
            wealth: point.scores.wealth,
            health: point.scores.health,
            social: point.scores.social,
            isKeyDate: point.isKeyDate,
            keyDateType: point.keyDateType,
            keyDateDesc: point.keyDateDesc,
        }));
    }, [data]);

    // 识别关键日期点
    const keyDatePoints = useMemo(() => {
        return chartData.filter((d) => d.isKeyDate);
    }, [chartData]);

    // 计算趋势（比较首尾）
    const trend = useMemo(() => {
        if (chartData.length < 2) return 'neutral';
        const first = chartData[0].overall;
        const last = chartData[chartData.length - 1].overall;
        const diff = last - first;
        if (diff > 5) return 'up';
        if (diff < -5) return 'down';
        return 'neutral';
    }, [chartData]);

    // 切换维度
    const toggleDimension = (dim: FortuneDimension) => {
        if (!multiDimension) {
            setActiveDimensions([dim]);
            return;
        }
        setActiveDimensions((prev) => {
            if (prev.includes(dim)) {
                if (prev.length === 1) return prev; // 至少保留一个
                return prev.filter((d) => d !== dim);
            }
            if (prev.length >= 3) {
                return [...prev.slice(1), dim]; // 最多3个
            }
            return [...prev, dim];
        });
    };

    // 自定义 Tooltip
    const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: unknown[]; label?: string }) => {
        if (!active || !payload || payload.length === 0) return null;

        const dataPoint = chartData.find((d) => d.date === label);

        return (
            <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
                <div className="text-sm font-medium mb-2">{dataPoint?.fullDate}</div>
                {(payload as { dataKey: FortuneDimension; value: number }[]).map((entry) => (
                    <div
                        key={entry.dataKey}
                        className="flex items-center gap-2 text-sm"
                    >
                        <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: DIMENSION_CONFIG[entry.dataKey].color }}
                        />
                        <span className="text-foreground-secondary">
                            {DIMENSION_CONFIG[entry.dataKey].label}:
                        </span>
                        <span className="font-medium">{entry.value}</span>
                    </div>
                ))}
                {dataPoint?.isKeyDate && (
                    <div className="mt-2 pt-2 border-t border-border text-xs">
                        <span
                            className="px-2 py-0.5 rounded-full text-white"
                            style={{ backgroundColor: KEY_DATE_COLORS[dataPoint.keyDateType || 'lucky'] }}
                        >
                            {dataPoint.keyDateDesc}
                        </span>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-4">
            {/* 趋势指示器和维度选择 */}
            <div className="flex items-center justify-between flex-wrap gap-2">
                {/* 趋势指示 */}
                <div className="flex items-center gap-2">
                    <span className="text-sm text-foreground-secondary">趋势:</span>
                    {trend === 'up' && (
                        <span className="flex items-center gap-1 text-green-500 text-sm">
                            <TrendingUp className="w-4 h-4" />
                            上升
                        </span>
                    )}
                    {trend === 'down' && (
                        <span className="flex items-center gap-1 text-red-500 text-sm">
                            <TrendingDown className="w-4 h-4" />
                            下降
                        </span>
                    )}
                    {trend === 'neutral' && (
                        <span className="flex items-center gap-1 text-foreground-secondary text-sm">
                            <Minus className="w-4 h-4" />
                            平稳
                        </span>
                    )}
                </div>

                {/* 维度选择器 */}
                <div className="flex items-center gap-1 flex-wrap">
                    {(Object.keys(DIMENSION_CONFIG) as FortuneDimension[]).map((dim) => (
                        <button
                            key={dim}
                            onClick={() => toggleDimension(dim)}
                            className={`px-2 py-1 text-xs rounded-full transition-colors ${
                                activeDimensions.includes(dim)
                                    ? 'text-white'
                                    : 'bg-background-secondary text-foreground-secondary hover:bg-background-tertiary'
                            }`}
                            style={{
                                backgroundColor: activeDimensions.includes(dim)
                                    ? DIMENSION_CONFIG[dim].color
                                    : undefined,
                            }}
                        >
                            {DIMENSION_CONFIG[dim].label}
                        </button>
                    ))}
                </div>
            </div>

            {/* 图表 */}
            <div className="bg-background-secondary rounded-xl p-4">
                <ResponsiveContainer width="100%" height={height}>
                    <LineChart
                        data={chartData}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                        onClick={(e) => {
                            // Recharts onClick provides activePayload at runtime
                            const payload = (e as { activePayload?: Array<{ payload?: { fullDate?: string } }> })?.activePayload?.[0]?.payload;
                            if (payload?.fullDate && onDateClick) {
                                onDateClick(payload.fullDate);
                            }
                        }}
                    >
                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="var(--color-border)"
                            opacity={0.5}
                        />
                        <XAxis
                            dataKey="date"
                            tick={{ fontSize: 11, fill: 'var(--color-foreground-secondary)' }}
                            tickLine={false}
                            axisLine={{ stroke: 'var(--color-border)' }}
                        />
                        <YAxis
                            domain={[30, 100]}
                            tick={{ fontSize: 11, fill: 'var(--color-foreground-secondary)' }}
                            tickLine={false}
                            axisLine={false}
                            tickCount={5}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        {showLegend && <Legend />}

                        {/* 绘制活跃的维度线 */}
                        {activeDimensions.map((dim) => (
                            <Line
                                key={dim}
                                type="monotone"
                                dataKey={dim}
                                stroke={DIMENSION_CONFIG[dim].color}
                                strokeWidth={dim === 'overall' ? 2.5 : 2}
                                dot={false}
                                activeDot={{
                                    r: 5,
                                    fill: DIMENSION_CONFIG[dim].color,
                                    stroke: 'var(--color-background)',
                                    strokeWidth: 2,
                                }}
                            />
                        ))}

                        {/* 标记关键日期点 */}
                        {keyDatePoints.map((point, idx) => (
                            <ReferenceDot
                                key={idx}
                                x={point.date}
                                y={point.overall}
                                r={6}
                                fill={KEY_DATE_COLORS[point.keyDateType || 'lucky']}
                                stroke="var(--color-background)"
                                strokeWidth={2}
                            />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* 关键日期图例 */}
            {keyDatePoints.length > 0 && (
                <div className="flex items-center gap-4 flex-wrap text-xs">
                    <span className="text-foreground-secondary">关键日期:</span>
                    {keyDatePoints.slice(0, 5).map((point, idx) => (
                        <div
                            key={idx}
                            className="flex items-center gap-1"
                        >
                            <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: KEY_DATE_COLORS[point.keyDateType || 'lucky'] }}
                            />
                            <span className="text-foreground-secondary">
                                {point.dayOfMonth}日 - {point.keyDateDesc}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
