import type { FiveElement } from '@/types';
import { getElementColor } from '@/lib/bazi';

export function FiveElementsChart({ elements }: { elements: Record<FiveElement, number> }) {
    const maxValue = Math.max(...Object.values(elements));
    const elementOrder: FiveElement[] = ['木', '火', '土', '金', '水'];

    return (
        <div className="grid grid-cols-5 gap-2">
            {elementOrder.map((element) => {
                const value = elements[element];
                const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
                const color = getElementColor(element);

                return (
                    <div key={element} className="text-center">
                        <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold mx-auto mb-1"
                            style={{ backgroundColor: color }}
                        >
                            {element}
                        </div>
                        <div className="text-xs text-foreground-secondary">{value}</div>
                        <div className="h-1 bg-background rounded-full overflow-hidden mt-1">
                            <div
                                className="h-full transition-all duration-500 rounded-full"
                                style={{ width: `${percentage}%`, backgroundColor: color }}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
