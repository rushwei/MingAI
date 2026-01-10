/**
 * 兼容性雷达图组件
 */
'use client';

import { type CompatibilityDimension, getCompatibilityLevel } from '@/lib/hepan';

interface CompatibilityChartProps {
    dimensions: CompatibilityDimension[];
    overallScore: number;
}

export function CompatibilityChart({ dimensions, overallScore }: CompatibilityChartProps) {
    const { level, color } = getCompatibilityLevel(overallScore);

    return (
        <div className="bg-background-secondary rounded-xl p-6">
            {/* 总分 */}
            <div className="text-center mb-6">
                <div className="relative inline-flex items-center justify-center">
                    <svg className="w-32 h-32 transform -rotate-90">
                        <circle
                            cx="64"
                            cy="64"
                            r="56"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="8"
                            className="text-background"
                        />
                        <circle
                            cx="64"
                            cy="64"
                            r="56"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="8"
                            strokeDasharray={`${overallScore * 3.52} 352`}
                            className="text-accent transition-all duration-1000"
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-bold text-foreground">{overallScore}</span>
                        <span className={`text-sm font-medium ${color}`}>{level}</span>
                    </div>
                </div>
                <p className="text-sm text-foreground-secondary mt-2">综合契合度</p>
            </div>

            {/* 维度列表 */}
            <div className="space-y-4">
                {dimensions.map((dim, index) => {
                    const { color: dimColor } = getCompatibilityLevel(dim.score);
                    return (
                        <div key={index}>
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-sm font-medium text-foreground">{dim.name}</span>
                                <span className={`text-sm font-semibold ${dimColor}`}>{dim.score}分</span>
                            </div>
                            <div className="h-2 bg-background rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-accent transition-all duration-500"
                                    style={{ width: `${dim.score}%` }}
                                />
                            </div>
                            <p className="text-xs text-foreground-secondary mt-1">{dim.description}</p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
