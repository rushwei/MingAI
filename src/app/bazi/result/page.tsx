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

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12

    // 大运流年状态
    const [selectedDaYunIndex, setSelectedDaYunIndex] = useState<number>(0);
    const [selectedLiuNianYear, setSelectedLiuNianYear] = useState<number>(currentYear);

    const chartId = searchParams.get('chart');

    // 从数据库加载命盘
    useEffect(() => {
        if (chartId) {
            setLoading(true);
            supabase
                .from('bazi_charts')
                .select('*')
                .eq('id', chartId)
                .single()
                .then(({ data, error }) => {
                    if (data && !error) {
                        const [year, month, day] = data.birth_date.split('-').map(Number);
                        const [hour, minute] = (data.birth_time || '12:00').split(':').map(Number);

                        setChartFromDb({
                            name: data.name,
                            gender: data.gender as Gender,
                            birthYear: year,
                            birthMonth: month,
                            birthDay: day,
                            birthHour: hour,
                            birthMinute: minute || 0,
                            calendarType: 'solar',
                            birthPlace: data.birth_place || undefined,
                        });
                        setSaved(true);
                    }
                    setLoading(false);
                });
        }
    }, [chartId]);

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
            birthPlace: searchParams.get('place') || undefined,
        };
    }, [searchParams, chartFromDb]);

    // 是否不确定时辰
    const isUnknownTime = searchParams.get('hour') === '-1';

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
        try {
            return calculateLiuYue(selectedLiuNianYear);
        } catch (error) {
            console.error('流月计算错误:', error);
            return [];
        }
    }, [selectedLiuNianYear]);

    // 保存命盘
    const handleSave = async () => {
        if (saving || saved) return;

        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
            alert('请先登录后再保存命盘');
            router.push('/user');
            return;
        }

        setSaving(true);
        try {
            const { error } = await supabase.from('bazi_charts').insert({
                user_id: session.user.id,
                name: formData.name,
                gender: formData.gender,
                birth_date: `${formData.birthYear}-${String(formData.birthMonth).padStart(2, '0')}-${String(formData.birthDay).padStart(2, '0')}`,
                birth_time: `${String(formData.birthHour).padStart(2, '0')}:${String(formData.birthMinute).padStart(2, '0')}`,
                birth_place: formData.birthPlace || null,
                chart_data: baziResult,
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
            hour: String(formData.birthHour),
            minute: String(formData.birthMinute),
            calendar: formData.calendarType,
        });
        if (formData.birthPlace) {
            params.set('place', formData.birthPlace);
        }
        router.push(`/bazi?${params.toString()}`);
    };

    // 选择大运 - 同时更新流年到该大运第一年
    const handleSelectDaYun = (index: number) => {
        setSelectedDaYunIndex(index);
        if (proData && proData.daYun[index]) {
            const firstLiuNian = proData.daYun[index].liuNian[0];
            if (firstLiuNian) {
                setSelectedLiuNianYear(firstLiuNian.year);
            }
        }
    };

    // 选择流年
    const handleSelectLiuNian = (year: number) => {
        setSelectedLiuNianYear(year);
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
        <div className="max-w-4xl mx-auto px-4 py-6 animate-fade-in">
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
                />
            )}

            {/* 专业排盘 */}
            {activeTab === 'professional' && (
                <ProfessionalSection
                    baziResult={baziResult}
                    proData={proData}
                    gender={formData.gender}
                    selectedDaYunIndex={selectedDaYunIndex}
                    onSelectDaYun={handleSelectDaYun}
                    currentLiuNian={currentLiuNian}
                    currentYear={currentYear}
                    selectedLiuNianYear={selectedLiuNianYear}
                    onSelectLiuNian={handleSelectLiuNian}
                    liuYue={liuYue}
                    currentMonth={currentMonth}
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
