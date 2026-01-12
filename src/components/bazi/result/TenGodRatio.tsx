/**
 * 十神比例显示组件
 * 
 * 显示命盘中各个十神的数量和比例
 */
'use client';

import { useMemo } from 'react';
import { BarChart3 } from 'lucide-react';
import type { TenGod } from '@/types';

interface TenGodRatioProps {
    // 天干十神 (年、月、时)
    ganTenGods: (TenGod | '元男' | '元女')[];
    // 地支藏干十神 (所有藏干)
    zhiTenGods: TenGod[];
}

// 十神分类
const TEN_GOD_GROUPS = {
    '比劫': ['比肩', '劫财'],
    '食伤': ['食神', '伤官'],
    '财星': ['偏财', '正财'],
    '官杀': ['七杀', '正官'],
    '印星': ['偏印', '正印'],
};

// 十神颜色
const TEN_GOD_COLORS: Record<string, string> = {
    '比肩': 'bg-blue-500',
    '劫财': 'bg-blue-400',
    '食神': 'bg-green-500',
    '伤官': 'bg-green-400',
    '偏财': 'bg-yellow-500',
    '正财': 'bg-yellow-400',
    '七杀': 'bg-red-500',
    '正官': 'bg-red-400',
    '偏印': 'bg-purple-500',
    '正印': 'bg-purple-400',
};

const TEN_GOD_LIST: TenGod[] = [
    '比肩', '劫财', '食神', '伤官', '偏财',
    '正财', '七杀', '正官', '偏印', '正印'
];

export function TenGodRatio({ ganTenGods, zhiTenGods }: TenGodRatioProps) {
    // 计算十神统计
    const stats = useMemo(() => {
        const counts: Record<TenGod, number> = {} as Record<TenGod, number>;
        TEN_GOD_LIST.forEach(god => counts[god] = 0);

        // 统计天干十神
        ganTenGods.forEach(god => {
            if (god !== '元男' && god !== '元女' && TEN_GOD_LIST.includes(god)) {
                counts[god]++;
            }
        });

        // 统计地支藏干十神
        zhiTenGods.forEach(god => {
            if (TEN_GOD_LIST.includes(god)) {
                counts[god]++;
            }
        });

        const total = Object.values(counts).reduce((a, b) => a + b, 0);

        return {
            counts,
            total,
            percentages: Object.fromEntries(
                Object.entries(counts).map(([god, count]) => [
                    god,
                    total > 0 ? Math.round((count / total) * 100) : 0
                ])
            ) as Record<TenGod, number>,
        };
    }, [ganTenGods, zhiTenGods]);

    // 按分组统计
    const groupStats = useMemo(() => {
        return Object.entries(TEN_GOD_GROUPS).map(([group, gods]) => {
            const count = gods.reduce((sum, god) => sum + stats.counts[god as TenGod], 0);
            const percentage = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
            return { group, gods, count, percentage };
        });
    }, [stats]);

    const maxCount = Math.max(...Object.values(stats.counts), 1);

    return (
        <section className="bg-background-secondary rounded-xl border border-border overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
                <BarChart3 className="w-4 h-4 text-accent" />
                <h3 className="font-medium text-sm">十神比例</h3>
                <span className="text-xs text-foreground-secondary ml-auto">
                    共 {stats.total} 个十神
                </span>
            </div>

            <div className="p-4 space-y-4">
                {/* 分组统计 */}
                <div className="grid grid-cols-5 gap-2 text-center text-xs">
                    {groupStats.map(({ group, count, percentage }) => (
                        <div key={group} className="p-2 rounded-lg bg-background">
                            <div className="font-medium">{group}</div>
                            <div className="text-lg font-bold text-accent">{count}</div>
                            <div className="text-foreground-secondary">{percentage}%</div>
                        </div>
                    ))}
                </div>

                {/* 详细十神柱状图 */}
                <div className="space-y-1.5">
                    {TEN_GOD_LIST.map(god => {
                        const count = stats.counts[god];
                        const percentage = stats.percentages[god];
                        const barWidth = (count / maxCount) * 100;

                        return (
                            <div key={god} className="flex items-center gap-2 text-xs">
                                <span className="w-10 text-right text-foreground-secondary">{god}</span>
                                <div className="flex-1 h-4 bg-background rounded overflow-hidden">
                                    <div
                                        className={`h-full ${TEN_GOD_COLORS[god]} transition-all duration-300`}
                                        style={{ width: `${barWidth}%` }}
                                    />
                                </div>
                                <span className="w-6 text-right font-medium">{count}</span>
                                <span className="w-8 text-right text-foreground-secondary">{percentage}%</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
