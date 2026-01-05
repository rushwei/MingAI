import { Clock, Info } from 'lucide-react';
import type { BaziFormData } from '@/types';
import type { HourOption } from './options';

type UpdateField = <K extends keyof BaziFormData>(field: K, value: BaziFormData[K]) => void;

export function BirthTimeSection({
    formData,
    unknownTime,
    onToggleUnknownTime,
    onUpdate,
    hours,
}: {
    formData: BaziFormData;
    unknownTime: boolean;
    onToggleUnknownTime: () => void;
    onUpdate: UpdateField;
    hours: HourOption[];
}) {
    return (
        <div className="bg-background-secondary rounded-xl p-6 border border-border">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-accent" />
                出生时辰
            </h2>

            <div className="mb-4">
                <button
                    type="button"
                    onClick={onToggleUnknownTime}
                    className={`
                                w-full py-3 px-4 rounded-lg border text-sm transition-all duration-200
                                ${unknownTime
                            ? 'bg-amber-500/10 border-amber-500 text-amber-600'
                            : 'bg-background border-border hover:border-accent/50'
                        }
                            `}
                >
                    {unknownTime ? '✓ 已标记为不确定时辰' : '🤔 不确定出生时辰？'}
                </button>
            </div>

            {!unknownTime && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {hours.map(({ value, name, time }) => (
                        <button
                            key={value}
                            type="button"
                            onClick={() => onUpdate('birthHour', value)}
                            className={`
                                        py-2 px-3 rounded-lg border text-sm transition-all duration-200
                                        flex flex-col items-center
                                        ${formData.birthHour === value
                                    ? 'bg-accent/10 border-accent text-accent'
                                    : 'bg-background border-border hover:border-accent/50'
                                }
                                    `}
                        >
                            <span className="font-medium">{name}</span>
                            <span className="text-xs opacity-70">({time})</span>
                        </button>
                    ))}
                </div>
            )}

            <div className="mt-4 flex items-start gap-2 text-sm text-foreground-secondary">
                <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p>
                    {unknownTime
                        ? '时辰将以"*"标注，部分需要精确时辰的功能可能受限'
                        : '如果不确定具体时辰，点击上方按钮标记'}
                </p>
            </div>
        </div>
    );
}
