import type { LiuYueInfo } from '@/lib/bazi';
import { getBranchElement, getElementColor, getStemElement } from '@/lib/bazi';

export function LiuYueTable({
    liuYue,
    selectedMonth,
    onSelect,
}: {
    liuYue: LiuYueInfo[];
    selectedMonth: number;
    onSelect: (month: number) => void;
}) {
    return (
        <div className="overflow-x-auto -mx-4 px-4">
            <div className="flex gap-1.5 min-w-max pb-2">
                {liuYue.map((ly, index) => {
                    const isSelected = ly.month === selectedMonth;
                    const gan = ly.ganZhi[0];
                    const zhi = ly.ganZhi[1];
                    const ganElement = getStemElement(gan);
                    const zhiElement = getBranchElement(zhi);


                    return (
                        <button
                            key={index}
                            type="button"
                            onClick={() => onSelect(ly.month)}
                            className={`
                                flex-shrink-0 w-16 text-center p-1.5 rounded-lg border-2 transition-all
                                ${isSelected
                                    ? 'border-accent bg-accent/10'
                                    : 'border-transparent bg-background hover:bg-background-secondary'
                                }
                            `}
                        >
                            <div className="text-xs text-foreground-secondary truncate">{ly.jieQi}</div>
                            <div className="flex justify-center w-full">
                                <span className="text-[12px] text-foreground-secondary whitespace-nowrap tracking-tighter">
                                    {Number(ly.startDate.split('-')[1])}.{Number(ly.startDate.split('-')[2])}
                                </span>
                            </div>
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
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
