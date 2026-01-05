/**
 * 八字结果页面 - 专业排盘版
 * 支持：URL 参数传入 / 从数据库加载已保存命盘
 */
'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useMemo, useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import {
    ArrowLeft,
    User,
    Sparkles,
    MessageCircle,
    Share2,
    Save,
    Check,
    Loader2,
    Calendar,
    TrendingUp,
    Edit3
} from 'lucide-react';
import {
    calculateBazi,
    calculateProfessionalData,
    calculateLiuYue,
    getElementColor,
    getDayMasterDescription,
    getStemElement,
    getBranchElement,
    STEM_ELEMENTS,
    type DaYunInfo,
    type LiuNianInfo,
    type LiuYueInfo
} from '@/lib/bazi';
import { supabase } from '@/lib/supabase';
import type { BaziFormData, CalendarType, Gender, FiveElement, HeavenlyStem } from '@/types';

// 五行可视化组件
function FiveElementsChart({ elements }: { elements: Record<FiveElement, number> }) {
    const maxValue = Math.max(...Object.values(elements));
    const elementOrder: FiveElement[] = ['木', '火', '土', '金', '水'];

    return (
        <div className="grid grid-cols-5 gap-2">
            {elementOrder.map(element => {
                const value = elements[element];
                const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
                const color = getElementColor(element);

                return (
                    <div key={element} className="text-center">
                        <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold mx-auto mb-1"
                            style={{ backgroundColor: color }}
                        >
                            {element}
                        </div>
                        <div className="text-xs text-foreground-secondary">{value}</div>
                        <div className="h-1 bg-background rounded-full overflow-hidden mt-1">
                            <div
                                className="h-full transition-all duration-500 rounded-full"
                                style={{ width: `${percentage}%`, backgroundColor: color }}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// 专业排盘表格组件
function ProfessionalTable({
    baziResult,
    proData,
    gender
}: {
    baziResult: ReturnType<typeof calculateBazi>;
    proData: ReturnType<typeof calculateProfessionalData>;
    gender: Gender;
}) {
    const columns = [
        { label: '年柱', pillar: baziResult.fourPillars.year, naYin: proData.naYin.year, diShi: proData.diShi.year, shiShen: proData.shiShenGan.year, shiShenZhi: proData.shiShenZhi.year },
        { label: '月柱', pillar: baziResult.fourPillars.month, naYin: proData.naYin.month, diShi: proData.diShi.month, shiShen: proData.shiShenGan.month, shiShenZhi: proData.shiShenZhi.month },
        { label: '日柱', pillar: baziResult.fourPillars.day, naYin: proData.naYin.day, diShi: proData.diShi.day, shiShen: gender === 'male' ? '元男' : '元女', shiShenZhi: proData.shiShenZhi.day },
        { label: '时柱', pillar: baziResult.fourPillars.hour, naYin: proData.naYin.hour, diShi: proData.diShi.hour, shiShen: proData.shiShenGan.hour, shiShenZhi: proData.shiShenZhi.hour },
    ];

    return (
        <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full border-collapse text-sm min-w-[320px]">
                <thead>
                    <tr className="border-b border-border">
                        <th className="py-2 px-1 sm:px-2 text-left text-foreground-secondary font-medium w-12 sm:w-16"></th>
                        {columns.map(col => (
                            <th key={col.label} className="py-2 px-1 sm:px-2 text-center font-medium text-xs sm:text-sm">
                                {col.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    <tr className="border-b border-border/50">
                        <td className="py-2 px-1 sm:px-2 text-foreground-secondary text-xs">主星</td>
                        {columns.map(col => (
                            <td key={col.label} className="py-2 px-1 sm:px-2 text-center text-xs">
                                {col.shiShen}
                            </td>
                        ))}
                    </tr>
                    <tr className="border-b border-border/50">
                        <td className="py-2 px-1 sm:px-2 text-foreground-secondary text-xs">天干</td>
                        {columns.map(col => (
                            <td key={col.label} className="py-2 px-1 sm:px-2 text-center">
                                <span
                                    className="text-xl sm:text-2xl font-bold"
                                    style={{ color: getElementColor(col.pillar.stemElement) }}
                                >
                                    {col.pillar.stem}
                                </span>
                            </td>
                        ))}
                    </tr>
                    <tr className="border-b border-border/50">
                        <td className="py-2 px-1 sm:px-2 text-foreground-secondary text-xs">地支</td>
                        {columns.map(col => (
                            <td key={col.label} className="py-2 px-1 sm:px-2 text-center">
                                <span
                                    className="text-xl sm:text-2xl font-bold"
                                    style={{ color: getElementColor(col.pillar.branchElement) }}
                                >
                                    {col.pillar.branch}
                                </span>
                            </td>
                        ))}
                    </tr>
                    <tr className="border-b border-border/50">
                        <td className="py-2 px-1 sm:px-2 text-foreground-secondary text-xs">藏干</td>
                        {columns.map((col, colIdx) => (
                            <td key={col.label} className="py-2 px-1 sm:px-2 text-center">
                                <div className="flex flex-col items-center gap-0.5">
                                    {col.pillar.hiddenStems.map((stem, idx) => {
                                        const element = STEM_ELEMENTS[stem as HeavenlyStem];
                                        const shiShen = col.shiShenZhi[idx] || '';
                                        return (
                                            <div key={idx} className="flex items-center gap-0.5">
                                                <span
                                                    className="text-xs font-medium"
                                                    style={{ color: element ? getElementColor(element) : undefined }}
                                                >
                                                    {stem}
                                                </span>
                                                <span className="text-xs text-foreground-secondary">
                                                    {shiShen}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </td>
                        ))}
                    </tr>
                    <tr className="border-b border-border/50">
                        <td className="py-2 px-1 sm:px-2 text-foreground-secondary text-xs">星运</td>
                        {columns.map(col => (
                            <td key={col.label} className="py-2 px-1 sm:px-2 text-center text-xs">
                                {col.diShi}
                            </td>
                        ))}
                    </tr>
                    <tr>
                        <td className="py-2 px-1 sm:px-2 text-foreground-secondary text-xs">纳音</td>
                        {columns.map(col => (
                            <td key={col.label} className="py-2 px-1 sm:px-2 text-center text-xs text-foreground-secondary">
                                {col.naYin}
                            </td>
                        ))}
                    </tr>
                </tbody>
            </table>
        </div>
    );
}

// 大运表格组件
function DaYunTable({
    daYun,
    selectedIndex,
    onSelect
}: {
    daYun: DaYunInfo[];
    selectedIndex: number;
    onSelect: (index: number) => void;
}) {
    return (
        <div className="overflow-x-auto -mx-4 px-4">
            <div className="flex gap-2 min-w-max pb-2">
                {daYun.map((dy, index) => {
                    const isSelected = selectedIndex === index;
                    const ganElement = getStemElement(dy.gan);
                    const zhiElement = getBranchElement(dy.zhi);

                    return (
                        <button
                            key={index}
                            onClick={() => onSelect(index)}
                            className={`
                                flex-shrink-0 w-14 sm:w-16 text-center p-2 rounded-lg border-2 transition-all
                                ${isSelected
                                    ? 'border-accent bg-accent/10'
                                    : 'border-transparent bg-background-secondary hover:bg-background'
                                }
                            `}
                        >
                            <div className="text-xs text-foreground-secondary">{dy.startYear}</div>
                            <div className="text-xs text-foreground-secondary">{dy.startAge}岁</div>
                            <div className="flex flex-col items-center mt-1">
                                <span
                                    className="text-base sm:text-lg font-bold"
                                    style={{ color: ganElement ? getElementColor(ganElement) : undefined }}
                                >
                                    {dy.gan}
                                </span>
                                <span
                                    className="text-base sm:text-lg font-bold"
                                    style={{ color: zhiElement ? getElementColor(zhiElement) : undefined }}
                                >
                                    {dy.zhi}
                                </span>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// 流年表格组件 - 竖排显示
function LiuNianTable({
    liuNian,
    currentYear,
    selectedYear,
    onSelect
}: {
    liuNian: LiuNianInfo[];
    currentYear: number;
    selectedYear: number;
    onSelect: (year: number) => void;
}) {
    return (
        <div className="overflow-x-auto -mx-4 px-4">
            <div className="flex gap-2 min-w-max pb-2">
                {liuNian.map((ln, index) => {
                    const isSelected = selectedYear === ln.year;
                    const isCurrent = ln.year === currentYear;
                    const ganElement = getStemElement(ln.gan);
                    const zhiElement = getBranchElement(ln.zhi);

                    return (
                        <button
                            key={index}
                            onClick={() => onSelect(ln.year)}
                            className={`
                                flex-shrink-0 w-12 sm:w-14 text-center p-1.5 sm:p-2 rounded-lg border-2 transition-all
                                ${isSelected
                                    ? 'border-accent bg-accent/10'
                                    : isCurrent
                                        ? 'border-accent/50 bg-accent/5'
                                        : 'border-transparent bg-background-secondary hover:bg-background'
                                }
                            `}
                        >
                            <div className="text-xs text-foreground-secondary">{ln.year}</div>
                            <div className="flex flex-col items-center mt-1">
                                <span
                                    className="text-sm sm:text-base font-bold"
                                    style={{ color: ganElement ? getElementColor(ganElement) : undefined }}
                                >
                                    {ln.gan}
                                </span>
                                <span
                                    className="text-sm sm:text-base font-bold"
                                    style={{ color: zhiElement ? getElementColor(zhiElement) : undefined }}
                                >
                                    {ln.zhi}
                                </span>
                            </div>
                            <div className="text-xs text-foreground-secondary">{ln.age}岁</div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// 流月表格组件 - 一行12个月
function LiuYueTable({ liuYue, currentMonth }: { liuYue: LiuYueInfo[]; currentMonth: number }) {
    return (
        <div className="overflow-x-auto -mx-4 px-4">
            <div className="flex gap-1.5 min-w-max pb-2">
                {liuYue.map((ly, index) => {
                    const isCurrent = ly.month === currentMonth;
                    const gan = ly.ganZhi[0];
                    const zhi = ly.ganZhi[1];
                    const ganElement = getStemElement(gan);
                    const zhiElement = getBranchElement(zhi);

                    return (
                        <div
                            key={index}
                            className={`
                                flex-shrink-0 w-11 text-center p-1.5 rounded-lg border-2
                                ${isCurrent
                                    ? 'border-accent bg-accent/10'
                                    : 'border-transparent bg-background'
                                }
                            `}
                        >
                            <div className="text-xs text-foreground-secondary truncate">{ly.jieQi}</div>
                            <div className="flex flex-col items-center mt-0.5">
                                <span
                                    className="text-sm font-bold"
                                    style={{ color: ganElement ? getElementColor(ganElement) : undefined }}
                                >
                                    {gan}
                                </span>
                                <span
                                    className="text-sm font-bold"
                                    style={{ color: zhiElement ? getElementColor(zhiElement) : undefined }}
                                >
                                    {zhi}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// 结果内容组件
function BaziResultContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'basic' | 'professional'>('professional');
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
            {/* 顶部操作栏 */}
            <div className="flex items-center justify-between mb-4">
                <Link
                    href={chartId ? '/user/charts' : '/bazi'}
                    className="inline-flex items-center gap-2 text-foreground-secondary hover:text-foreground transition-colors"
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

            {/* 命主信息 */}
            <div className="bg-gradient-to-r from-accent/10 via-accent/5 to-transparent rounded-2xl p-4 border border-accent/20 mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                        <User className="w-6 h-6 text-accent" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h1 className="text-lg font-bold truncate">{formData.name}</h1>
                        <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-sm text-foreground-secondary">
                            <span>{formData.gender === 'male' ? '男' : '女'}</span>
                            <span>•</span>
                            <span>
                                {formData.birthYear}年{formData.birthMonth}月{formData.birthDay}日
                                {isUnknownTime && <span className="text-amber-500 ml-1">(*时辰未知)</span>}
                            </span>
                            <span>•</span>
                            <span>日主 {baziResult.dayMaster}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 标签页 */}
            <div className="flex gap-1 p-1 bg-background-secondary rounded-xl mb-4">
                {[
                    { id: 'basic', label: '基本信息', icon: Sparkles },
                    { id: 'professional', label: '专业排盘', icon: Calendar },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as typeof activeTab)}
                        className={`
                            flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-colors
                            ${activeTab === tab.id
                                ? 'bg-background text-foreground shadow-sm'
                                : 'text-foreground-secondary hover:text-foreground'
                            }
                        `}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* 基本信息 */}
            {activeTab === 'basic' && (
                <div className="space-y-4">
                    <section className="bg-background-secondary rounded-xl p-4 border border-border">
                        <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
                            <div className="w-4 h-4 rounded bg-gradient-to-r from-green-500 via-red-500 to-blue-500" />
                            五行分析
                        </h2>
                        <FiveElementsChart elements={baziResult.fiveElements} />
                    </section>

                    <section className="bg-background-secondary rounded-xl p-4 border border-border">
                        <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
                            <User className="w-4 h-4 text-accent" />
                            日主特征
                        </h2>
                        <div className="flex items-start gap-3">
                            <div
                                className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold text-white flex-shrink-0"
                                style={{ backgroundColor: getElementColor(baziResult.fourPillars.day.stemElement) }}
                            >
                                {baziResult.dayMaster}
                            </div>
                            <div className="min-w-0">
                                <div className="font-medium mb-1">
                                    日主「{baziResult.dayMaster}」，五行属{baziResult.fourPillars.day.stemElement}
                                </div>
                                <p className="text-sm text-foreground-secondary leading-relaxed">
                                    {dayMasterDescription}
                                </p>
                            </div>
                        </div>
                    </section>

                    <section className="bg-gradient-to-r from-accent/5 via-accent/10 to-accent/5 rounded-xl p-4 border border-accent/20">
                        <Link
                            href="/chat"
                            className="w-full py-3 px-4 rounded-lg bg-accent text-white font-medium hover:bg-accent/90 transition-colors flex items-center justify-center gap-2"
                        >
                            <MessageCircle className="w-4 h-4" />
                            与 AI 命理师对话
                        </Link>
                    </section>
                </div>
            )}

            {/* 专业排盘 */}
            {activeTab === 'professional' && (
                <div className="space-y-4">
                    {/* 四柱 */}
                    <section className="bg-background-secondary rounded-xl p-4 border border-border">
                        <h2 className="text-base font-semibold mb-3">四柱详解</h2>
                        <ProfessionalTable baziResult={baziResult} proData={proData} gender={formData.gender} />
                        <div className="mt-3 pt-3 border-t border-border text-sm text-foreground-secondary">
                            起运：{proData.startAgeDetail}
                        </div>
                    </section>

                    {/* 大运 */}
                    <section className="bg-background-secondary rounded-xl p-4 border border-border">
                        <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-accent" />
                            大运（每运10年）
                        </h2>
                        <DaYunTable
                            daYun={proData.daYun}
                            selectedIndex={selectedDaYunIndex}
                            onSelect={handleSelectDaYun}
                        />
                    </section>

                    {/* 流年 */}
                    {currentLiuNian.length > 0 && (
                        <section className="bg-background-secondary rounded-xl p-4 border border-border">
                            <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-accent" />
                                流年
                            </h2>
                            <LiuNianTable
                                liuNian={currentLiuNian}
                                currentYear={currentYear}
                                selectedYear={selectedLiuNianYear}
                                onSelect={handleSelectLiuNian}
                            />
                        </section>
                    )}

                    {/* 流月 - 固定展示 */}
                    {liuYue.length > 0 && (
                        <section className="bg-background-secondary rounded-xl p-4 border border-border">
                            <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-accent" />
                                {selectedLiuNianYear}年流月
                            </h2>
                            <LiuYueTable
                                liuYue={liuYue}
                                currentMonth={selectedLiuNianYear === currentYear ? currentMonth : 0}
                            />
                        </section>
                    )}
                </div>
            )}

            {/* 底部链接 */}
            <div className="mt-6 flex justify-center gap-4">
                <Link href="/bazi" className="text-sm text-foreground-secondary hover:text-accent transition-colors">
                    新建排盘
                </Link>
                <span className="text-foreground-secondary">•</span>
                <Link href="/user/charts" className="text-sm text-foreground-secondary hover:text-accent transition-colors">
                    我的命盘
                </Link>
                <span className="text-foreground-secondary">•</span>
                <Link href="/chat" className="text-sm text-foreground-secondary hover:text-accent transition-colors">
                    AI 对话
                </Link>
            </div>
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
