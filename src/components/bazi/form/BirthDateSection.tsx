import { Calendar } from 'lucide-react';
import type { BaziFormData, CalendarType } from '@/types';

type UpdateField = <K extends keyof BaziFormData>(field: K, value: BaziFormData[K]) => void;

export function BirthDateSection({
    formData,
    onUpdate,
    years,
    months,
    days,
}: {
    formData: BaziFormData;
    onUpdate: UpdateField;
    years: number[];
    months: number[];
    days: number[];
}) {
    return (
        <div className="bg-background-secondary rounded-xl p-6 border border-border">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-accent" />
                出生日期
            </h2>

            <div className="mb-4">
                <label className="block text-sm font-medium mb-2">历法</label>
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
                    <label className="block text-sm font-medium mb-2">月</label>
                    <select
                        value={formData.birthMonth}
                        onChange={(e) => onUpdate('birthMonth', Number(e.target.value))}
                        className="w-full px-3 py-3 rounded-lg bg-background border border-border
                         focus:outline-none focus:ring-2 focus:ring-accent/50
                         transition-all duration-200"
                    >
                        {months.map((month) => (
                            <option key={month} value={month}>
                                {month}月
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-2">日</label>
                    <select
                        value={formData.birthDay}
                        onChange={(e) => onUpdate('birthDay', Number(e.target.value))}
                        className="w-full px-3 py-3 rounded-lg bg-background border border-border
                         focus:outline-none focus:ring-2 focus:ring-accent/50
                         transition-all duration-200"
                    >
                        {days.map((day) => (
                            <option key={day} value={day}>
                                {day}日
                            </option>
                        ))}
                    </select>
                </div>
            </div>
        </div>
    );
}
