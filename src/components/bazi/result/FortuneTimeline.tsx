/**
 * 运势时间轴组件
 * 
 * 在八字四柱左侧显示当前的大运/流年/流月/流日
 */
'use client';

import { useMemo } from 'react';
import { getElementColor, STEM_ELEMENTS } from '@/lib/divination/bazi';
import type { HeavenlyStem } from '@/types';

interface FortuneTimelineProps {
    // 大运
    daYunGanZhi: string;
    daYunStartAge: number;
    // 流年
    liuNianGanZhi: string;
    liuNianYear: number;
    // 流月
    liuYueGanZhi?: string;
    liuYueMonth?: number;
    // 流日
    liuRiGanZhi?: string;
    liuRiDate?: string;
}

interface TimelineItem {
    label: string;
    ganZhi: string;
    subLabel: string;
}

function getStemColor(stem: string): string {
    const element = STEM_ELEMENTS[stem as HeavenlyStem];
    return element ? getElementColor(element) : 'inherit';
}

export function FortuneTimeline({
    daYunGanZhi,
    daYunStartAge,
    liuNianGanZhi,
    liuNianYear,
    liuYueGanZhi,
    liuYueMonth,
    liuRiGanZhi,
    liuRiDate,
}: FortuneTimelineProps) {
    const items = useMemo((): TimelineItem[] => {
        const result: TimelineItem[] = [
            { label: '大运', ganZhi: daYunGanZhi, subLabel: `${daYunStartAge}岁起` },
            { label: '流年', ganZhi: liuNianGanZhi, subLabel: `${liuNianYear}年` },
        ];

        if (liuYueGanZhi && liuYueMonth) {
            result.push({ label: '流月', ganZhi: liuYueGanZhi, subLabel: `${liuYueMonth}月` });
        }

        if (liuRiGanZhi && liuRiDate) {
            const date = new Date(liuRiDate);
            result.push({ label: '流日', ganZhi: liuRiGanZhi, subLabel: `${date.getDate()}日` });
        }

        return result;
    }, [daYunGanZhi, daYunStartAge, liuNianGanZhi, liuNianYear, liuYueGanZhi, liuYueMonth, liuRiGanZhi, liuRiDate]);

    return (
        <div className="flex flex-col gap-1.5 mr-2 border-r border-border pr-2">
            {items.map((item, idx) => {
                const gan = item.ganZhi.charAt(0);
                const zhi = item.ganZhi.charAt(1);

                return (
                    <div key={idx} className="text-center">
                        <div className="text-[10px] text-foreground-secondary/70 leading-none mb-0.5">
                            {item.label}
                        </div>
                        <div className="flex flex-col items-center">
                            <span
                                className="text-sm font-bold leading-tight"
                                style={{ color: getStemColor(gan) }}
                            >
                                {gan}
                            </span>
                            <span className="text-sm font-bold leading-tight text-foreground-secondary">
                                {zhi}
                            </span>
                        </div>
                        <div className="text-[9px] text-foreground-secondary/50 leading-none mt-0.5">
                            {item.subLabel}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
