/**
 * 八字排盘输入页面
 * 
 * 'use client' 标记说明：
 * - 页面包含表单交互，需要在客户端运行
 * - 使用 useState 管理表单状态
 */
'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    Sparkles,
    Loader2
} from 'lucide-react';
import type { BaziFormData, Gender, CalendarType } from '@/types';
import { BaziForm } from '@/components/bazi/form/BaziForm';
import { DEFAULT_BAZI_FORM_DATA } from '@/components/bazi/form/options';

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

    if (!name && !year) {
        return { ...DEFAULT_BAZI_FORM_DATA };
    }

    const isUnknownTime = hour === '-1';

    return {
        name: name || '',
        gender: gender === 'female' ? 'female' : 'male',
        birthYear: parseNumber(year, DEFAULT_BAZI_FORM_DATA.birthYear),
        birthMonth: parseNumber(month, DEFAULT_BAZI_FORM_DATA.birthMonth),
        birthDay: parseNumber(day, DEFAULT_BAZI_FORM_DATA.birthDay),
        birthHour: isUnknownTime ? DEFAULT_BAZI_FORM_DATA.birthHour : parseNumber(hour, DEFAULT_BAZI_FORM_DATA.birthHour),
        birthMinute: parseNumber(minute, DEFAULT_BAZI_FORM_DATA.birthMinute),
        calendarType: calendar === 'lunar' ? 'lunar' : 'solar',
        birthPlace: place || '',
    };
};

function BaziPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [unknownTime, setUnknownTime] = useState(() => searchParams.get('hour') === '-1'); // 不确定出生时间

    // 表单状态 - 初始从 URL 参数读取（用于修改已有命盘）
    const [formData, setFormData] = useState<BaziFormData>(() => getInitialFormData(searchParams));

    // 更新表单字段
    const updateField = <K extends keyof BaziFormData>(field: K, value: BaziFormData[K]) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    // 提交表单
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const params = new URLSearchParams();
            params.set('name', formData.name || '');
            params.set('gender', formData.gender || 'male');
            params.set('year', String(formData.birthYear));
            params.set('month', String(formData.birthMonth));
            params.set('day', String(formData.birthDay));
            params.set('hour', unknownTime ? '-1' : String(formData.birthHour)); // -1 表示未知
            params.set('minute', String(formData.birthMinute || 0));
            params.set('calendar', formData.calendarType || 'solar');
            params.set('place', formData.birthPlace || '');

            router.push(`/bazi/result?${params.toString()}`);
        } catch (error) {
            console.error('提交失败:', error);
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in">
            {/* 页面标题 */}
            <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent/10 mb-4">
                    <Sparkles className="w-8 h-8 text-accent" />
                </div>
                <h1 className="text-2xl lg:text-3xl font-bold mb-2">AI 八字精批</h1>
                <p className="text-foreground-secondary">
                    请填写您的出生信息，我们将为您生成专业的八字命盘分析
                </p>
            </div>

            <BaziForm
                formData={formData}
                onUpdate={updateField}
                unknownTime={unknownTime}
                onToggleUnknownTime={() => setUnknownTime((prev) => !prev)}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
            />
        </div>
    );
}

// 主导出组件 - 使用 Suspense 包装
export default function BaziPage() {
    return (
        <Suspense fallback={
            <div className="max-w-4xl mx-auto px-4 py-8 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto" />
                <p className="mt-4 text-foreground-secondary">加载中...</p>
            </div>
        }>
            <BaziPageContent />
        </Suspense>
    );
}
