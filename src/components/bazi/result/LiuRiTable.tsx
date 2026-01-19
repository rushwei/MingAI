import type { LiuRiInfo } from '@/lib/bazi';
import { getBranchElement, getElementColor, getStemElement } from '@/lib/bazi';

export function LiuRiTable({
    liuRi,
    selectedDate,
    onSelect,
}: {
    liuRi: LiuRiInfo[];
    selectedDate: string;
    onSelect: (date: string) => void;
}) {
    return (
        <div className="overflow-x-auto -mx-4 px-4">
            <div className="flex gap-1.5 min-w-max pb-2">
                {liuRi.map((ri) => {
                    const isSelected = ri.date === selectedDate;
                    const ganElement = getStemElement(ri.gan);
                    const zhiElement = getBranchElement(ri.zhi);

                    return (
                        <button
                            key={ri.date}
                            type="button"
                            onClick={() => onSelect(ri.date)}
                            className={`
                                flex-shrink-0 w-13 text-center p-1.5 rounded-lg border-2 transition-all
                                ${isSelected
                                    ? 'border-accent bg-accent/10'
                                    : 'border-transparent bg-background hover:bg-background-secondary'
                                }
                            `}
                        >
                            <div className="text-xs text-foreground-secondary">{ri.date.slice(5)}</div>
                            <div className="text-base font-semibold">{ri.day}</div>
                            <div className="flex justify-center gap-0.5 text-xs mt-0.5">
                                <span
                                    className="font-semibold"
                                    style={{ color: ganElement ? getElementColor(ganElement) : undefined }}
                                >
                                    {ri.gan}
                                </span>
                                <span
                                    className="font-semibold"
                                    style={{ color: zhiElement ? getElementColor(zhiElement) : undefined }}
                                >
                                    {ri.zhi}
                                </span>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
