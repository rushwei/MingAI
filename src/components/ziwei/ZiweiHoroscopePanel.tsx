'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { ZiweiChart, ZiweiHoroscope, DecadalInfo } from '@/lib/ziwei';
import { getHoroscope, getDecadalList } from '@/lib/ziwei';
import { getStemElement, getBranchElement, getElementColor } from '@/lib/bazi';

export interface HoroscopeInfo {
    decadal?: DecadalInfo;
    yearly?: { heavenlyStem: string; earthlyBranch: string; palaceIndex: number };
    monthly?: { heavenlyStem: string; earthlyBranch: string; palaceIndex: number };
    daily?: { heavenlyStem: string; earthlyBranch: string; palaceIndex: number };
}

export interface HoroscopeHighlight {
    decadalIndex?: number;
    yearlyIndex?: number;
    monthlyIndex?: number;
    dailyIndex?: number;
}

interface ZiweiHoroscopePanelProps {
    chart: ZiweiChart;
    onPalaceHighlight?: (highlights: HoroscopeHighlight) => void;
    onHoroscopeChange?: (info: HoroscopeInfo) => void;
}

export function ZiweiHoroscopePanel({ chart, onPalaceHighlight, onHoroscopeChange }: ZiweiHoroscopePanelProps) {
    const [selectedDecadalIndex, setSelectedDecadalIndex] = useState<number | null>(null);
    const [selectedYear, setSelectedYear] = useState<number | null>(null);
    const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
    const [selectedDay, setSelectedDay] = useState<number | null>(null);

    // 选中状态 - 默认全部未选中
    const [decadalSelected, setDecadalSelected] = useState(false);
    const [yearlySelected, setYearlySelected] = useState(false);
    const [monthlySelected, setMonthlySelected] = useState(false);
    const [dailySelected, setDailySelected] = useState(false);

    // 获取大限列表
    const decadalList = useMemo(() => getDecadalList(chart), [chart]);

    const today = useMemo(() => new Date(), []);
    const viewYear = selectedYear ?? today.getFullYear();
    const viewMonth = selectedMonth ?? (today.getMonth() + 1);

    const yearlyHoroscope = useMemo<ZiweiHoroscope | null>(() => {
        if (!selectedYear) return null;
        return getHoroscope(chart, new Date(selectedYear, 5, 15));
    }, [chart, selectedYear]);

    const monthlyHoroscope = useMemo<ZiweiHoroscope | null>(() => {
        if (!selectedYear || !selectedMonth) return null;
        return getHoroscope(chart, new Date(selectedYear, selectedMonth - 1, 15));
    }, [chart, selectedYear, selectedMonth]);

    const dailyHoroscope = useMemo<ZiweiHoroscope | null>(() => {
        if (!selectedYear || !selectedMonth || !selectedDay) return null;
        return getHoroscope(chart, new Date(selectedYear, selectedMonth - 1, selectedDay));
    }, [chart, selectedYear, selectedMonth, selectedDay]);

    // 获取选中的大限
    const selectedDecadal = useMemo(() =>
        decadalList.find(d => d.index === selectedDecadalIndex) ?? null,
        [decadalList, selectedDecadalIndex]);
    const displayDecadal = selectedDecadal ?? decadalList[0] ?? null;

    // 更新高亮宫位和运限信息
    const updateHighlight = useCallback(() => {
        const highlights: HoroscopeHighlight = {};
        const info: HoroscopeInfo = {};

        if (decadalSelected && selectedDecadal) {
            highlights.decadalIndex = selectedDecadal.palace.index;
            info.decadal = selectedDecadal;
        }

        if (yearlySelected && yearlyHoroscope) {
            highlights.yearlyIndex = yearlyHoroscope.yearly.palace.index;
            info.yearly = {
                heavenlyStem: yearlyHoroscope.yearly.heavenlyStem,
                earthlyBranch: yearlyHoroscope.yearly.earthlyBranch,
                palaceIndex: yearlyHoroscope.yearly.palace.index,
            };
        }
        if (monthlySelected && monthlyHoroscope) {
            highlights.monthlyIndex = monthlyHoroscope.monthly.palace.index;
            info.monthly = {
                heavenlyStem: monthlyHoroscope.monthly.heavenlyStem,
                earthlyBranch: monthlyHoroscope.monthly.earthlyBranch,
                palaceIndex: monthlyHoroscope.monthly.palace.index,
            };
        }
        if (dailySelected && dailyHoroscope) {
            highlights.dailyIndex = dailyHoroscope.daily.palace.index;
            info.daily = {
                heavenlyStem: dailyHoroscope.daily.heavenlyStem,
                earthlyBranch: dailyHoroscope.daily.earthlyBranch,
                palaceIndex: dailyHoroscope.daily.palace.index,
            };
        }

        onPalaceHighlight?.(highlights);
        onHoroscopeChange?.(info);
    }, [
        onPalaceHighlight,
        onHoroscopeChange,
        selectedDecadal,
        yearlyHoroscope,
        monthlyHoroscope,
        dailyHoroscope,
        decadalSelected,
        yearlySelected,
        monthlySelected,
        dailySelected,
    ]);

    // 状态变化时更新高亮
    useEffect(() => {
        updateHighlight();
    }, [updateHighlight]);

    // 计算当前大限内的流年列表
    const yearlyList = useMemo(() => {
        if (!displayDecadal) return [];
        const birthYear = parseInt(chart.solarDate.split('-')[0]);
        const startYear = birthYear + displayDecadal.startAge;
        const endYear = birthYear + displayDecadal.endAge;
        const years: { year: number; stem: string; branch: string; palace: string }[] = [];

        for (let year = startYear; year <= endYear; year++) {
            const yearDate = new Date(year, 5, 15);
            const yearHoroscope = getHoroscope(chart, yearDate);
            if (yearHoroscope) {
                years.push({
                    year,
                    stem: yearHoroscope.yearly.heavenlyStem,
                    branch: yearHoroscope.yearly.earthlyBranch,
                    palace: yearHoroscope.yearly.palace.name,
                });
            }
        }
        return years;
    }, [chart, displayDecadal]);

    // 计算当前选中年份的12个月
    const monthlyList = useMemo(() => {
        const months: { month: number; stem: string; branch: string; palace: string }[] = [];
        for (let m = 1; m <= 12; m++) {
            const monthDate = new Date(viewYear, m - 1, 15);
            const monthHoroscope = getHoroscope(chart, monthDate);
            if (monthHoroscope) {
                months.push({
                    month: m,
                    stem: monthHoroscope.monthly.heavenlyStem,
                    branch: monthHoroscope.monthly.earthlyBranch,
                    palace: monthHoroscope.monthly.palace.name,
                });
            }
        }
        return months;
    }, [chart, viewYear]);

    // 计算当前选中月份的日期列表
    const dailyList = useMemo(() => {
        const year = viewYear;
        const month = viewMonth - 1;
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const days: { day: number; stem: string; branch: string; palace: string }[] = [];

        for (let d = 1; d <= daysInMonth; d++) {
            const dayDate = new Date(year, month, d);
            const dayHoroscope = getHoroscope(chart, dayDate);
            if (dayHoroscope) {
                days.push({
                    day: d,
                    stem: dayHoroscope.daily.heavenlyStem,
                    branch: dayHoroscope.daily.earthlyBranch,
                    palace: dayHoroscope.daily.palace.name,
                });
            }
        }
        return days;
    }, [chart, viewYear, viewMonth]);

    // 大限选择 - 支持取消
    const handleDecadalSelect = (d: DecadalInfo) => {
        setSelectedDecadalIndex(prev => {
            const nextIndex = prev === d.index ? null : d.index;
            const nextSelected = nextIndex !== null;
            setDecadalSelected(nextSelected);
            if (!nextSelected) {
                setYearlySelected(false);
                setMonthlySelected(false);
                setDailySelected(false);
                setSelectedYear(null);
                setSelectedMonth(null);
                setSelectedDay(null);
            }
            return nextIndex;
        });
    };

    // 颜色配置
    const colors = {
        decadal: { bg: 'bg-purple-500/10', border: 'border-purple-500', text: 'text-purple-500', label: '大限' },
        yearly: { bg: 'bg-blue-500/10', border: 'border-blue-500', text: 'text-blue-500', label: '流年' },
        monthly: { bg: 'bg-green-500/10', border: 'border-green-500', text: 'text-green-500', label: '流月' },
        daily: { bg: 'bg-orange-500/10', border: 'border-orange-500', text: 'text-orange-500', label: '流日' },
    };

    // 获取天干或地支的五行颜色样式
    const getCharColorStyle = (char: string) => {
        const stemElement = getStemElement(char);
        if (stemElement) return { color: getElementColor(stemElement) };
        const branchElement = getBranchElement(char);
        if (branchElement) return { color: getElementColor(branchElement) };
        return {};
    };

    const SectionHeader = ({
        title,
        color,
        selected,
        onSelect
    }: {
        title: string;
        color: typeof colors.decadal;
        selected: boolean;
        onSelect: () => void;
    }) => (
        <button
            onClick={onSelect}
            className={`w-full pt-2 flex items-center justify-between rounded-lg transition-colors cursor-pointer hover:opacity-80`}
        >
            <div className="flex items-center gap-3">
                <span className={`h-2 rounded-full`} />
                <span className={`font-medium text-lg ${color.text}`}>{title}</span>
            </div>
        </button>
    );

    return (
        <div className="space-y-3">
            {/* 大限 */}
            <div className="bg-background rounded-xl border-border overflow-hidden">
                <SectionHeader
                    title="大限"
                    color={colors.decadal}
                    selected={decadalSelected}
                    onSelect={() => {
                        setDecadalSelected(prev => {
                            const next = !prev;
                            if (!next) {
                                setSelectedDecadalIndex(null);
                                setYearlySelected(false);
                                setMonthlySelected(false);
                                setDailySelected(false);
                                setSelectedYear(null);
                                setSelectedMonth(null);
                                setSelectedDay(null);
                            }
                            return next;
                        });
                    }}
                />
                <div className="p-3 pt-0">
                    {displayDecadal && (
                        <div className="text-sm text-foreground-secondary mb-2 flex items-center gap-2">
                            <span>当前: {displayDecadal.palace.name}</span>
                            <span>({displayDecadal.startAge}岁)</span>
                            <span className="font-medium text-purple-500">{displayDecadal.heavenlyStem}{displayDecadal.palace.earthlyBranch}</span>
                        </div>
                    )}
                    <div className="flex gap-2 overflow-x-auto pb-2">
                        {decadalList.slice(0, 10).map(d => {
                            const isSelected = decadalSelected && selectedDecadalIndex === d.index;
                            return (
                                <button
                                    key={d.index}
                                    onClick={() => handleDecadalSelect(d)}
                                    className={`relative p-2 rounded-lg text-center transition-all ${isSelected
                                        ? 'bg-purple-500 text-white shadow-md'
                                        : 'bg-background border border-border hover:border-purple-500/50'
                                        }`}
                                >
                                    <div className={`text-sm font-bold flex flex-col items-center leading-tight ${isSelected ? '' : ''}`}>
                                        <span style={isSelected ? {} : getCharColorStyle(d.heavenlyStem)}>{d.heavenlyStem}</span>
                                        <span style={isSelected ? {} : getCharColorStyle(d.palace.earthlyBranch)}>{d.palace.earthlyBranch}</span>
                                    </div>
                                    <div className={`text-xs ${isSelected ? 'text-white/90' : ''}`}>
                                        {d.palace.name}
                                    </div>
                                    <div className={`text-xs ${isSelected ? 'text-white/70' : 'text-foreground-secondary'}`}>
                                        {d.startAge}
                                        <br />
                                        岁
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* 流年 - 列表展示 */}
            <div className="bg-background rounded-xl border-border overflow-hidden">
                <SectionHeader
                    title="流年"
                    color={colors.yearly}
                    selected={yearlySelected}
                    onSelect={() => {
                        setYearlySelected(prev => {
                            const next = !prev;
                            if (!next) {
                                setMonthlySelected(false);
                                setDailySelected(false);
                                setSelectedYear(null);
                                setSelectedMonth(null);
                                setSelectedDay(null);
                            }
                            return next;
                        });
                    }}
                />
                {displayDecadal && (
                    <div className="p-3 pt-0">
                        <div className="text-xs text-foreground-secondary mb-2">
                            {displayDecadal.startAge}岁 大限内的流年
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-2">
                            {yearlyList.map(yearInfo => {
                                const isSelected = yearlySelected && selectedYear === yearInfo.year;
                                return (
                                    <button
                                        key={yearInfo.year}
                                        onClick={() => {
                                            if (isSelected) {
                                                setYearlySelected(false);
                                                setSelectedYear(null);
                                                setMonthlySelected(false);
                                                setDailySelected(false);
                                                setSelectedMonth(null);
                                                setSelectedDay(null);
                                                return;
                                            }
                                            if (displayDecadal) {
                                                setSelectedDecadalIndex(displayDecadal.index);
                                                setDecadalSelected(true);
                                            }
                                            setSelectedYear(yearInfo.year);
                                            setYearlySelected(true);
                                            setMonthlySelected(false);
                                            setDailySelected(false);
                                            setSelectedMonth(null);
                                            setSelectedDay(null);
                                        }}
                                        className={`relative p-2 rounded-lg text-center transition-all ${isSelected
                                            ? 'bg-blue-500 text-white shadow-md'
                                            : 'bg-background border border-border hover:border-blue-500/50'
                                            }`}
                                    >
                                        <div className={`text-sm font-bold flex flex-col items-center leading-tight ${isSelected ? '' : ''}`}>
                                            <span style={isSelected ? {} : getCharColorStyle(yearInfo.stem)}>{yearInfo.stem}</span>
                                            <span style={isSelected ? {} : getCharColorStyle(yearInfo.branch)}>{yearInfo.branch}</span>
                                        </div>
                                        <div className={`text-xs ${isSelected ? 'text-white/90' : ''}`}>
                                            {yearInfo.year}
                                        </div>
                                        <div className={`text-xs ${isSelected ? 'text-white/70' : 'text-foreground-secondary'}`}>
                                            {yearInfo.palace}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* 流月 - 12个月列表 */}
            <div className="bg-background rounded-xl border-border overflow-hidden">
                <SectionHeader
                    title="流月"
                    color={colors.monthly}
                    selected={monthlySelected}
                    onSelect={() => {
                        setMonthlySelected(prev => {
                            const next = !prev;
                            if (!next) {
                                setDailySelected(false);
                                setSelectedMonth(null);
                                setSelectedDay(null);
                            }
                            return next;
                        });
                    }}
                />
                <div className="p-3 pt-0">
                    <div className="text-xs text-foreground-secondary mb-2">
                        {viewYear}年 12个月
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                        {monthlyList.map(monthInfo => {
                            const isSelected = monthlySelected && selectedMonth === monthInfo.month && selectedYear === viewYear;
                            return (
                                <button
                                    key={monthInfo.month}
                                    onClick={() => {
                                        if (isSelected) {
                                            setMonthlySelected(false);
                                            setSelectedMonth(null);
                                            setDailySelected(false);
                                            setSelectedDay(null);
                                            return;
                                        }
                                        if (selectedYear === null) {
                                            setSelectedYear(viewYear);
                                        }
                                        setSelectedMonth(monthInfo.month);
                                        setMonthlySelected(true);
                                        setDailySelected(false);
                                        setSelectedDay(null);
                                    }}
                                    className={`relative p-2 rounded-lg text-center transition-all ${isSelected
                                        ? 'bg-green-500 text-white shadow-md'
                                        : 'bg-background border border-border hover:border-green-500/50'
                                        }`}
                                >
                                    <div className={`text-sm font-bold flex flex-col items-center leading-tight ${isSelected ? '' : ''}`}>
                                        <span style={isSelected ? {} : getCharColorStyle(monthInfo.stem)}>{monthInfo.stem}</span>
                                        <span style={isSelected ? {} : getCharColorStyle(monthInfo.branch)}>{monthInfo.branch}</span>
                                    </div>
                                    <div className={`text-xs ${isSelected ? 'text-white/90' : ''}`}>
                                        {monthInfo.month}月
                                    </div>
                                    <div className={`text-[10px] ${isSelected ? 'text-white/70' : 'text-foreground-secondary'}`}>
                                        {monthInfo.palace}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* 流日 - 月日历列表 */}
            <div className="bg-background rounded-xl border-border overflow-hidden">
                <SectionHeader
                    title="流日"
                    color={colors.daily}
                    selected={dailySelected}
                    onSelect={() => {
                        setDailySelected(prev => {
                            const next = !prev;
                            if (!next) {
                                setSelectedDay(null);
                            }
                            return next;
                        });
                    }}
                />

                <div className="p-3 pt-0">
                    <div className="text-xs text-foreground-secondary mb-2">
                        {viewYear}年{viewMonth}月 {dailyList.length}天
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                        {dailyList.map(dayInfo => {
                            const isSelected = dailySelected && selectedDay === dayInfo.day && selectedMonth === viewMonth && selectedYear === viewYear;
                            return (
                                <button
                                    key={dayInfo.day}
                                    onClick={() => {
                                        if (isSelected) {
                                            setDailySelected(false);
                                            setSelectedDay(null);
                                            return;
                                        }
                                        if (selectedYear === null) {
                                            setSelectedYear(viewYear);
                                        }
                                        if (selectedMonth === null) {
                                            setSelectedMonth(viewMonth);
                                        }
                                        setSelectedDay(dayInfo.day);
                                        setDailySelected(true);
                                    }}
                                    className={`relative p-1 rounded text-center transition-all ${isSelected
                                        ? 'bg-orange-500 text-white shadow-md'
                                        : 'bg-background border border-border hover:border-orange-500/50'
                                        }`}
                                >
                                    <div className={`text-xs font-bold flex flex-col items-center leading-tight ${isSelected ? '' : ''}`}>
                                        <span style={isSelected ? {} : getCharColorStyle(dayInfo.stem)}>{dayInfo.stem}</span>
                                        <span style={isSelected ? {} : getCharColorStyle(dayInfo.branch)}>{dayInfo.branch}</span>
                                    </div>
                                    <div className={`text-[10px] ${isSelected ? 'text-white/90' : ''}`}>
                                        {dayInfo.day}日
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

            </div>

        </div>
    );
}
