/**
 * 八字排盘输入页面
 * 
 * 'use client' 标记说明：
 * - 页面包含表单交互，需要在客户端运行
 * - 使用 useState 管理表单状态
 */
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    Calendar,
    Clock,
    User,
    MapPin,
    Sparkles,
    ArrowRight,
    Info,
    Loader2
} from 'lucide-react';
import type { BaziFormData, Gender, CalendarType } from '@/types';

// 生成年份选项（1900-当前年份）
const currentYear = new Date().getFullYear();
const years = Array.from({ length: currentYear - 1900 + 1 }, (_, i) => currentYear - i);

// 月份选项
const months = Array.from({ length: 12 }, (_, i) => i + 1);

// 日期选项（简化，实际应根据月份动态调整）
const days = Array.from({ length: 31 }, (_, i) => i + 1);

// 时辰选项（十二时辰）
const hours = [
    { value: 0, name: '子时', time: '23:00-01:00' },
    { value: 1, name: '丑时', time: '01:00-03:00' },
    { value: 3, name: '寅时', time: '03:00-05:00' },
    { value: 5, name: '卯时', time: '05:00-07:00' },
    { value: 7, name: '辰时', time: '07:00-09:00' },
    { value: 9, name: '巳时', time: '09:00-11:00' },
    { value: 11, name: '午时', time: '11:00-13:00' },
    { value: 13, name: '未时', time: '13:00-15:00' },
    { value: 15, name: '申时', time: '15:00-17:00' },
    { value: 17, name: '酉时', time: '17:00-19:00' },
    { value: 19, name: '戌时', time: '19:00-21:00' },
    { value: 21, name: '亥时', time: '21:00-23:00' },
];

function BaziPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [unknownTime, setUnknownTime] = useState(false); // 不确定出生时间

    // 表单状态 - 初始从 URL 参数读取（用于修改已有命盘）
    const [formData, setFormData] = useState<Partial<BaziFormData>>({
        name: '',
        gender: 'male',
        birthYear: 1990,
        birthMonth: 1,
        birthDay: 1,
        birthHour: 12,
        birthMinute: 0,
        calendarType: 'solar',
        birthPlace: '',
    });

    // 从 URL 参数预填充表单
    useEffect(() => {
        const name = searchParams.get('name');
        const gender = searchParams.get('gender') as Gender;
        const year = searchParams.get('year');
        const month = searchParams.get('month');
        const day = searchParams.get('day');
        const hour = searchParams.get('hour');
        const minute = searchParams.get('minute');
        const calendar = searchParams.get('calendar') as CalendarType;
        const place = searchParams.get('place');

        // 如果有 URL 参数，则预填充
        if (name || year) {
            setFormData({
                name: name || '',
                gender: gender || 'male',
                birthYear: year ? Number(year) : 1990,
                birthMonth: month ? Number(month) : 1,
                birthDay: day ? Number(day) : 1,
                birthHour: hour ? Number(hour) : 12,
                birthMinute: minute ? Number(minute) : 0,
                calendarType: calendar || 'solar',
                birthPlace: place || '',
            });
        }
    }, [searchParams]);

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

            {/* 表单卡片 */}
            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 基本信息 */}
                <div className="bg-background-secondary rounded-xl p-6 border border-border">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <User className="w-5 h-5 text-accent" />
                        基本信息
                    </h2>

                    <div className="space-y-4">
                        {/* 姓名 */}
                        <div>
                            <label className="block text-sm font-medium mb-2">
                                姓名 <span className="text-foreground-secondary">(可选)</span>
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => updateField('name', e.target.value)}
                                placeholder="请输入姓名"
                                className="w-full px-4 py-3 rounded-lg bg-background border border-border
                         focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent
                         transition-all duration-200"
                            />
                        </div>

                        {/* 性别 */}
                        <div>
                            <label className="block text-sm font-medium mb-2">性别</label>
                            <div className="flex gap-4">
                                {[
                                    { value: 'male', label: '男', emoji: '👨' },
                                    { value: 'female', label: '女', emoji: '👩' },
                                ].map(({ value, label, emoji }) => (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => updateField('gender', value as Gender)}
                                        className={`
                      flex-1 py-3 px-4 rounded-lg border transition-all duration-200
                      ${formData.gender === value
                                                ? 'bg-accent/10 border-accent text-accent'
                                                : 'bg-background border-border hover:border-accent/50'
                                            }
                    `}
                                    >
                                        <span className="mr-2">{emoji}</span>
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 出生时间 */}
                <div className="bg-background-secondary rounded-xl p-6 border border-border">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-accent" />
                        出生日期
                    </h2>

                    {/* 历法选择 */}
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
                                    onClick={() => updateField('calendarType', value as CalendarType)}
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

                    {/* 日期选择器 */}
                    <div className="grid grid-cols-3 gap-3">
                        {/* 年 */}
                        <div>
                            <label className="block text-sm font-medium mb-2">年</label>
                            <select
                                value={formData.birthYear}
                                onChange={(e) => updateField('birthYear', Number(e.target.value))}
                                className="w-full px-3 py-3 rounded-lg bg-background border border-border
                         focus:outline-none focus:ring-2 focus:ring-accent/50
                         transition-all duration-200"
                            >
                                {years.map(year => (
                                    <option key={year} value={year}>{year}年</option>
                                ))}
                            </select>
                        </div>

                        {/* 月 */}
                        <div>
                            <label className="block text-sm font-medium mb-2">月</label>
                            <select
                                value={formData.birthMonth}
                                onChange={(e) => updateField('birthMonth', Number(e.target.value))}
                                className="w-full px-3 py-3 rounded-lg bg-background border border-border
                         focus:outline-none focus:ring-2 focus:ring-accent/50
                         transition-all duration-200"
                            >
                                {months.map(month => (
                                    <option key={month} value={month}>{month}月</option>
                                ))}
                            </select>
                        </div>

                        {/* 日 */}
                        <div>
                            <label className="block text-sm font-medium mb-2">日</label>
                            <select
                                value={formData.birthDay}
                                onChange={(e) => updateField('birthDay', Number(e.target.value))}
                                className="w-full px-3 py-3 rounded-lg bg-background border border-border
                         focus:outline-none focus:ring-2 focus:ring-accent/50
                         transition-all duration-200"
                            >
                                {days.map(day => (
                                    <option key={day} value={day}>{day}日</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* 出生时辰 */}
                <div className="bg-background-secondary rounded-xl p-6 border border-border">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-accent" />
                        出生时辰
                    </h2>

                    {/* 不确定时间按钮 */}
                    <div className="mb-4">
                        <button
                            type="button"
                            onClick={() => {
                                setUnknownTime(!unknownTime);
                            }}
                            className={`
                                w-full py-3 px-4 rounded-lg border text-sm transition-all duration-200
                                ${unknownTime
                                    ? 'bg-amber-500/10 border-amber-500 text-amber-600'
                                    : 'bg-background border-border hover:border-accent/50'
                                }
                            `}
                        >
                            {unknownTime ? '✓ 已标记为不确定时辰' : '🤔 不确定出生时辰？'}
                        </button>
                    </div>

                    {/* 时辰选择 - 不确定时隐藏 */}
                    {!unknownTime && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {hours.map(({ value, name, time }) => (
                                <button
                                    key={value}
                                    type="button"
                                    onClick={() => updateField('birthHour', value)}
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
                                    <span className="text-xs opacity-70">({time})</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* 提示 */}
                    <div className="mt-4 flex items-start gap-2 text-sm text-foreground-secondary">
                        <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <p>
                            {unknownTime
                                ? '时辰将以"*"标注，部分需要精确时辰的功能可能受限'
                                : '如果不确定具体时辰，点击上方按钮标记'}
                        </p>
                    </div>
                </div>

                {/* 出生地点（可选） */}
                <div className="bg-background-secondary rounded-xl p-6 border border-border">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-accent" />
                        出生地点 <span className="text-sm font-normal text-foreground-secondary">(可选)</span>
                    </h2>

                    <input
                        type="text"
                        value={formData.birthPlace}
                        onChange={(e) => updateField('birthPlace', e.target.value)}
                        placeholder="如：北京市、上海市、广州市"
                        className="w-full px-4 py-3 rounded-lg bg-background border border-border
                     focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent
                     transition-all duration-200"
                    />
                    <p className="mt-2 text-sm text-foreground-secondary">
                        提供出生地点可进行真太阳时校正，使排盘更加精准
                    </p>
                </div>

                {/* 提交按钮 */}
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="
            lg:col-span-2
            w-full py-4 rounded-xl font-semibold text-lg
            bg-accent text-white
            hover:bg-accent/90
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all duration-300
            shadow-lg shadow-accent/25
            hover:shadow-xl hover:shadow-accent/30
            hover:-translate-y-0.5
            flex items-center justify-center gap-2
          "
                >
                    {isSubmitting ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            正在排盘...
                        </>
                    ) : (
                        <>
                            开始八字精批
                            <ArrowRight className="w-5 h-5" />
                        </>
                    )}
                </button>

                {/* 免责声明 */}
                <p className="lg:col-span-2 text-center text-sm text-foreground-secondary">
                    命理分析仅供参考，不代表科学预测，请理性看待
                </p>
            </form>
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
