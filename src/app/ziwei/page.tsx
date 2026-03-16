/**
 * 紫微斗数排盘输入页面
 *
 * 'use client' 标记说明：
 * - 页面包含表单交互，需要在客户端运行
 * - 使用 useState 管理表单状态
 */
'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LunarYear, Lunar, Solar } from 'lunar-javascript';
import { SoundWaveLoader } from '@/components/ui/SoundWaveLoader';
import type { BaziFormData, Gender, CalendarType } from '@/types';
import { UnifiedZiweiForm } from '@/components/bazi/form/UnifiedZiweiForm';
import { DEFAULT_BAZI_FORM_DATA } from '@/components/bazi/form/options';
import { clampDay } from '@/lib/date-utils';
import { FeatureGate } from '@/components/layout/FeatureGate';

const parseNumber = (value: string | null, fallback: number) => {
    if (value === null || value.trim() === '') {
        return fallback;
    }
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
    const place = searchParams.get('place');
    const leap = searchParams.get('leap');

    if (!name && !year) {
        return { ...DEFAULT_BAZI_FORM_DATA };
    }

    const isUnknownTime = hour === '-1';
    const birthYear = parseNumber(year, DEFAULT_BAZI_FORM_DATA.birthYear);
    const birthMonth = parseNumber(month, DEFAULT_BAZI_FORM_DATA.birthMonth);
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
        birthMinute: parseNumber(minute, DEFAULT_BAZI_FORM_DATA.birthMinute),
        calendarType: calendar === 'lunar' ? 'lunar' : 'solar',
        isLeapMonth: isLeapRequested && leapMonthOfYear === birthMonth,
        birthPlace: place || '',
    };
};

function ZiweiPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isSubmitting, setIsSubmitting] = useState(false);
    // Fix 12: 将 unknownTime 统一到 formData 中管理
    const [formData, setFormData] = useState<BaziFormData & { isUnknownTime?: boolean }>(() => {
        const initial = getInitialFormData(searchParams);
        const hourParam = searchParams.get('hour');
        return {
            ...initial,
            isUnknownTime: hourParam === null || hourParam === '-1',
        };
    });
    const unknownTime = formData.isUnknownTime ?? false;
    const setUnknownTime = (value: boolean | ((prev: boolean) => boolean)) => {
        setFormData(prev => ({
            ...prev,
            isUnknownTime: typeof value === 'function' ? value(prev.isUnknownTime ?? false) : value,
        }));
    };

    // 使用共享的 getDayCount 和 clampDay（Fix 13）

    // 更新表单字段（含历法切换与日期校准）
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
                        prev.birthMinute,
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
                    prev.birthMinute,
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

            if ((field === 'birthYear' || field === 'birthMonth' || field === 'isLeapMonth') && prev.calendarType) {
                next.birthDay = clampDay(
                    prev.calendarType,
                    field === 'birthYear' ? (value as number) : next.birthYear,
                    field === 'birthMonth' ? (value as number) : next.birthMonth,
                    next.birthDay,
                    field === 'isLeapMonth' ? (value as boolean) : next.isLeapMonth
                );
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

    // 提交表单
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const params = new URLSearchParams();
            const chartId = searchParams.get('chart');

            params.set('name', formData.name || '命主');
            params.set('gender', formData.gender || 'male');
            params.set('year', String(formData.birthYear));
            params.set('month', String(formData.birthMonth));
            params.set('day', String(formData.birthDay));
            params.set('hour', unknownTime ? '-1' : String(formData.birthHour));
            params.set('minute', unknownTime ? '0' : String(formData.birthMinute || 0));
            params.set('calendar', formData.calendarType || 'solar');
            if (formData.calendarType === 'lunar') {
                params.set('leap', formData.isLeapMonth ? '1' : '0');
            }
            params.set('place', formData.birthPlace || '');

            if (chartId) {
                params.set('chart', chartId);
            }

            router.push(`/ziwei/result?${params.toString()}`);
        } catch (error) {
            console.error('提交失败:', error);
        } finally {
            // Fix 11: 确保 isSubmitting 在 finally 中重置
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-xl mx-auto px-4 pt-8 animate-fade-in">
            {/* 页面标题 - 移动端隐藏（顶栏已显示） */}
            <div className="hidden md:block text-center mb-8">
                <h1 className="text-2xl lg:text-3xl font-bold text-foreground">紫微斗数排盘</h1>
                <p className="text-foreground-secondary mt-2">
                    请填写您的出生信息，我们将为您生成紫微斗数命盘
                </p>
            </div>

            <div className="space-y-6">
                <UnifiedZiweiForm
                    formData={formData}
                    onUpdate={updateField}
                    unknownTime={unknownTime}
                    onToggleUnknownTime={() => setUnknownTime((prev) => !prev)}
                    onSubmit={handleSubmit}
                    isSubmitting={isSubmitting}
                />

                {/* 提示信息 */}
                <p className="text-center text-xs text-foreground-secondary">
                    紫微斗数对出生时辰要求精确，请尽量选择准确的时辰以获得更准确的命盘
                </p>
            </div>
        </div>
    );
}

// 主导出组件 - 使用 Suspense 包装
export default function ZiweiPage() {
    return (
        <FeatureGate featureId="ziwei">
        <Suspense fallback={
            <SoundWaveLoader variant="block" text="加载中" />
        }>
            <ZiweiPageContent />
        </Suspense>
        </FeatureGate>
    );
}
