import type { LiuYueInfo } from '@/lib/divination/bazi';
import { getBranchElement, getElementColor, getStemElement } from '@/lib/divination/bazi';

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
        <div className="overflow-x-auto sm:-mx-4 sm:px-4 scrollbar-hide">
            <div className="flex sm:gap-1.5 gap-1 min-w-max sm:pb-2">
                {liuYue.map((ly, index) => {
                    const isSelected = ly.month === selectedMonth;
                    const gan = ly.gan;
                    const zhi = ly.zhi;
                    const ganElement = getStemElement(gan);
                    const zhiElement = getBranchElement(zhi);


                    return (
                        <button
                            key={index}
                            type="button"
                            onClick={() => onSelect(ly.month)}
                            className={`
                                flex-shrink-0 w-9 sm:w-12 text-center sm:p-1.5 rounded-lg border-2 transition-all
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
