import { Calendar, RefreshCw } from 'lucide-react';
import { LunarMonth, LunarYear } from 'lunar-javascript';
import type { BaziFormData, CalendarType } from '@/types';
import { LUNAR_MONTH_NAMES, LUNAR_DAY_NAMES } from './options';

type UpdateField = <K extends keyof BaziFormData>(field: K, value: BaziFormData[K]) => void;

export function BirthDateSection({
    formData,
    onUpdate,
    years,
    months,
    onSetToday,
}: {
    formData: BaziFormData;
    onUpdate: UpdateField;
    years: number[];
    months: number[];
    onSetToday: () => void;
}) {
    const isLunar = formData.calendarType === 'lunar';

    // 获取当年的闰月（0 表示没有闰月）
    const leapMonthOfYear = isLunar ? LunarYear.fromYear(formData.birthYear).getLeapMonth() : 0;

    // 是否可以选择闰月（当年有闰月且当前月是闰月）
    const canSelectLeapMonth = isLunar && leapMonthOfYear > 0 && formData.birthMonth === leapMonthOfYear;

    const maxDays = (() => {
        if (isLunar) {
            try {
                const lunarMonth = formData.isLeapMonth
                    ? -Math.abs(formData.birthMonth)
                    : formData.birthMonth;
                return LunarMonth.fromYm(formData.birthYear, lunarMonth).getDayCount();
            } catch {
                return 30;
            }
        }
        return new Date(formData.birthYear, formData.birthMonth, 0).getDate();
    })();
    const dayOptions = Array.from({ length: maxDays }, (_, i) => i + 1);

    // 获取月份显示名称
    const getMonthLabel = (month: number) => {
        if (isLunar) {
            return LUNAR_MONTH_NAMES[month] || `${month}月`;
        }
        return `${month}月`;
    };

    // 获取日期显示名称
    const getDayLabel = (day: number) => {
        if (isLunar) {
            return LUNAR_DAY_NAMES[day] || `${day}日`;
        }
        return `${day}日`;
    };

    return (
        <div className="bg-background rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-accent" />
                    出生日期
                </h2>
                <button
                    type="button"
                    onClick={onSetToday}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border text-foreground-secondary hover:text-foreground hover:border-accent/60 transition-colors"
                >
                    <RefreshCw className="w-3.5 h-3.5" />
                    今天
                </button>
            </div>

            <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium">历法</label>
                    {/* <span className="text-xs text-foreground-secondary">
                        切换历法会自动换算日期
                    </span> */}
                </div>
                <div className="flex gap-4">
                    {[
                        { value: 'solar', label: '公历 (阳历)' },
                        { value: 'lunar', label: '农历 (阴历)' },
                    ].map(({ value, label }) => (
                        <button
                            key={value}
                            type="button"
                            onClick={() => onUpdate('calendarType', value as CalendarType)}
                            className={`
                                flex-1 py-2 px-4 rounded-lg border text-sm transition-all duration-200
                                ${formData.calendarType === value
                                    ? 'bg-accent/10 border-accent text-accent'
                                    : 'bg-background border-border hover:border-accent/50'
                                }
                            `}
                        >
                            {label}
                        </button>
                    ))}
                </div>
                {/* 闰月选择 - 仅当该年有闰月且当前月是闰月时显示 */}
                {canSelectLeapMonth && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-foreground-secondary">
                        <span>闰{LUNAR_MONTH_NAMES[leapMonthOfYear] || `${leapMonthOfYear}月`}</span>
                        <button
                            type="button"
                            onClick={() => onUpdate('isLeapMonth', !formData.isLeapMonth)}
                            className={`px-2 py-1 rounded-full border transition-colors ${formData.isLeapMonth
                                ? 'border-accent text-accent bg-accent/10'
                                : 'border-border hover:border-accent/60 hover:text-foreground'
                                }`}
                        >
                            {formData.isLeapMonth ? '是' : '否'}
                        </button>
                    </div>
                )}
                {isLunar && leapMonthOfYear > 0 && formData.birthMonth !== leapMonthOfYear && (
                    <div className="mt-3 text-xs text-foreground-secondary">
                        今年闰{LUNAR_MONTH_NAMES[leapMonthOfYear] || `${leapMonthOfYear}月`}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-3 gap-3">
                <div>
                    <label className="block text-sm font-medium mb-2">年</label>
                    <select
                        value={formData.birthYear}
                        onChange={(e) => onUpdate('birthYear', Number(e.target.value))}
                        className="w-full px-3 py-3 rounded-lg bg-background border border-border
                         focus:outline-none focus:ring-2 focus:ring-accent/50
                         transition-all duration-200"
                    >
                        {years.map((year) => (
                            <option key={year} value={year}>
                                {year}年
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-2">
                        {isLunar
                            ? `${formData.isLeapMonth ? '闰' : ''}月`
                            : '月'}
                    </label>
                    <select
                        value={formData.birthMonth}
                        onChange={(e) => onUpdate('birthMonth', Number(e.target.value))}
                        className="w-full px-3 py-3 rounded-lg bg-background border border-border
                         focus:outline-none focus:ring-2 focus:ring-accent/50
                         transition-all duration-200"
                    >
                        {months.map((month) => (
                            <option key={month} value={month}>
                                {getMonthLabel(month)}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-2">
                        {isLunar ? '日' : '日'}
                    </label>
                    <select
                        value={formData.birthDay}
                        onChange={(e) => onUpdate('birthDay', Number(e.target.value))}
                        className="w-full px-3 py-3 rounded-lg bg-background border border-border
                         focus:outline-none focus:ring-2 focus:ring-accent/50
                         transition-all duration-200"
                    >
                        {dayOptions.map((day) => (
                            <option key={day} value={day}>
                                {getDayLabel(day)}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
        </div>
    );
}
