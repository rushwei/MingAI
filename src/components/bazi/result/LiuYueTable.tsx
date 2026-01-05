import type { LiuYueInfo } from '@/lib/bazi';
import { getBranchElement, getElementColor, getStemElement } from '@/lib/bazi';

export function LiuYueTable({
    liuYue,
    currentMonth,
}: {
    liuYue: LiuYueInfo[];
    currentMonth: number;
}) {
    return (
        <div className="overflow-x-auto -mx-4 px-4">
            <div className="flex gap-1.5 min-w-max pb-2">
                {liuYue.map((ly, index) => {
                    const isCurrent = ly.month === currentMonth;
                    const gan = ly.ganZhi[0];
                    const zhi = ly.ganZhi[1];
                    const ganElement = getStemElement(gan);
                    const zhiElement = getBranchElement(zhi);

                    return (
                        <div
                            key={index}
                            className={`
                                flex-shrink-0 w-11 text-center p-1.5 rounded-lg border-2
                                ${isCurrent
                                    ? 'border-accent bg-accent/10'
                                    : 'border-transparent bg-background'
                                }
                            `}
                        >
                            <div className="text-xs text-foreground-secondary truncate">{ly.jieQi}</div>
                            <div className="flex flex-col items-center mt-0.5">
                                <span
                                    className="text-sm font-bold"
                                    style={{ color: ganElement ? getElementColor(ganElement) : undefined }}
                                >
                                    {gan}
                                </span>
                                <span
                                    className="text-sm font-bold"
                                    style={{ color: zhiElement ? getElementColor(zhiElement) : undefined }}
                                >
                                    {zhi}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
