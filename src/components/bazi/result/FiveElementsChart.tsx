/**
 * 五行分析图表组件
 * 
 * 显示五行力量的可视化图表
 */
import { useMemo } from 'react';
import type { FiveElement } from '@/types';
import { getElementColor } from '@/lib/bazi';

const ELEMENT_ICONS: Record<FiveElement, string> = {
    '木': '🌳',
    '火': '🔥',
    '土': '⛰️',
    '金': '⚜️',
    '水': '💧',
};
const ELEMENT_ORDER: FiveElement[] = ['木', '火', '土', '金', '水'];

export function FiveElementsChart({ elements }: { elements: Record<FiveElement, number> }) {
    // 使用 useMemo 缓存计算结果，避免每次渲染重新计算
    const { maxValue, total } = useMemo(() => {
        const values = Object.values(elements);
        return {
            maxValue: Math.max(...values, 1),
            total: values.reduce((a, b) => a + b, 0)
        };
    }, [elements]);

    // 五行分析
    const analysis = useMemo(() => {
        const sorted = ELEMENT_ORDER
            .map(el => ({ element: el, count: elements[el] }))
            .sort((a, b) => b.count - a.count);

        const strongest = sorted.filter(s => s.count === sorted[0].count && s.count > 0);
        const weakest = sorted.filter(s => s.count === sorted[sorted.length - 1].count);
        const missing = sorted.filter(s => s.count === 0);

        return { strongest, weakest, missing };
    }, [elements]);

    return (
        <div className="space-y-3">
            <div className="grid grid-cols-5 gap-2">
                {ELEMENT_ORDER.map((element) => {
                    const value = elements[element];
                    const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                    const barHeight = maxValue > 0 ? (value / maxValue) * 100 : 0;
                    const color = getElementColor(element);

                    return (
                        <div key={element} className="text-center">
                            {/* 柱状图 */}
                            <div className="relative w-10 h-16 bg-background rounded mx-auto mb-1 overflow-hidden">
                                <div
                                    className="absolute bottom-0 left-0 right-0 transition-all duration-500 rounded-t"
                                    style={{ height: `${barHeight}%`, backgroundColor: color }}
                                />
                            </div>
                            {/* 图标和名称 */}
                            <div className="text-lg">{ELEMENT_ICONS[element]}</div>
                            <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold mx-auto"
                                style={{ backgroundColor: color }}
                            >
                                {element}
                            </div>
                            <div className="text-xs text-foreground-secondary mt-1">
                                {value}个 ({percentage}%)
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* 五行分析 */}
            <div className="text-xs space-y-1 pt-2 border-t border-border">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-foreground-secondary">五行最旺：</span>
                    {analysis.strongest.map(s => (
                        <span
                            key={s.element}
                            className="px-1.5 py-0.5 rounded text-white font-medium"
                            style={{ backgroundColor: getElementColor(s.element) }}
                        >
                            {s.element}({s.count})
                        </span>
                    ))}
                </div>
                {analysis.missing.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-foreground-secondary">五行缺失：</span>
                        {analysis.missing.map(s => (
                            <span key={s.element} className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-500">
                                缺{s.element}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
