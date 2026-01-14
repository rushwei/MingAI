/**
 * 紫微斗数排盘输入页面
 * 
 * 复用八字表单组件，保持 UI 一致性
 */
'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Sparkles } from 'lucide-react';
import { Lunar, Solar, LunarMonth, LunarYear } from 'lunar-javascript';
import type { BaziFormData, Gender, CalendarType } from '@/types';
import { BaziForm } from '@/components/bazi/form/BaziForm';
import { DEFAULT_BAZI_FORM_DATA } from '@/components/bazi/form/options';
import { LoginOverlay } from '@/components/auth/LoginOverlay';

const parseNumber = (value: string | null, fallback: number) => {
    if (value === null || value.trim() === '') return fallback;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? fallback : parsed;
};

const getInitialFormData = (searchParams: { get: (key: string) => string | null }): BaziFormData => {
    const name = searchParams.get('name');
    const gender = searchParams.get('gender') as Gender | null;
    const year = searchParams.get('year');
    const month = searchParams.get('month');
    const day = searchParams.get('day');
    const hour = searchParams.get('hour');
    const minute = searchParams.get('minute');
    const calendar = searchParams.get('calendar') as CalendarType | null;
    const leap = searchParams.get('leap');
    const place = searchParams.get('place');

    if (!name && !year) {
        return { ...DEFAULT_BAZI_FORM_DATA };
    }

    const birthYear = parseNumber(year, DEFAULT_BAZI_FORM_DATA.birthYear);
    const birthMonth = parseNumber(month, DEFAULT_BAZI_FORM_DATA.birthMonth);
    const isUnknownTime = hour === '-1';
    const isLeapRequested = calendar === 'lunar' && leap === '1';
    const leapMonthOfYear = calendar === 'lunar'
        ? LunarYear.fromYear(birthYear).getLeapMonth()
        : 0;

    return {
        name: name || '',
        gender: gender === 'female' ? 'female' : 'male',
        birthYear,
        birthMonth,
        birthDay: parseNumber(day, DEFAULT_BAZI_FORM_DATA.birthDay),
        birthHour: isUnknownTime ? DEFAULT_BAZI_FORM_DATA.birthHour : parseNumber(hour, DEFAULT_BAZI_FORM_DATA.birthHour),
        birthMinute: isUnknownTime ? DEFAULT_BAZI_FORM_DATA.birthMinute : parseNumber(minute, DEFAULT_BAZI_FORM_DATA.birthMinute),
        calendarType: calendar === 'lunar' ? 'lunar' : 'solar',
        isLeapMonth: isLeapRequested && leapMonthOfYear === birthMonth,
        birthPlace: place || '',
    };
};

function ZiweiPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isSubmitting, setIsSubmitting] = useState(false);
    // 紫微必须知道时辰，所以默认为 false
    const [unknownTime, setUnknownTime] = useState(() => {
        const hourParam = searchParams.get('hour');
        return hourParam === null || hourParam === '-1';
    });
    const autoFillTime = searchParams.get('hour') === null;
    const [formData, setFormData] = useState<BaziFormData>(() => getInitialFormData(searchParams));

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

    const clampDay = (calendarType: CalendarType, year: number, month: number, day: number, isLeapMonth?: boolean) => {
        const maxDay = getDayCount(calendarType, year, month, isLeapMonth);
        if (day < 1) return 1;
        if (day > maxDay) return maxDay;
        return day;
    };

    const updateField = <K extends keyof BaziFormData>(field: K, value: BaziFormData[K]) => {
        if (field === 'calendarType') {
            setFormData(prev => {
                if (value === prev.calendarType) return prev;

                if (value === 'lunar') {
                    const solar = Solar.fromYmdHms(
                        prev.birthYear,
                        prev.birthMonth,
                        prev.birthDay,
                        prev.birthHour,
                        0,
                        0
                    );
                    const lunar = solar.getLunar();
                    const lunarMonth = Math.abs(lunar.getMonth());
                    const isLeapMonth = lunar.getMonth() < 0;
                    const lunarDay = clampDay('lunar', lunar.getYear(), lunarMonth, lunar.getDay(), isLeapMonth);
                    return {
                        ...prev,
                        calendarType: 'lunar',
                        birthYear: lunar.getYear(),
                        birthMonth: lunarMonth,
                        birthDay: lunarDay,
                        isLeapMonth,
                    };
                }

                const lunar = Lunar.fromYmdHms(
                    prev.birthYear,
                    prev.isLeapMonth ? -Math.abs(prev.birthMonth) : prev.birthMonth,
                    clampDay('lunar', prev.birthYear, prev.birthMonth, prev.birthDay, prev.isLeapMonth),
                    prev.birthHour,
                    0,
                    0
                );
                const solar = lunar.getSolar();
                return {
                    ...prev,
                    calendarType: 'solar',
                    birthYear: solar.getYear(),
                    birthMonth: solar.getMonth(),
                    birthDay: clampDay('solar', solar.getYear(), solar.getMonth(), solar.getDay()),
                    isLeapMonth: false,
                };
            });
            return;
        }

        setFormData(prev => {
            const next = { ...prev, [field]: value };
            if (field === 'birthYear' || field === 'birthMonth' || field === 'birthDay' || field === 'isLeapMonth') {
                next.birthDay = clampDay(next.calendarType, next.birthYear, next.birthMonth, next.birthDay, next.isLeapMonth);
            }
            if (next.calendarType === 'lunar') {
                const leapMonth = LunarYear.fromYear(next.birthYear).getLeapMonth();
                if (next.isLeapMonth && leapMonth !== next.birthMonth) {
                    next.isLeapMonth = false;
                }
            } else {
                next.isLeapMonth = false;
            }
            return next;
        });
    };

    const handleSetToday = () => {
        const today = new Date();
        if (formData.calendarType === 'lunar') {
            const lunar = Solar.fromYmd(today.getFullYear(), today.getMonth() + 1, today.getDate()).getLunar();
            setFormData(prev => ({
                ...prev,
                birthYear: lunar.getYear(),
                birthMonth: Math.abs(lunar.getMonth()),
                birthDay: lunar.getDay(),
                isLeapMonth: lunar.getMonth() < 0,
            }));
            return;
        }

        setFormData(prev => ({
            ...prev,
            birthYear: today.getFullYear(),
            birthMonth: today.getMonth() + 1,
            birthDay: today.getDate(),
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        const params = new URLSearchParams({
            name: formData.name || '命主',
            gender: formData.gender,
            year: String(formData.birthYear),
            month: String(formData.birthMonth),
            day: String(formData.birthDay),
            hour: unknownTime ? '-1' : String(formData.birthHour),
            minute: unknownTime ? '0' : String(formData.birthMinute || 0),
            calendar: formData.calendarType,
        });
        const chartId = searchParams.get('chart');
        if (formData.calendarType === 'lunar') {
            params.set('leap', formData.isLeapMonth ? '1' : '0');
        }
        if (formData.birthPlace) {
            params.set('place', formData.birthPlace);
        }
        if (chartId) {
            params.set('chart', chartId);
        }

        router.push(`/ziwei/result?${params.toString()}`);
    };

    return (
        <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in">
            {/* 页面标题 */}
            <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-3">
                    <Sparkles className="w-12 h-12 text-purple-500" />
                </div>
                <h1 className="text-2xl lg:text-3xl font-bold text-foreground">紫微斗数排盘</h1>
                <p className="text-foreground-secondary mt-2">
                    请填写您的出生信息，我们将为您生成紫微斗数命盘
                </p>
            </div>

            <BaziForm
                formData={formData}
                onUpdate={updateField}
                unknownTime={unknownTime}
                onToggleUnknownTime={() => setUnknownTime(prev => !prev)}
                onSubmit={handleSubmit}
                onSetToday={handleSetToday}
                isSubmitting={isSubmitting}
                autoFillTime={autoFillTime}
            />

            {/* 提示信息 */}
            <p className="text-center text-sm text-foreground-secondary mt-6">
                紫微斗数对出生时辰要求精确，请尽量选择准确的时辰以获得更准确的命盘
            </p>
        </div>
    );
}

export default function ZiweiPage() {
    return (
        <LoginOverlay message="登录后使用紫微斗数排盘">
            <Suspense fallback={
                <div className="max-w-4xl mx-auto px-4 py-8 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto" />
                    <p className="mt-4 text-foreground-secondary">加载中...</p>
                </div>
            }>
                <ZiweiPageContent />
            </Suspense>
        </LoginOverlay>
    );
}
