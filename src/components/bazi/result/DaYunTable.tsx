import type { DaYunInfo } from '@/lib/bazi';
import { getBranchElement, getElementColor, getStemElement } from '@/lib/bazi';

export function DaYunTable({
    daYun,
    selectedIndex,
    onSelect,
}: {
    daYun: DaYunInfo[];
    selectedIndex: number;
    onSelect: (index: number) => void;
}) {
    return (
        <div className="overflow-x-auto -mx-4 px-4">
            <div className="flex gap-2 min-w-max pb-2">
                {daYun.map((dy, index) => {
                    const isSelected = selectedIndex === index;
                    const ganElement = getStemElement(dy.gan);
                    const zhiElement = getBranchElement(dy.zhi);

                    return (
                        <button
                            key={index}
                            onClick={() => onSelect(index)}
                            className={`
                                flex-shrink-0 w-14 sm:w-16 text-center p-2 rounded-lg border-2 transition-all
                                ${isSelected
                                    ? 'border-accent bg-accent/10'
                                    : 'border-transparent bg-background-secondary hover:bg-background'
                                }
                            `}
                        >
                            <div className="text-xs text-foreground-secondary">{dy.startYear}</div>
                            <div className="text-xs text-foreground-secondary">{dy.startAge}岁</div>
                            <div className="flex flex-col items-center mt-1">
                                <span
                                    className="text-base sm:text-lg font-bold"
                                    style={{ color: ganElement ? getElementColor(ganElement) : undefined }}
                                >
                                    {dy.gan}
                                </span>
                                <span
                                    className="text-base sm:text-lg font-bold"
                                    style={{ color: zhiElement ? getElementColor(zhiElement) : undefined }}
                                >
                                    {dy.zhi}
                                </span>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
