/**
 * 八字结果页面 - 专业排盘版
 * 支持：URL 参数传入 / 从数据库加载已保存命盘
 */
'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useMemo, useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import {
    calculateBazi,
    calculateProfessionalData,
    calculateLiuYue,
    calculateLiuRi,
    calculateShenSha,
    getDayMasterDescription,
} from '@/lib/bazi';
import { supabase } from '@/lib/supabase';
import type { BaziFormData, CalendarType, Gender } from '@/types';
import { ResultHeader } from '@/components/bazi/result/ResultHeader';
import { ProfileSummaryCard } from '@/components/bazi/result/ProfileSummaryCard';
import { ResultTabs, type ResultTab } from '@/components/bazi/result/ResultTabs';
import { BasicInfoSection } from '@/components/bazi/result/BasicInfoSection';
import { ProfessionalSection } from '@/components/bazi/result/ProfessionalSection';
import { ResultFooterLinks } from '@/components/bazi/result/ResultFooterLinks';

// 结果内容组件
function BaziResultContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    // useState 管理页面交互状态，确保切换与保存流程可控
    const [activeTab, setActiveTab] = useState<ResultTab>('professional');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [loading, setLoading] = useState(false);
    const [chartFromDb, setChartFromDb] = useState<BaziFormData | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [savedWuxingAnalysis, setSavedWuxingAnalysis] = useState<string | null>(null);
    const [savedPersonalityAnalysis, setSavedPersonalityAnalysis] = useState<string | null>(null);

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentDay = now.getDate();

    // 大运流年状态
    const [selectedDaYunIndex, setSelectedDaYunIndex] = useState<number>(0);
    const [selectedLiuNianYear, setSelectedLiuNianYear] = useState<number>(currentYear);
    // useState 保持流月/流日选择，驱动下方明细展示
    const [selectedLiuYueMonth, setSelectedLiuYueMonth] = useState<number>(-1);
    const [selectedLiuRiDate, setSelectedLiuRiDate] = useState<string>('');

    const chartId = searchParams.get('chart');
    const hasFormParams = useMemo(() => {
        const params = ['name', 'gender', 'year', 'month', 'day', 'hour', 'minute', 'calendar', 'leap', 'place'];
        return params.some((key) => searchParams.has(key));
    }, [searchParams]);

    // 编辑模式：优先使用 URL 参数，避免覆盖为数据库旧数据
    useEffect(() => {
        if (hasFormParams) {
            setChartFromDb(null);
            setSaved(false);
            setSavedWuxingAnalysis(null);
            setSavedPersonalityAnalysis(null);
        }
    }, [hasFormParams]);

    // 从数据库加载命盘（仅查看已保存命盘时）
    useEffect(() => {
        if (chartId && !hasFormParams) {
            setLoading(true);

            // 同时查询命盘数据和 AI 分析
            Promise.all([
                supabase
                    .from('bazi_charts')
                    .select('*')
                    .eq('id', chartId)
                    .single(),
                // 查询五行分析
                supabase
                    .from('conversations')
                    .select('messages')
                    .eq('bazi_chart_id', chartId)
                    .eq('source_type', 'bazi_wuxing')
                    .order('created_at', { ascending: false })
                    .limit(1),
                // 查询人格分析
                supabase
                    .from('conversations')
                    .select('messages')
                    .eq('bazi_chart_id', chartId)
                    .eq('source_type', 'bazi_personality')
                    .order('created_at', { ascending: false })
                    .limit(1),
            ]).then(([chartResult, wuxingResult, personalityResult]) => {
                const data = chartResult.data;
                if (data && !chartResult.error) {
                    const [year, month, day] = data.birth_date.split('-').map(Number);
                    const hasTime = Boolean(data.birth_time);
                    const [hour, minute] = (data.birth_time || '12:00').split(':').map(Number);

                    setChartFromDb({
                        name: data.name,
                        gender: data.gender as Gender,
                        birthYear: year,
                        birthMonth: month,
                        birthDay: day,
                        birthHour: hour,
                        birthMinute: minute || 0,
                        isUnknownTime: !hasTime,
                        calendarType: (data.calendar_type as CalendarType) || 'solar',
                        isLeapMonth: data.is_leap_month || false,
                        birthPlace: data.birth_place || undefined,
                    });

                    // 从 conversations 加载 AI 分析
                    const extractAnalysis = (result: { data: Array<{ messages: unknown }> | null }) => {
                        if (!result.data?.[0]?.messages) return null;
                        const messages = result.data[0].messages as Array<{ role: string; content: string }>;
                        const aiMsg = messages.find(m => m.role === 'assistant');
                        return aiMsg?.content || null;
                    };

                    setSavedWuxingAnalysis(extractAnalysis(wuxingResult));
                    setSavedPersonalityAnalysis(extractAnalysis(personalityResult));
                    setSaved(true);
                }
                setLoading(false);
            });
        }

        // 获取当前用户ID
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUserId(session?.user?.id || null);
        });
    }, [chartId, hasFormParams]);

    // 表单数据
    const formData: BaziFormData = useMemo(() => {
        if (chartFromDb) return chartFromDb;

        const hourParam = searchParams.get('hour');
        const isUnknownTime = hourParam === '-1';

        return {
            name: searchParams.get('name') || '命主',
            gender: (searchParams.get('gender') as Gender) || 'male',
            birthYear: Number(searchParams.get('year')) || 1990,
            birthMonth: Number(searchParams.get('month')) || 1,
            birthDay: Number(searchParams.get('day')) || 1,
            birthHour: isUnknownTime ? 12 : (Number(hourParam) || 12), // 未知时默认用午时计算
            birthMinute: Number(searchParams.get('minute')) || 0,
            calendarType: (searchParams.get('calendar') as CalendarType) || 'solar',
            isLeapMonth: searchParams.get('leap') === '1',
            birthPlace: searchParams.get('place') || undefined,
            isUnknownTime,
        };
    }, [searchParams, chartFromDb]);

    // 是否不确定时辰
    const isUnknownTime = formData.isUnknownTime ?? false;

    // 计算八字
    const baziResult = useMemo(() => {
        try {
            return calculateBazi(formData);
        } catch (error) {
            console.error('八字计算错误:', error);
            return null;
        }
    }, [formData]);

    // 计算专业数据
    const proData = useMemo(() => {
        try {
            return calculateProfessionalData(formData, currentYear);
        } catch (error) {
            console.error('专业数据计算错误:', error);
            return null;
        }
    }, [formData, currentYear]);

    // 初始化选中的大运和流年
    useEffect(() => {
        if (proData) {
            setSelectedDaYunIndex(proData.currentDaYunIndex);
            setSelectedLiuNianYear(currentYear);
        }
    }, [proData, currentYear]);

    // 当前选中大运的流年列表
    const currentLiuNian = useMemo(() => {
        if (!proData || selectedDaYunIndex < 0 || selectedDaYunIndex >= proData.daYun.length) {
            return [];
        }
        return proData.daYun[selectedDaYunIndex].liuNian;
    }, [proData, selectedDaYunIndex]);

    // 计算流月
    const liuYue = useMemo(() => {
        if (selectedLiuNianYear <= 0) return [];
        try {
            return calculateLiuYue(selectedLiuNianYear);
        } catch (error) {
            console.error('流月计算错误:', error);
            return [];
        }
    }, [selectedLiuNianYear]);

    // useEffect 根据流年变化重置流月选中项
    useEffect(() => {
        if (liuYue.length === 0) {
            setSelectedLiuYueMonth(-1);
            return;
        }
        // 不再自动选择流月，保持未选中状态
    }, [liuYue]);

    const activeLiuYue = useMemo(
        () => liuYue.find((item) => item.month === selectedLiuYueMonth) || null,
        [liuYue, selectedLiuYueMonth]
    );

    const liuRi = useMemo(() => {
        if (!activeLiuYue) return [];
        try {
            return calculateLiuRi(activeLiuYue.startDate, activeLiuYue.endDate);
        } catch (error) {
            console.error('流日计算错误:', error);
            return [];
        }
    }, [activeLiuYue]);

    // useEffect 在流月切换时同步默认流日
    useEffect(() => {
        if (!activeLiuYue) {
            setSelectedLiuRiDate('');
            return;
        }
        // 不再自动选择流日，保持未选中状态
    }, [activeLiuYue]);

    // 计算神煞
    const shenSha = useMemo(() => {
        try {
            return calculateShenSha(formData);
        } catch (error) {
            console.error('神煞计算错误:', error);
            return null;
        }
    }, [formData]);


    // 保存命盘
    const handleSave = async () => {
        if (saving) return;

        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
            alert('请先登录后再保存命盘');
            router.push('/user');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                name: formData.name,
                gender: formData.gender,
                birth_date: `${formData.birthYear}-${String(formData.birthMonth).padStart(2, '0')}-${String(formData.birthDay).padStart(2, '0')}`,
                birth_time: formData.isUnknownTime
                    ? null
                    : `${String(formData.birthHour).padStart(2, '0')}:${String(formData.birthMinute).padStart(2, '0')}`,
                birth_place: formData.birthPlace || null,
                calendar_type: formData.calendarType,
                is_leap_month: formData.isLeapMonth || false,
                chart_data: baziResult,
            };
            let error = null;
            if (chartId) {
                const response = await fetch('/api/bazi/charts/update', {
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
                    .from('bazi_charts')
                    .insert({ ...payload, user_id: session.user.id })
                    .select('id')
                    .maybeSingle();
                error = insertError;
                if (inserted?.id) {
                    router.replace(`/bazi/result?chart=${inserted.id}`);
                }
            }

            if (error) throw error;
            setSaved(true);
            setChartFromDb(formData);
            if (chartId) {
                router.replace(`/bazi/result?chart=${chartId}`);
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
                    title: `${formData.name}的八字命盘 - MingAI`,
                    text: `查看${formData.name}的八字命盘分析`,
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

    // 修改命盘
    const handleEdit = () => {
        const params = new URLSearchParams({
            name: formData.name,
            gender: formData.gender,
            year: String(formData.birthYear),
            month: String(formData.birthMonth),
            day: String(formData.birthDay),
            hour: formData.isUnknownTime ? '-1' : String(formData.birthHour),
            minute: formData.isUnknownTime ? '0' : String(formData.birthMinute),
            calendar: formData.calendarType,
        });
        if (formData.isLeapMonth) {
            params.set('leap', '1');
        }
        if (formData.birthPlace) {
            params.set('place', formData.birthPlace);
        }
        if (chartId) {
            params.set('chart', chartId);
        }
        router.push(`/bazi?${params.toString()}`);
    };

    // 选择大运 - 同时更新流年到该大运第一年
    const handleSelectDaYun = (index: number) => {
        if (selectedDaYunIndex === index) {
            // 取消选择，级联取消
            setSelectedDaYunIndex(-1);
            setSelectedLiuNianYear(-1);
            setSelectedLiuYueMonth(-1);
            setSelectedLiuRiDate('');
        } else {
            setSelectedDaYunIndex(index);
            // 切换大运时，不自动选择流年，但清除已选的流年/流月/流日
            setSelectedLiuNianYear(-1);
            setSelectedLiuYueMonth(-1);
            setSelectedLiuRiDate('');
        }
    };

    // 选择流年
    const handleSelectLiuNian = (year: number) => {
        if (selectedLiuNianYear === year) {
            setSelectedLiuNianYear(-1);
            setSelectedLiuYueMonth(-1);
            setSelectedLiuRiDate('');
        } else {
            setSelectedLiuNianYear(year);
            // 切换流年时，清除已选的流月/流日
            setSelectedLiuYueMonth(-1);
            setSelectedLiuRiDate('');
        }
    };

    // 选择流月/流日
    const handleSelectLiuYue = (month: number) => {
        if (selectedLiuYueMonth === month) {
            setSelectedLiuYueMonth(-1);
            setSelectedLiuRiDate('');
        } else {
            setSelectedLiuYueMonth(month);
            // 切换流月，清除已选流日
            setSelectedLiuRiDate('');
        }
    };

    const handleSelectLiuRi = (date: string) => {
        if (selectedLiuRiDate === date) {
            setSelectedLiuRiDate('');
        } else {
            setSelectedLiuRiDate(date);
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

    if (!baziResult || !proData) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-8 text-center">
                <p className="text-foreground-secondary">八字计算出错，请返回重新输入</p>
                <Link href="/bazi" className="mt-4 inline-block text-accent hover:underline">
                    返回重新输入
                </Link>
            </div>
        );
    }

    const dayMasterDescription = getDayMasterDescription(baziResult.dayMaster);

    return (
        <div className="max-w-4xl mx-auto px-2 py-6 animate-fade-in">
            <ResultHeader
                chartId={chartId}
                saving={saving}
                saved={saved}
                onEdit={handleEdit}
                onSave={handleSave}
                onShare={handleShare}
            />

            <ProfileSummaryCard
                formData={formData}
                isUnknownTime={isUnknownTime}
                dayMaster={baziResult.dayMaster}
            />

            <ResultTabs activeTab={activeTab} onChange={setActiveTab} />

            {/* 基本信息 */}
            {activeTab === 'basic' && (
                <BasicInfoSection
                    baziResult={baziResult}
                    dayMasterDescription={dayMasterDescription}
                    chartId={chartId}
                    userId={userId}
                    savedWuxingAnalysis={savedWuxingAnalysis}
                    savedPersonalityAnalysis={savedPersonalityAnalysis}
                    onSaveWuxingAnalysis={async (analysis) => {
                        setSavedWuxingAnalysis(analysis);
                        if (chartId) {
                            await supabase.from('bazi_charts').update({ ai_wuxing_analysis: analysis }).eq('id', chartId);
                        }
                    }}
                    onSavePersonalityAnalysis={async (analysis) => {
                        setSavedPersonalityAnalysis(analysis);
                        if (chartId) {
                            await supabase.from('bazi_charts').update({ ai_personality_analysis: analysis }).eq('id', chartId);
                        }
                    }}
                    onLoginRequired={() => router.push('/user')}
                />
            )}

            {/* 专业排盘 */}
            {activeTab === 'professional' && (
                <ProfessionalSection
                    baziResult={baziResult}
                    proData={proData}
                    gender={formData.gender}
                    isUnknownTime={isUnknownTime}
                    selectedDaYunIndex={selectedDaYunIndex}
                    onSelectDaYun={handleSelectDaYun}
                    currentLiuNian={currentLiuNian}
                    selectedLiuNianYear={selectedLiuNianYear}
                    onSelectLiuNian={handleSelectLiuNian}
                    liuYue={liuYue}
                    selectedLiuYueMonth={selectedLiuYueMonth}
                    onSelectLiuYue={handleSelectLiuYue}
                    liuRi={liuRi}
                    selectedLiuRiDate={selectedLiuRiDate}
                    onSelectLiuRi={handleSelectLiuRi}
                    activeLiuYue={activeLiuYue}
                    shenSha={shenSha || undefined}
                />
            )}

            <ResultFooterLinks />
        </div>
    );
}

export default function BaziResultPage() {
    return (
        <Suspense fallback={
            <div className="max-w-4xl mx-auto px-4 py-8 text-center">
                <div className="inline-block w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
                <p className="mt-4 text-foreground-secondary">正在计算八字命盘...</p>
            </div>
        }>
            <BaziResultContent />
        </Suspense>
    );
}
