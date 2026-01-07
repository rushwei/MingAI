'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import type { ZiweiChart, ZiweiHoroscope, DecadalInfo } from '@/lib/ziwei';
import { getHoroscope, getDecadalList } from '@/lib/ziwei';

type HoroscopeTab = 'decadal' | 'yearly' | 'monthly' | 'daily';

const TAB_LABELS: Record<HoroscopeTab, string> = {
    decadal: '大限',
    yearly: '流年',
    monthly: '流月',
    daily: '流日',
};

export interface HoroscopeInfo {
    tab: HoroscopeTab;
    decadal?: DecadalInfo;
    yearly?: { heavenlyStem: string; earthlyBranch: string; palaceIndex: number };
    monthly?: { heavenlyStem: string; earthlyBranch: string; palaceIndex: number };
    daily?: { heavenlyStem: string; earthlyBranch: string; palaceIndex: number };
}

interface ZiweiHoroscopePanelProps {
    chart: ZiweiChart;
    onPalaceHighlight?: (indices: number[]) => void;
    onHoroscopeChange?: (info: HoroscopeInfo) => void;
}

export function ZiweiHoroscopePanel({ chart, onPalaceHighlight, onHoroscopeChange }: ZiweiHoroscopePanelProps) {
    const [activeTab, setActiveTab] = useState<HoroscopeTab>('yearly');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedDecadalIndex, setSelectedDecadalIndex] = useState<number | null>(null);

    // 获取大限列表
    const decadalList = useMemo(() => getDecadalList(chart), [chart]);

    // 获取运限数据
    const horoscope = useMemo<ZiweiHoroscope | null>(() =>
        getHoroscope(chart, selectedDate),
        [chart, selectedDate]);

    // 当前大限
    const currentAge = useMemo(() => {
        const birthYear = parseInt(chart.solarDate.split('-')[0]);
        return new Date().getFullYear() - birthYear;
    }, [chart.solarDate]);

    const currentDecadal = useMemo<DecadalInfo | null>(() =>
        decadalList.find(d => currentAge >= d.startAge && currentAge <= d.endAge) ?? null,
        [decadalList, currentAge]);

    // 初始化选中当前大限
    useEffect(() => {
        if (currentDecadal && selectedDecadalIndex === null) {
            setSelectedDecadalIndex(currentDecadal.index);
        }
    }, [currentDecadal, selectedDecadalIndex]);

    // 获取选中的大限
    const selectedDecadal = useMemo(() =>
        decadalList.find(d => d.index === selectedDecadalIndex) ?? currentDecadal,
        [decadalList, selectedDecadalIndex, currentDecadal]);

    // 日期变化
    const changeDate = (delta: number) => {
        const newDate = new Date(selectedDate);
        if (activeTab === 'yearly') {
            newDate.setFullYear(newDate.getFullYear() + delta);
        } else if (activeTab === 'monthly') {
            newDate.setMonth(newDate.getMonth() + delta);
        } else if (activeTab === 'daily') {
            newDate.setDate(newDate.getDate() + delta);
        }
        setSelectedDate(newDate);
    };

    // 更新高亮宫位和运限信息
    const updateHighlight = useCallback((tab: HoroscopeTab) => {
        let indices: number[] = [];
        const info: HoroscopeInfo = { tab };

        if (tab === 'decadal' && selectedDecadal) {
            indices = [selectedDecadal.palace.index];
            info.decadal = selectedDecadal;
        } else if (horoscope) {
            if (tab === 'yearly') {
                indices = [horoscope.yearly.palace.index];
                info.yearly = {
                    heavenlyStem: horoscope.yearly.heavenlyStem,
                    earthlyBranch: horoscope.yearly.earthlyBranch,
                    palaceIndex: horoscope.yearly.palace.index,
                };
            } else if (tab === 'monthly') {
                indices = [horoscope.monthly.palace.index];
                info.monthly = {
                    heavenlyStem: horoscope.monthly.heavenlyStem,
                    earthlyBranch: horoscope.monthly.earthlyBranch,
                    palaceIndex: horoscope.monthly.palace.index,
                };
            } else if (tab === 'daily') {
                indices = [horoscope.daily.palace.index];
                info.daily = {
                    heavenlyStem: horoscope.daily.heavenlyStem,
                    earthlyBranch: horoscope.daily.earthlyBranch,
                    palaceIndex: horoscope.daily.palace.index,
                };
            }
        }

        onPalaceHighlight?.(indices);
        onHoroscopeChange?.(info);
    }, [onPalaceHighlight, onHoroscopeChange, selectedDecadal, horoscope]);

    // 日期或horoscope变化时更新高亮
    useEffect(() => {
        updateHighlight(activeTab);
    }, [activeTab, updateHighlight, selectedDate, selectedDecadalIndex]);

    // Tab 切换时更新高亮
    const handleTabChange = (tab: HoroscopeTab) => {
        setActiveTab(tab);
    };

    // 大限选择
    const handleDecadalSelect = (d: DecadalInfo) => {
        setSelectedDecadalIndex(d.index);
    };

    const formatDateLabel = () => {
        if (activeTab === 'yearly') {
            return `${selectedDate.getFullYear()}年`;
        } else if (activeTab === 'monthly') {
            return `${selectedDate.getFullYear()}年${selectedDate.getMonth() + 1}月`;
        } else if (activeTab === 'daily') {
            return selectedDate.toLocaleDateString('zh-CN');
        }
        return '';
    };

    const goToToday = () => setSelectedDate(new Date());

    const renderPeriodInfo = () => {
        if (!horoscope) return <div className="text-foreground-secondary">无法获取运限数据</div>;

        let info;
        if (activeTab === 'decadal' && selectedDecadal) {
            info = selectedDecadal;
            const isCurrent = currentAge >= info.startAge && currentAge <= info.endAge;
            return (
                <div className="space-y-2">
                    <div className="flex items-center gap-4">
                        <span className="text-foreground-secondary">大限宫位:</span>
                        <span className="font-semibold text-accent">{info.palace.name}</span>
                        <span className="text-sm text-foreground-secondary">
                            ({info.startAge}-{info.endAge}岁)
                        </span>
                        {isCurrent && (
                            <span className="px-1.5 py-0.5 rounded text-xs bg-green-500/10 text-green-500">当前</span>
                        )}
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-foreground-secondary">大限天干:</span>
                        <span className="font-semibold">{info.heavenlyStem}</span>
                    </div>
                </div>
            );
        } else if (activeTab === 'yearly') {
            info = horoscope.yearly;
        } else if (activeTab === 'monthly') {
            info = horoscope.monthly;
        } else if (activeTab === 'daily') {
            info = horoscope.daily;
        }

        if (!info) return null;

        return (
            <div className="space-y-2">
                <div className="flex items-center gap-4">
                    <span className="text-foreground-secondary">{TAB_LABELS[activeTab]}宫位:</span>
                    <span className="font-semibold text-accent">{info.palace.name || '命宫'}</span>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-foreground-secondary">干支:</span>
                    <span className="font-semibold">{info.heavenlyStem}{info.earthlyBranch}</span>
                </div>
            </div>
        );
    };

    return (
        <div className="bg-background-secondary rounded-xl p-4 border border-border">
            {/* Tab 切换 */}
            <div className="flex gap-1 mb-4 p-1 bg-background rounded-lg">
                {(Object.keys(TAB_LABELS) as HoroscopeTab[]).map(tab => (
                    <button
                        key={tab}
                        onClick={() => handleTabChange(tab)}
                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab
                            ? 'bg-accent text-white shadow-sm'
                            : 'text-foreground-secondary hover:bg-background-secondary'
                            }`}
                    >
                        {TAB_LABELS[tab]}
                    </button>
                ))}
            </div>

            {/* 日期选择器 (非大限时显示) */}
            {activeTab !== 'decadal' && (
                <div className="flex items-center justify-between mb-4">
                    <button
                        onClick={() => changeDate(-1)}
                        className="p-2 rounded-lg hover:bg-background transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-foreground-secondary" />
                        <span className="font-medium">{formatDateLabel()}</span>
                        <button
                            onClick={goToToday}
                            className="text-xs text-accent hover:underline"
                        >
                            今天
                        </button>
                    </div>
                    <button
                        onClick={() => changeDate(1)}
                        className="p-2 rounded-lg hover:bg-background transition-colors"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* 运限信息 */}
            <div className="text-sm mb-4 p-3 bg-background rounded-lg">
                {renderPeriodInfo()}
            </div>

            {/* 大限列表 (仅大限 Tab) - 可选择 */}
            {activeTab === 'decadal' && (
                <div className="pt-4 border-t border-border">
                    <div className="text-xs text-foreground-secondary mb-2">点击选择大限</div>
                    <div className="grid grid-cols-4 gap-2 text-sm">
                        {decadalList.slice(0, 8).map(d => {
                            const isCurrent = currentAge >= d.startAge && currentAge <= d.endAge;
                            const isSelected = selectedDecadalIndex === d.index;
                            return (
                                <button
                                    key={d.index}
                                    onClick={() => handleDecadalSelect(d)}
                                    className={`relative p-2 rounded-lg text-center transition-all ${isSelected
                                        ? 'bg-accent/10 border-2 border-accent'
                                        : isCurrent
                                            ? 'bg-green-500/10 border border-green-500'
                                            : 'bg-background border border-border hover:border-accent/50'
                                        }`}
                                >
                                    {isSelected && (
                                        <Check className="absolute top-1 right-1 w-3 h-3 text-accent" />
                                    )}
                                    <div className="font-semibold">{d.palace.name}</div>
                                    <div className="text-xs text-foreground-secondary">
                                        {d.startAge}-{d.endAge}岁
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
