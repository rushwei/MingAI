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
    // unknownTime = true 表示不知道时辰（默认状态）
    // unknownTime = false 表示知道时辰
    const knowTime = !unknownTime;

    return (
        <div className="bg-background-secondary rounded-xl p-6 border border-border">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-accent" />
                出生时辰
            </h2>

            {/* 真正的开关组件 */}
            <div className="mb-4">
                <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm font-medium">我知道出生时辰</span>
                    <div
                        onClick={onToggleUnknownTime}
                        className={`
                            relative w-14 h-7 rounded-full transition-all duration-300
                            ${knowTime ? 'bg-accent' : 'bg-foreground-secondary/30'}
                        `}
                    >
                        <div
                            className={`
                                absolute top-1 w-5 h-5 bg-white rounded-full shadow-md
                                transition-all duration-300 ease-in-out
                                ${knowTime ? 'left-8' : 'left-1'}
                            `}
                        />
                    </div>
                </label>
            </div>

            {/* 时辰选择区域 - 仅当知道时辰时显示 */}
            {knowTime && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 animate-fade-in">
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
                            <span className="text-xs opacity-70">{time}</span>
                        </button>
                    ))}
                </div>
            )}

            {/* 提示信息 */}
            <div className="mt-4 flex items-start gap-2 text-sm text-foreground-secondary">
                <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p>
                    {knowTime
                        ? '选择您的出生时辰以获得更精准的命盘分析'
                        : '不确定时辰时，部分需要精确时辰的功能可能受限'}
                </p>
            </div>
        </div>
    );
}
