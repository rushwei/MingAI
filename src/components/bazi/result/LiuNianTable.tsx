import type { LiuNianInfo } from '@/lib/bazi';
import { getBranchElement, getElementColor, getStemElement } from '@/lib/bazi';

export function LiuNianTable({
    liuNian,
    selectedYear,
    onSelect,
}: {
    liuNian: LiuNianInfo[];
    selectedYear: number;
    onSelect: (year: number) => void;
}) {
    return (
        <div className="overflow-x-auto -mx-4 px-4">
            <div className="flex gap-2 min-w-max pb-2">
                {liuNian.map((ln, index) => {
                    const isSelected = selectedYear === ln.year;
                    const ganElement = getStemElement(ln.gan);
                    const zhiElement = getBranchElement(ln.zhi);

                    return (
                        <button
                            key={index}
                            onClick={() => onSelect(ln.year)}
                            className={`
                                flex-shrink-0 w-12 sm:w-14 text-center p-1.5 sm:p-2 rounded-lg border-2 transition-all
                                ${isSelected
                                    ? 'border-accent bg-accent/10'
                                    : 'border-transparent bg-background-secondary hover:bg-background'
                                }
                            `}
                        >
                            <div className="text-xs text-foreground-secondary">{ln.year}</div>
                            <div className="flex flex-col items-center mt-1">
                                <span
                                    className="text-sm sm:text-base font-bold"
                                    style={{ color: ganElement ? getElementColor(ganElement) : undefined }}
                                >
                                    {ln.gan}
                                </span>
                                <span
                                    className="text-sm sm:text-base font-bold"
                                    style={{ color: zhiElement ? getElementColor(zhiElement) : undefined }}
                                >
                                    {ln.zhi}
                                </span>
                            </div>
                            <div className="text-xs text-foreground-secondary">{ln.age}岁</div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
