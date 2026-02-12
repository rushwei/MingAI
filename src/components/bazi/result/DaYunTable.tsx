import type { DaYunInfo } from '@/lib/divination/bazi';
import { getBranchElement, getElementColor, getStemElement } from '@/lib/divination/bazi';

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
        <div className="overflow-x-auto sm:-mx-4 sm:px-4">
            <div className="flex sm:gap-2 gap-1 min-w-max sm:pb-2">
                {daYun.map((dy, index) => {
                    const isSelected = selectedIndex === index;
                    const ganElement = getStemElement(dy.gan);
                    const zhiElement = getBranchElement(dy.zhi);

                    return (
                        <button
                            key={index}
                            onClick={() => onSelect(index)}
                            className={`
                                flex-shrink-0 w-9.5 sm:w-16 text-center sm:p-2 rounded-lg border-2 transition-all
                                ${isSelected
                                    ? 'border-accent bg-accent/10'
                                    : 'border-transparent bg-background hover:bg-background'
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
