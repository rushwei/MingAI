/**
 * 统一紫微斗数表单组件
 *
 * 'use client' 标记说明：
 * - 使用 useState 管理表单状态和模态框
 * - 包含交互式输入和模态框
 */
'use client';

import { useState } from 'react';
import { Clock, MapPin, ChevronRight, Loader2 } from 'lucide-react';
import type { BaziFormData, CalendarType } from '@/types';
import { TimeInputModal } from './TimeInputModal';
import { PlaceInputModal } from './PlaceInputModal';
import { YEAR_OPTIONS, MONTH_OPTIONS, LUNAR_MONTH_NAMES } from './options';
import { LunarMonth, LunarYear } from 'lunar-javascript';

type UpdateField = <K extends keyof BaziFormData>(field: K, value: BaziFormData[K]) => void;

interface UnifiedZiweiFormProps {
    formData: BaziFormData;
    onUpdate: UpdateField;
    unknownTime: boolean;
    onToggleUnknownTime: () => void;
    onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
    isSubmitting: boolean;
}

export function UnifiedZiweiForm({
    formData,
    onUpdate,
    unknownTime,
    onToggleUnknownTime,
    onSubmit,
    isSubmitting,
}: UnifiedZiweiFormProps) {
    const [timeModalOpen, setTimeModalOpen] = useState(false);
    const [placeModalOpen, setPlaceModalOpen] = useState(false);

    // 计算当前月份的天数
    const getDayCount = (calendarType: CalendarType, year: number, month: number, isLeapMonth?: boolean) => {
        if (calendarType === 'lunar') {
            try {
                const lunarMonth = isLeapMonth ? -Math.abs(month) : month;
                return LunarMonth.fromYm(year, lunarMonth).getDayCount();
            } catch {
                return 30;
            }
        }
        return new Date(year, month, 0).getDate();
    };

    const dayCount = getDayCount(formData.calendarType, formData.birthYear, formData.birthMonth, formData.isLeapMonth);
    const dayOptions = Array.from({ length: dayCount }, (_, i) => i + 1);

    // 检查是否有闰月
    const leapMonth = formData.calendarType === 'lunar'
        ? LunarYear.fromYear(formData.birthYear).getLeapMonth()
        : 0;
    const hasLeapMonth = leapMonth === formData.birthMonth;

    return (
        <>
            <form onSubmit={onSubmit} className="bg-background rounded-xl p-6 shadow-sm border border-border/50 space-y-3 space-y-6">
                {/* 姓名输入 */}
                <div>
                    <label className="block text-xs text-sm font-medium text-foreground-secondary mb-1.5 mb-2">
                        姓名（可选）
                    </label>
                    <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => onUpdate('name', e.target.value)}
                        placeholder="请输入姓名"
                        className="w-full px-3 px-4 py-1.5 py-2 border border-border rounded-lg bg-background text-sm
                            focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent
                            transition-all duration-200"
                    />
                </div>

                {/* 性别和历法选择 - 同一行 */}
                <div className="grid grid-cols-2 gap-10 gap-20">
                    {/* 性别选择 */}
                    <div>
                        <label className="block text-xs text-sm font-medium text-foreground-secondary mb-1.5 mb-2">
                            性别
                        </label>
                        <div className="grid grid-cols-2 gap-1.5 gap-2">
                            <button
                                type="button"
                                onClick={() => onUpdate('gender', 'male')}
                                className={`py-1.5 py-2.5 px-1 px-2 rounded-lg border text-xs text-sm font-medium transition-all duration-200
                                    ${formData.gender === 'male'
                                        ? 'bg-accent text-white border-accent shadow-md'
                                        : 'bg-background border-border hover:border-accent/50'
                                    }`}
                            >
                                男
                            </button>
                            <button
                                type="button"
                                onClick={() => onUpdate('gender', 'female')}
                                className={`py-1.5 py-2.5 px-1 px-2 rounded-lg border text-xs text-sm font-medium transition-all duration-200
                                    ${formData.gender === 'female'
                                        ? 'bg-accent text-white border-accent shadow-md'
                                        : 'bg-background border-border hover:border-accent/50'
                                    }`}
                            >
                                女
                            </button>
                        </div>
                    </div>

                    {/* 历法选择（仅公历/农历） */}
                    <div>
                        <label className="block text-xs text-sm font-medium text-foreground-secondary mb-1.5 mb-2">
                            历法
                        </label>
                        <div className="grid grid-cols-2 gap-1.5 gap-2">
                            <button
                                type="button"
                                onClick={() => onUpdate('calendarType', 'solar')}
                                className={`py-1.5 py-2.5 px-1 px-2 rounded-lg border text-xs text-sm font-medium transition-all duration-200
                                    ${formData.calendarType === 'solar'
                                        ? 'bg-accent text-white border-accent shadow-md'
                                        : 'bg-background border-border hover:border-accent/50'
                                    }`}
                            >
                                公历
                            </button>
                            <button
                                type="button"
                                onClick={() => onUpdate('calendarType', 'lunar')}
                                className={`py-1.5 py-2.5 px-1 px-2 rounded-lg border text-xs text-sm font-medium transition-all duration-200
                                    ${formData.calendarType === 'lunar'
                                        ? 'bg-accent text-white border-accent shadow-md'
                                        : 'bg-background border-border hover:border-accent/50'
                                    }`}
                            >
                                农历
                            </button>
                        </div>
                    </div>
                </div>

                {/* 日期选择 */}
                <div className="space-y-2 space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs text-foreground-secondary mb-1">年</label>
                            <select
                                value={formData.birthYear}
                                onChange={(e) => onUpdate('birthYear', Number(e.target.value))}
                                className="w-full px-2 px-3 py-1.5 py-2 border border-border rounded-lg bg-background text-sm
                                    focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                            >
                                {YEAR_OPTIONS.map((year) => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-foreground-secondary mb-1">月</label>
                            <select
                                value={formData.birthMonth}
                                onChange={(e) => onUpdate('birthMonth', Number(e.target.value))}
                                className="w-full px-2 px-3 py-1.5 py-2 border border-border rounded-lg bg-background text-sm
                                    focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                            >
                                {MONTH_OPTIONS.map((month) => (
                                    <option key={month} value={month}>
                                        {formData.calendarType === 'lunar' ? LUNAR_MONTH_NAMES[month] : `${month}月`}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-foreground-secondary mb-1">日</label>
                            <select
                                value={formData.birthDay}
                                onChange={(e) => onUpdate('birthDay', Number(e.target.value))}
                                className="w-full px-2 px-3 py-1.5 py-2 border border-border rounded-lg bg-background text-sm
                                    focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                            >
                                {dayOptions.map((day) => (
                                    <option key={day} value={day}>{day}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* 闰月开关（仅农历） */}
                    {formData.calendarType === 'lunar' && hasLeapMonth && (
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.isLeapMonth}
                                onChange={(e) => onUpdate('isLeapMonth', e.target.checked)}
                                className="w-4 h-4 text-accent border-border rounded focus:ring-accent"
                            />
                            <span className="text-sm text-foreground-secondary">闰月</span>
                        </label>
                    )}
                </div>

                {/* 出生时间（点击打开模态框） */}
                <button
                    type="button"
                    onClick={() => setTimeModalOpen(true)}
                    className="w-full flex items-center justify-between p-3 p-4 border border-border rounded-lg
                        hover:border-accent/50 hover:bg-background-secondary transition-all duration-200"
                >
                    <div className="flex items-center gap-2 gap-3">
                        <Clock className="w-4 h-4 w-5 h-5 text-accent" />
                        <span className="text-xs text-sm font-medium">出生时间</span>
                        <span className="text-xs text-foreground-secondary">
                            {unknownTime
                                ? '不知时辰'
                                : `${String(formData.birthHour).padStart(2, '0')}:${String(formData.birthMinute).padStart(2, '0')}`
                            }
                        </span>
                    </div>
                    <ChevronRight className="w-4 h-4 w-5 h-5 text-foreground-secondary" />
                </button>

                {/* 出生地点（点击打开模态框） */}
                <button
                    type="button"
                    onClick={() => setPlaceModalOpen(true)}
                    className="w-full flex items-center justify-between p-3 p-4 border border-border rounded-lg
                        hover:border-accent/50 hover:bg-background-secondary transition-all duration-200"
                >
                    <div className="flex items-center gap-2 gap-3">
                        <MapPin className="w-4 h-4 w-5 h-5 text-accent" />
                        <span className="text-xs text-sm font-medium">出生地点</span>
                        <span className="text-xs text-foreground-secondary truncate">
                            {formData.birthPlace || '未设置（使用北京时间）'}
                        </span>
                    </div>
                    <ChevronRight className="w-4 h-4 w-5 h-5 text-foreground-secondary" />
                </button>

                {/* 提交按钮 */}
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2 py-3 bg-accent text-white rounded-lg text-sm text-base font-medium
                        hover:bg-accent/90 transition-all duration-200 hover:-translate-y-0.5
                        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0
                        flex items-center justify-center gap-2"
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="w-4 h-4 w-5 h-5 animate-spin" />
                            排盘中...
                        </>
                    ) : (
                        '开始排盘'
                    )}
                </button>

                {/* 免责声明 */}
                <p className="text-[10px] text-xs text-center text-foreground-tertiary">
                    紫微斗数排盘仅供参考，不构成任何建议
                </p>
            </form>

            {/* 时间输入模态框 */}
            <TimeInputModal
                isOpen={timeModalOpen}
                onClose={() => setTimeModalOpen(false)}
                formData={formData}
                unknownTime={unknownTime}
                onToggleUnknownTime={onToggleUnknownTime}
                onUpdate={onUpdate}
            />

            {/* 地点输入模态框 */}
            <PlaceInputModal
                isOpen={placeModalOpen}
                onClose={() => setPlaceModalOpen(false)}
                formData={formData}
                onUpdate={onUpdate}
            />
        </>
    );
}
