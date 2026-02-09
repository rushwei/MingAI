import { useEffect, useRef } from 'react';
import { Clock, Info } from 'lucide-react';
import type { BaziFormData } from '@/types';
import type { HourOption } from '@/components/bazi/form/options';

type UpdateField = <K extends keyof BaziFormData>(field: K, value: BaziFormData[K]) => void;

export function BirthTimeSection({
    formData,
    unknownTime,
    onToggleUnknownTime,
    onUpdate,
    hours,
    autoFillTime,
}: {
    formData: BaziFormData;
    unknownTime: boolean;
    onToggleUnknownTime: () => void;
    onUpdate: UpdateField;
    hours: HourOption[];
    autoFillTime: boolean;
}) {
    // unknownTime = true 表示不知道时辰（默认状态）
    // unknownTime = false 表示知道时辰
    const knowTime = !unknownTime;
    const prevKnowTimeRef = useRef(knowTime);
    const autoFilledRef = useRef(false);

    useEffect(() => {
        if (!autoFillTime) {
            prevKnowTimeRef.current = knowTime;
            return;
        }

        if (!prevKnowTimeRef.current && knowTime) {
            const now = new Date();
            onUpdate('birthHour', now.getHours());
            onUpdate('birthMinute', now.getMinutes());
            autoFilledRef.current = true;
        }
        prevKnowTimeRef.current = knowTime;
    }, [autoFillTime, knowTime, onUpdate]);

    useEffect(() => {
        if (!autoFillTime || autoFilledRef.current) return;
        const now = new Date();
        onUpdate('birthHour', now.getHours());
        onUpdate('birthMinute', now.getMinutes());
        autoFilledRef.current = true;
    }, [autoFillTime, onUpdate]);

    // 处理时间输入变化
    const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const timeValue = e.target.value; // 格式 "HH:MM"
        if (timeValue) {
            const [hours, minutes] = timeValue.split(':').map(Number);
            onUpdate('birthHour', hours);
            onUpdate('birthMinute', minutes);
        }
    };

    // 格式化当前时间值
    const formatTimeValue = () => {
        const hour = String(formData.birthHour).padStart(2, '0');
        const minute = String(formData.birthMinute || 0).padStart(2, '0');
        return `${hour}:${minute}`;
    };

    return (
        <div className="bg-background rounded-xl p-6 shadow-sm border border-border/50">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Clock className="w-5 h-5 text-accent" />
                    出生时辰
                </h2>

                {/* 开关组件 */}
                <label className="flex items-center gap-3 cursor-pointer group">
                    <span className="text-sm font-medium text-foreground-secondary group-hover:text-foreground transition-colors">
                        {knowTime ? '已知时辰' : '不知时辰'}
                    </span>
                    <div
                        onClick={onToggleUnknownTime}
                        className={`
                            relative w-12 h-6 rounded-full transition-all duration-300 ease-out flex items-center
                            ${knowTime ? 'bg-accent' : 'bg-foreground-secondary/20'}
                        `}
                    >
                        <div
                            className={`
                                absolute w-5 h-5 bg-white rounded-full shadow-sm
                                transition-all duration-300 cubic-bezier(0.4, 0.0, 0.2, 1)
                                ${knowTime ? 'translate-x-6' : 'translate-x-0.5'}
                            `}
                        />
                    </div>
                </label>
            </div>

            {/* 具体时间输入 - 仅当知道时辰时显示 */}
            {knowTime && (
                <div className="space-y-6 animate-fade-in-up">
                    {/* 精确时间输入框 */}
                    <div className="flex items-center gap-4 bg-background-secondary/30 p-4 rounded-xl border border-border/50">
                        <label className="text-sm font-medium whitespace-nowrap text-foreground-secondary">
                            精确时间
                        </label>
                        <input
                            type="time"
                            value={formatTimeValue()}
                            onChange={handleTimeChange}
                            className="flex-1 bg-background border border-border rounded-lg px-4 py-2 text-center font-mono text-lg
                                focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent
                                transition-all duration-200"
                        />
                    </div>

                    {/* 时辰快捷选择 */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <label className="text-sm font-medium text-foreground-secondary">
                                快捷选择时辰
                            </label>
                            <span className="text-xs text-foreground-tertiary">
                                点击选择将自动修正时间
                            </span>
                        </div>

                        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                            {hours.map(({ value, name, time }) => {
                                const isSelected = formData.birthHour === value && (formData.birthMinute || 0) === 0;
                                return (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => {
                                            onUpdate('birthHour', value);
                                            onUpdate('birthMinute', 0);
                                        }}
                                        className={`
                                            relative overflow-hidden
                                            py-2 px-1 rounded-lg border text-sm transition-all duration-200
                                            flex flex-col items-center justify-center gap-0.5
                                            ${isSelected
                                                ? 'bg-accent text-white border-accent shadow-md shadow-accent/20'
                                                : 'bg-background border-border hover:border-accent/50 hover:bg-background-secondary'
                                            }
                                        `}
                                    >
                                        <span className={`font-medium ${isSelected ? 'text-white' : ''}`}>
                                            {name}
                                        </span>
                                        <span className={`text-[10px] scale-90 ${isSelected ? 'text-white/80' : 'text-foreground-tertiary'}`}>
                                            {time}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* 提示信息 */}
            <div className={`
                mt-6 flex items-start gap-3 p-3 rounded-lg text-sm transition-colors duration-300
                ${knowTime ? 'bg-blue-50/50 text-blue-600/90' : 'bg-orange-50/50 text-orange-600/90'}
            `}>
                <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p className="leading-relaxed">
                    {knowTime
                        ? '建议输入精确到分钟的出生时间。如果记不清具体分钟，可以选择大概的时辰范围，系统将取该时辰的中间值进行排盘。'
                        : '如果不确定具体的出生时辰，您可以选择"不知道出生时辰"。在这种情况下，命盘分析将基于年月日信息进行，部分需要精确时辰的分析（如紫微斗数命宫位置）可能无法提供。'}
                </p>
            </div>
        </div>
    );
}
