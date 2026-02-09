import { Calendar, RefreshCw } from 'lucide-react';
import { LunarMonth, LunarYear } from 'lunar-javascript';
import type { BaziFormData, CalendarType } from '@/types';
import { LUNAR_MONTH_NAMES, LUNAR_DAY_NAMES } from '@/components/bazi/form/options';

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
        <div className="bg-background rounded-xl p-6 shadow-sm border border-border/50">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-accent" />
                    出生日期
                </h2>
                <button
                    type="button"
                    onClick={onSetToday}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-background-secondary/50 hover:bg-background-secondary text-foreground-secondary hover:text-foreground transition-all duration-200 border border-transparent hover:border-border"
                >
                    <RefreshCw className="w-3.5 h-3.5" />
                    设为今天
                </button>
            </div>

            <div className="space-y-6">
                {/* 历法选择 */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <label className="text-sm font-medium text-foreground-secondary">选择历法</label>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        {[
                            { value: 'solar', label: '公历 (阳历)' },
                            { value: 'lunar', label: '农历 (阴历)' },
                        ].map(({ value, label }) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() => onUpdate('calendarType', value as CalendarType)}
                                className={`
                                    relative overflow-hidden
                                    py-2.5 px-4 rounded-xl border text-sm font-medium transition-all duration-200
                                    ${formData.calendarType === value
                                        ? 'bg-accent text-white border-accent shadow-md shadow-accent/20'
                                        : 'bg-background border-border hover:border-accent/50 hover:bg-background-secondary'
                                    }
                                `}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    {/* 闰月提示与选择 */}
                    {(canSelectLeapMonth || (isLunar && leapMonthOfYear > 0 && formData.birthMonth !== leapMonthOfYear)) && (
                        <div className="mt-3 flex items-center gap-3 p-2.5 bg-background-secondary/30 rounded-lg border border-border/30">
                            <div className="text-xs text-foreground-secondary flex-1">
                                {isLunar && leapMonthOfYear > 0 && (
                                    <span>今年闰{LUNAR_MONTH_NAMES[leapMonthOfYear] || `${leapMonthOfYear}月`}</span>
                                )}
                            </div>

                            {canSelectLeapMonth && (
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-foreground">是闰月?</span>
                                    <button
                                        type="button"
                                        onClick={() => onUpdate('isLeapMonth', !formData.isLeapMonth)}
                                        className={`
                                            relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-accent/50
                                            ${formData.isLeapMonth ? 'bg-accent' : 'bg-input'}
                                        `}
                                    >
                                        <span
                                            className={`
                                                inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform
                                                ${formData.isLeapMonth ? 'translate-x-4.5' : 'translate-x-1'}
                                            `}
                                        />
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* 日期选择 */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground-secondary">
                            年份
                        </label>
                        <div className="relative">
                            <select
                                value={formData.birthYear}
                                onChange={(e) => onUpdate('birthYear', Number(e.target.value))}
                                className="w-full px-3 py-2.5 rounded-lg bg-background border border-border
                                    focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent
                                    appearance-none transition-all duration-200"
                            >
                                {years.map((year) => (
                                    <option key={year} value={year}>{year}年</option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-foreground-tertiary">
                                <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                                    <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground-secondary">
                            {isLunar ? `${formData.isLeapMonth ? '闰' : ''}月份` : '月份'}
                        </label>
                        <div className="relative">
                            <select
                                value={formData.birthMonth}
                                onChange={(e) => onUpdate('birthMonth', Number(e.target.value))}
                                className="w-full px-3 py-2.5 rounded-lg bg-background border border-border
                                    focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent
                                    appearance-none transition-all duration-200"
                            >
                                {months.map((month) => (
                                    <option key={month} value={month}>
                                        {getMonthLabel(month)}
                                    </option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-foreground-tertiary">
                                <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                                    <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground-secondary">
                            日期
                        </label>
                        <div className="relative">
                            <select
                                value={formData.birthDay}
                                onChange={(e) => onUpdate('birthDay', Number(e.target.value))}
                                className="w-full px-3 py-2.5 rounded-lg bg-background border border-border
                                    focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent
                                    appearance-none transition-all duration-200"
                            >
                                {dayOptions.map((day) => (
                                    <option key={day} value={day}>
                                        {getDayLabel(day)}
                                    </option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-foreground-tertiary">
                                <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                                    <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
