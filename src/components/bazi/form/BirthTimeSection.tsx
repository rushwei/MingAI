import { useEffect, useRef } from 'react';
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
        <div className="bg-background rounded-xl p-6">
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

            {/* 具体时间输入 - 仅当知道时辰时显示 */}
            {knowTime && (
                <div className="space-y-4 animate-fade-in">
                    {/* 精确时间输入框 */}
                    <div className="bg-background rounded-lg p-4 text-right flex flex-col items-end w-full max-w-xs ml-auto">
                        <label className="block text-sm font-medium mb-2">
                            精确出生时间
                        </label>
                        <div className="flex items-center justify-end">
                            <input
                                type="time"
                                value={formatTimeValue()}
                                onChange={handleTimeChange}
                                className="w-28 px-3 py-1.5 rounded-lg bg-background border border-transparent
                                    focus:outline-none focus:ring-2 focus:ring-accent/50
                                    transition-all duration-200 text-sm"
                            />
                        </div>
                        <p className="mt-2 text-xs text-foreground-secondary text-right">
                            输入精确的出生时间可获得更准确的命盘分析
                        </p>
                    </div>

                    {/* 时辰快捷选择 */}
                    <div>
                        <label className="block text-sm font-medium mb-2 text-foreground-secondary">
                            或选择时辰（快捷选择）
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {hours.map(({ value, name, time }) => (
                                <button
                                    key={value}
                                    type="button"
                                    onClick={() => {
                                        onUpdate('birthHour', value);
                                        // 选择时辰时默认分钟为0
                                        onUpdate('birthMinute', 0);
                                    }}
                                    className={`
                                        py-2 px-3 rounded-lg border text-sm transition-all duration-200
                                        flex flex-col items-center
                                        ${formData.birthHour === value && (formData.birthMinute || 0) === 0
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
                    </div>
                </div>
            )}

            {/* 提示信息 */}
            <div className="mt-4 flex items-start gap-2 text-sm text-foreground-secondary">
                <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p>
                    {knowTime
                        ? '输入精确时间或选择时辰以获得更精准的命盘分析'
                        : '不确定时辰时，部分需要精确时辰的功能可能受限'}
                </p>
            </div>
        </div>
    );
}
