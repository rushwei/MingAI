/**
 * 紫微斗数结果页面
 */
'use client';

import { useMemo, useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Star, Loader2, ArrowLeft, Share2, Edit3, Save, Check } from 'lucide-react';
import { calculateZiwei, type ZiweiFormData } from '@/lib/ziwei';
import type { Gender, CalendarType } from '@/types';
import { ZiweiChartGrid } from '@/components/ziwei/ZiweiChartGrid';
import { ZiweiHoroscopePanel, type HoroscopeInfo } from '@/components/ziwei/ZiweiHoroscopePanel';
import { supabase } from '@/lib/supabase';

function ZiweiResultContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [loading, setLoading] = useState(false);
    const [notFound, setNotFound] = useState(false);
    const [chartFromDb, setChartFromDb] = useState<ZiweiFormData | null>(null);
    const [highlightedPalaces, setHighlightedPalaces] = useState<number[]>([]);
    const [horoscopeInfo, setHoroscopeInfo] = useState<HoroscopeInfo | undefined>(undefined);

    const chartId = searchParams.get('chart');

    // useEffect 在有 chartId 时加载已保存的命盘数据，避免手动刷新。
    useEffect(() => {
        if (!chartId) return;

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
                    const [hour] = (data.birth_time || '12:00').split(':').map(Number);
                    setChartFromDb({
                        name: data.name,
                        gender: (data.gender as Gender) || 'male',
                        birthYear: year,
                        birthMonth: month,
                        birthDay: day,
                        birthHour: hour || 12,
                        calendarType: (data.calendar_type as CalendarType) || 'solar',
                        isLeapMonth: data.is_leap_month ?? false, // 加载闰月设置
                        birthPlace: data.birth_place || '',
                    });
                    setSaved(true);
                } else {
                    setNotFound(true);
                }
                setLoading(false);
            });
    }, [chartId]);

    // 从 URL 参数获取表单数据
    const formData: ZiweiFormData = useMemo(() => ({
        name: searchParams.get('name') || '命主',
        gender: (searchParams.get('gender') as Gender) || 'male',
        birthYear: Number(searchParams.get('year')) || 1990,
        birthMonth: Number(searchParams.get('month')) || 1,
        birthDay: Number(searchParams.get('day')) || 1,
        birthHour: Number(searchParams.get('hour')) || 12,
        calendarType: (searchParams.get('calendar') as CalendarType) || 'solar',
        isLeapMonth: searchParams.get('leap') === '1', // 解析闰月参数
        birthPlace: searchParams.get('place') || '',
    }), [searchParams]);
    const resolvedFormData = chartFromDb || formData;

    // 计算紫微命盘
    const chart = useMemo(() => {
        try {
            return calculateZiwei(resolvedFormData);
        } catch (error) {
            console.error('紫微排盘错误:', error);
            return null;
        }
    }, [resolvedFormData]);

    // 修改命盘
    const handleEdit = () => {
        const params = new URLSearchParams({
            name: resolvedFormData.name,
            gender: resolvedFormData.gender,
            year: String(resolvedFormData.birthYear),
            month: String(resolvedFormData.birthMonth),
            day: String(resolvedFormData.birthDay),
            hour: String(resolvedFormData.birthHour),
            calendar: resolvedFormData.calendarType,
        });
        // 保留闰月参数
        if (resolvedFormData.calendarType === 'lunar' && resolvedFormData.isLeapMonth) {
            params.set('leap', '1');
        }
        if (resolvedFormData.birthPlace) {
            params.set('place', resolvedFormData.birthPlace);
        }
        router.push(`/ziwei?${params.toString()}`);
    };

    const handleSave = async () => {
        if (saving || saved || !chart) return;

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
            const { error } = await supabase.from('ziwei_charts').insert({
                user_id: session.user.id,
                name: resolvedFormData.name,
                gender: resolvedFormData.gender,
                birth_date: `${resolvedFormData.birthYear}-${String(resolvedFormData.birthMonth).padStart(2, '0')}-${String(resolvedFormData.birthDay).padStart(2, '0')}`,
                birth_time: `${String(resolvedFormData.birthHour).padStart(2, '0')}:00`,
                calendar_type: resolvedFormData.calendarType,
                is_leap_month: resolvedFormData.isLeapMonth ?? false, // 保存闰月设置
                birth_place: resolvedFormData.birthPlace || null,
                chart_data: chartPayload,
            });

            if (error) throw error;
            setSaved(true);
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
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-border hover:border-accent transition-colors"
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
                                {resolvedFormData.birthYear}年{resolvedFormData.birthMonth}月{resolvedFormData.birthDay}日
                                {` ${String(resolvedFormData.birthHour).padStart(2, '0')}:00`}
                            </span>
                            <span>•</span>
                            <span>{chart.zodiac}{chart.sign}</span>
                        </div>
                    </div>
                </div>
            </div>

            <section className="bg-background-secondary rounded-xl p-4 border border-border">
                <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
                    <Star className="w-4 h-4 text-accent" />
                    紫微斗数命盘
                </h2>
                <ZiweiChartGrid chart={chart} highlightedPalaces={highlightedPalaces} horoscopeInfo={horoscopeInfo} />
            </section>

            {/* 运限分析 */}
            <section className="mt-4">
                <ZiweiHoroscopePanel
                    chart={chart}
                    onPalaceHighlight={setHighlightedPalaces}
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
