/**
 * 紫微斗数结果页面
 */
'use client';

import { useMemo, useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Star, Loader2, ArrowLeft, Share2, Edit3, Save, Check, MapPinned, Clock, Plus, Minus } from 'lucide-react';
import { calculateZiwei, type ZiweiFormData } from '@/lib/ziwei';
import type { Gender, CalendarType } from '@/types';
import { ZiweiChartGrid } from '@/components/ziwei/ZiweiChartGrid';
import { ZiweiHoroscopePanel, type HoroscopeInfo, type HoroscopeHighlight } from '@/components/ziwei/ZiweiHoroscopePanel';
import { supabase } from '@/lib/supabase';

function ZiweiResultContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [loading, setLoading] = useState(false);
    const [notFound, setNotFound] = useState(false);
    const [chartFromDb, setChartFromDb] = useState<ZiweiFormData | null>(null);
    const [horoscopeHighlight, setHoroscopeHighlight] = useState<HoroscopeHighlight>({});
    const [horoscopeInfo, setHoroscopeInfo] = useState<HoroscopeInfo | undefined>(undefined);
    const [hourOffset, setHourOffset] = useState(0); // 时辰调整偏移

    const chartId = searchParams.get('chart');
    const hasFormParams = useMemo(() => {
        const params = ['name', 'gender', 'year', 'month', 'day', 'hour', 'calendar', 'leap', 'place'];
        return params.some((key) => searchParams.has(key));
    }, [searchParams]);

    // 编辑模式：优先使用 URL 参数，避免覆盖为数据库旧数据
    useEffect(() => {
        if (hasFormParams) {
            setChartFromDb(null);
            setSaved(false);
        }
    }, [hasFormParams]);

    // useEffect 在有 chartId 时加载已保存的命盘数据，避免手动刷新。
    useEffect(() => {
        if (!chartId || hasFormParams) return;

        setLoading(true);
        setNotFound(false);
        supabase
            .from('ziwei_charts')
            .select('*')
            .eq('id', chartId)
            .single()
            .then(({ data, error }) => {
                if (data && !error) {
                    const [year, month, day] = data.birth_date.split('-').map(Number);
                    const hasTime = Boolean(data.birth_time);
                    const [hour, minute] = (data.birth_time || '12:00').split(':').map(Number);
                    setChartFromDb({
                        name: data.name,
                        gender: (data.gender as Gender) || 'male',
                        birthYear: year,
                        birthMonth: month,
                        birthDay: day,
                        birthHour: hour || 12,
                        birthMinute: minute || 0,
                        calendarType: (data.calendar_type as CalendarType) || 'solar',
                        isLeapMonth: data.is_leap_month ?? false, // 加载闰月设置
                        birthPlace: data.birth_place || '',
                        isUnknownTime: !hasTime,
                    });
                    setSaved(true);
                } else {
                    setNotFound(true);
                }
                setLoading(false);
            });
    }, [chartId, hasFormParams]);

    // 从 URL 参数获取表单数据
    const formData: ZiweiFormData = useMemo(() => {
        const hourParam = searchParams.get('hour');
        const isUnknownTime = hourParam === '-1';
        return {
            name: searchParams.get('name') || '命主',
            gender: (searchParams.get('gender') as Gender) || 'male',
            birthYear: Number(searchParams.get('year')) || 1990,
            birthMonth: Number(searchParams.get('month')) || 1,
            birthDay: Number(searchParams.get('day')) || 1,
            birthHour: isUnknownTime ? 12 : (Number(hourParam) || 12),
            birthMinute: isUnknownTime ? 0 : (Number(searchParams.get('minute')) || 0),
            calendarType: (searchParams.get('calendar') as CalendarType) || 'solar',
            isLeapMonth: searchParams.get('leap') === '1', // 解析闰月参数
            birthPlace: searchParams.get('place') || '',
            isUnknownTime,
        };
    }, [searchParams]);
    const resolvedFormData = chartFromDb || formData;

    // 应用时辰偏移后的数据
    const adjustedFormData = useMemo(() => {
        if (hourOffset === 0 || resolvedFormData.isUnknownTime) return resolvedFormData;

        let adjustedHour = resolvedFormData.birthHour + hourOffset;
        let adjustedDay = resolvedFormData.birthDay;
        let adjustedMonth = resolvedFormData.birthMonth;
        let adjustedYear = resolvedFormData.birthYear;

        // 处理小时溢出（支持多次偏移）
        while (adjustedHour >= 24) {
            adjustedHour -= 24;
            adjustedDay += 1;
        }
        while (adjustedHour < 0) {
            adjustedHour += 24;
            adjustedDay -= 1;
        }

        // 简化处理：月份和年份溢出（支持多天偏移）
        let daysInMonth = new Date(adjustedYear, adjustedMonth, 0).getDate();
        while (adjustedDay > daysInMonth) {
            adjustedDay -= daysInMonth;
            adjustedMonth += 1;
            if (adjustedMonth > 12) {
                adjustedMonth = 1;
                adjustedYear += 1;
            }
            daysInMonth = new Date(adjustedYear, adjustedMonth, 0).getDate();
        }
        while (adjustedDay < 1) {
            adjustedMonth -= 1;
            if (adjustedMonth < 1) {
                adjustedMonth = 12;
                adjustedYear -= 1;
            }
            daysInMonth = new Date(adjustedYear, adjustedMonth, 0).getDate();
            adjustedDay += daysInMonth;
        }

        return {
            ...resolvedFormData,
            birthYear: adjustedYear,
            birthMonth: adjustedMonth,
            birthDay: adjustedDay,
            birthHour: adjustedHour,
        };
    }, [resolvedFormData, hourOffset]);

    const isUnknownTime = adjustedFormData.isUnknownTime ?? false;
    const timeText = isUnknownTime
        ? '时辰未知'
        : `${String(adjustedFormData.birthHour).padStart(2, '0')}:${String(adjustedFormData.birthMinute || 0).padStart(2, '0')}`;

    // 计算紫微命盘（使用调整后的数据）
    const chart = useMemo(() => {
        try {
            return calculateZiwei(adjustedFormData);
        } catch (error) {
            console.error('紫微排盘错误:', error);
            return null;
        }
    }, [adjustedFormData]);

    // 修改命盘
    const handleEdit = () => {
        const params = new URLSearchParams({
            name: resolvedFormData.name,
            gender: resolvedFormData.gender,
            year: String(resolvedFormData.birthYear),
            month: String(resolvedFormData.birthMonth),
            day: String(resolvedFormData.birthDay),
            hour: resolvedFormData.isUnknownTime ? '-1' : String(resolvedFormData.birthHour),
            minute: String(resolvedFormData.birthMinute || 0),
            calendar: resolvedFormData.calendarType,
        });
        // 保留闰月参数
        if (resolvedFormData.calendarType === 'lunar' && resolvedFormData.isLeapMonth) {
            params.set('leap', '1');
        }
        if (resolvedFormData.birthPlace) {
            params.set('place', resolvedFormData.birthPlace);
        }
        if (chartId) {
            params.set('chart', chartId);
        }
        router.push(`/ziwei?${params.toString()}`);
    };

    const handleSave = async () => {
        if (saving || !chart) return;

        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
            alert('请先登录后再保存命盘');
            router.push('/user');
            return;
        }

        setSaving(true);
        try {
            const chartPayload = { ...chart };
            delete (chartPayload as { rawAstrolabe?: unknown }).rawAstrolabe;
            const payload = {
                name: resolvedFormData.name,
                gender: resolvedFormData.gender,
                birth_date: `${resolvedFormData.birthYear}-${String(resolvedFormData.birthMonth).padStart(2, '0')}-${String(resolvedFormData.birthDay).padStart(2, '0')}`,
                birth_time: resolvedFormData.isUnknownTime
                    ? null
                    : `${String(resolvedFormData.birthHour).padStart(2, '0')}:${String(resolvedFormData.birthMinute || 0).padStart(2, '0')}`,
                calendar_type: resolvedFormData.calendarType,
                is_leap_month: resolvedFormData.isLeapMonth ?? false, // 保存闰月设置
                birth_place: resolvedFormData.birthPlace || null,
                chart_data: chartPayload,
            };
            let error = null;
            if (chartId) {
                const response = await fetch('/api/ziwei/charts/update', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${session.access_token}`,
                    },
                    body: JSON.stringify({ chartId, payload }),
                });
                if (!response.ok) {
                    const result = await response.json().catch(() => null);
                    throw new Error(result?.error || '更新失败');
                }
            } else {
                const { data: inserted, error: insertError } = await supabase
                    .from('ziwei_charts')
                    .insert({ ...payload, user_id: session.user.id })
                    .select('id')
                    .maybeSingle();
                error = insertError;
                if (inserted?.id) {
                    router.replace(`/ziwei/result?chart=${inserted.id}`);
                }
            }

            if (error) throw error;
            setSaved(true);
            setChartFromDb(resolvedFormData);
            if (chartId) {
                router.replace(`/ziwei/result?chart=${chartId}`);
            }
        } catch (error) {
            console.error('保存失败:', error);
            alert('保存失败，请重试');
        } finally {
            setSaving(false);
        }
    };

    // 分享
    const handleShare = async () => {
        const url = window.location.href;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `${resolvedFormData.name}的紫微命盘 - MingAI`,
                    text: `查看${resolvedFormData.name}的紫微斗数命盘`,
                    url,
                });
            } catch {
                // 用户取消
            }
        } else {
            await navigator.clipboard.writeText(url);
            alert('链接已复制到剪贴板');
        }
    };

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-8 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto" />
                <p className="mt-4 text-foreground-secondary">正在加载命盘...</p>
            </div>
        );
    }

    if (notFound) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-8 text-center">
                <p className="text-foreground-secondary">未找到该命盘，请返回重新选择</p>
                <Link href="/user/charts" className="mt-4 inline-block text-accent hover:underline">
                    返回我的命盘
                </Link>
            </div>
        );
    }

    if (!chart) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-8 text-center">
                <p className="text-foreground-secondary">命盘计算出错，请返回重新输入</p>
                <Link href="/ziwei" className="mt-4 inline-block text-accent hover:underline">
                    返回重新输入
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto px-4 py-6 animate-fade-in">
            {/* 头部操作栏 */}
            <div className="flex items-center justify-between mb-6">
                <Link
                    href={chartId ? '/user/charts' : '/ziwei'}
                    className="flex items-center gap-2 text-foreground-secondary hover:text-foreground transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    返回
                </Link>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleEdit}
                        disabled={saving}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-border hover:border-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-border"
                    >
                        <Edit3 className="w-4 h-4" />
                        修改
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || saved}
                        className={`
                            inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                            ${saved
                                ? 'bg-green-500/10 text-green-500 cursor-default'
                                : 'bg-accent text-white hover:bg-accent/90 disabled:opacity-50'
                            }
                        `}
                    >
                        {saved ? (
                            <><Check className="w-4 h-4" />已保存</>
                        ) : saving ? (
                            <><Loader2 className="w-4 h-4 animate-spin" />保存中</>
                        ) : (
                            <><Save className="w-4 h-4" />保存</>
                        )}
                    </button>
                    <button
                        onClick={handleShare}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-border hover:border-accent transition-colors"
                    >
                        <Share2 className="w-4 h-4" />
                        分享
                    </button>
                </div>
            </div>

            {/* 命主信息卡片 */}
            <div className="bg-gradient-to-r from-accent/10 via-accent/5 to-transparent rounded-2xl p-4 border border-accent/20 mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                        <Star className="w-6 h-6 text-accent" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h1 className="text-lg font-bold truncate">{resolvedFormData.name}</h1>
                        <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-sm text-foreground-secondary">
                            <span>{resolvedFormData.gender === 'male' ? '男' : '女'}</span>
                            <span>•</span>
                            <span>
                                {adjustedFormData.birthYear}年{adjustedFormData.birthMonth}月{adjustedFormData.birthDay}日
                            </span>
                        </div>
                        {/* 时辰调整区域 */}
                        <div className="flex items-center gap-2 mt-1">
                            <div className="flex items-center gap-1 text-sm">
                                <Clock className="w-4 h-4 text-foreground-secondary" />
                                <span className={hourOffset !== 0 ? 'text-accent font-medium' : ''}>{timeText}</span>
                                {hourOffset !== 0 && (
                                    <span className="text-xs text-accent">({hourOffset > 0 ? '+' : ''}{hourOffset}h)</span>
                                )}
                            </div>
                            {!isUnknownTime && (
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => setHourOffset(prev => prev - 1)}
                                        className="p-1 rounded hover:bg-accent/20 text-foreground-secondary hover:text-accent transition-colors"
                                        title="减少1小时"
                                    >
                                        <Minus className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setHourOffset(prev => prev + 1)}
                                        className="p-1 rounded hover:bg-accent/20 text-foreground-secondary hover:text-accent transition-colors"
                                        title="增加1小时"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </button>
                                    {hourOffset !== 0 && (
                                        <button
                                            onClick={() => setHourOffset(0)}
                                            className="text-xs text-foreground-secondary hover:text-accent ml-1"
                                        >
                                            重置
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                        {resolvedFormData.birthPlace && (
                            <div className="text-sm text-foreground-secondary mt-0.5">
                                <span className="inline-flex items-center gap-1">
                                    <MapPinned className="w-4 h-4 text-foreground-secondary" />
                                    {resolvedFormData.birthPlace}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <section className="bg-background-secondary rounded-xl p-4 border border-border overflow-x-hidden max-w-[500px] sm:max-w-none mx-auto">
                <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
                    <Star className="w-4 h-4 text-accent" />
                    紫微斗数命盘
                </h2>
                <ZiweiChartGrid chart={chart} horoscopeHighlight={horoscopeHighlight} horoscopeInfo={horoscopeInfo} />
            </section>

            {/* 运限分析 */}
            <section className="mt-4 max-w-[510px] sm:max-w-none mx-auto">
                <ZiweiHoroscopePanel
                    chart={chart}
                    onPalaceHighlight={setHoroscopeHighlight}
                    onHoroscopeChange={setHoroscopeInfo}
                />
            </section>

            <div className="mt-6 text-center text-sm text-foreground-secondary">
                <p>点击宫位可查看详细信息</p>
            </div>
        </div>
    );
}

export default function ZiweiResultPage() {
    return (
        <Suspense fallback={
            <div className="max-w-4xl mx-auto px-4 py-8 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto" />
                <p className="mt-4 text-foreground-secondary">正在排盘...</p>
            </div>
        }>
            <ZiweiResultContent />
        </Suspense>
    );
}
