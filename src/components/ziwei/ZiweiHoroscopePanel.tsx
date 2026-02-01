'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { TrendingUp, Calendar } from 'lucide-react';
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

    // 大限选择 - 支持取消，切换大限时清除流年/流月/流日
    const handleDecadalSelect = (d: DecadalInfo) => {
        setSelectedDecadalIndex(prev => {
            const nextIndex = prev === d.index ? null : d.index;
            const nextSelected = nextIndex !== null;
            setDecadalSelected(nextSelected);
            // 无论是取消还是切换大限，都清除流年/流月/流日
            setYearlySelected(false);
            setMonthlySelected(false);
            setDailySelected(false);
            setSelectedYear(null);
            setSelectedMonth(null);
            setSelectedDay(null);
            return nextIndex;
        });
    };

    // 获取天干或地支的五行颜色样式
    const getCharColorStyle = (char: string) => {
        const stemElement = getStemElement(char);
        if (stemElement) return { color: getElementColor(stemElement) };
        const branchElement = getBranchElement(char);
        if (branchElement) return { color: getElementColor(branchElement) };
        return {};
    };

    return (
        <div className="sm:space-y-4 space-y-1">
            {/* 大限 */}
            <section className="bg-background rounded-xl md:p-4 p-1 max-w-[390px] mx-auto sm:max-w-none">
                <h2 className="text-base font-semibold sm:mb-3 mb-1 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-accent" />
                    大限（每运10年）
                </h2>
                <div className="overflow-x-auto sm:-mx-4 sm:px-4 scrollbar-hide">
                    <div className="flex sm:gap-2 gap-1 min-w-max sm:pb-2">
                        {decadalList.slice(0, 10).map(d => {
                            const isSelected = decadalSelected && selectedDecadalIndex === d.index;
                            return (
                                <button
                                    key={d.index}
                                    onClick={() => handleDecadalSelect(d)}
                                    className={`
                                        flex-shrink-0 w-9.5 sm:w-16 text-center sm:p-2 rounded-lg border-2 transition-all
                                        ${isSelected
                                            ? 'border-accent bg-accent/10'
                                            : 'border-transparent bg-background hover:bg-background'
                                        }
                                    `}
                                >
                                    <div className="text-xs text-foreground-secondary">{d.palace.name}</div>
                                    <div className="text-xs text-foreground-secondary">{d.startAge}岁</div>
                                    <div className="flex flex-col items-center mt-1">
                                        <span
                                            className="text-base sm:text-lg font-bold"
                                            style={getCharColorStyle(d.heavenlyStem)}
                                        >
                                            {d.heavenlyStem}
                                        </span>
                                        <span
                                            className="text-base sm:text-lg font-bold"
                                            style={getCharColorStyle(d.palace.earthlyBranch)}
                                        >
                                            {d.palace.earthlyBranch}
                                        </span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* 流年 */}
            {displayDecadal && yearlyList.length > 0 && (
                <section className="bg-background rounded-xl md:p-4 p-1 max-w-[390px] mx-auto sm:max-w-none">
                    <h2 className="text-base font-semibold sm:mb-3 mb-1 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-accent" />
                        流年
                    </h2>
                    <div className="overflow-x-auto sm:-mx-4 sm:px-4 scrollbar-hide">
                        <div className="flex sm:gap-2 gap-1 min-w-max sm:pb-2">
                            {yearlyList.map(yearInfo => {
                                const isSelected = yearlySelected && selectedYear === yearInfo.year;
                                const birthYear = parseInt(chart.solarDate.split('-')[0]);
                                const age = yearInfo.year - birthYear;
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
                                        className={`
                                            flex-shrink-0 w-9.5 sm:w-14 text-center sm:p-2 rounded-lg border-2 transition-all
                                            ${isSelected
                                                ? 'border-accent bg-accent/10'
                                                : 'border-transparent bg-background hover:bg-background'
                                            }
                                        `}
                                    >
                                        <div className="text-xs text-foreground-secondary">{yearInfo.year}</div>
                                        <div className="flex flex-col items-center mt-1">
                                            <span
                                                className="text-sm sm:text-base font-bold"
                                                style={getCharColorStyle(yearInfo.stem)}
                                            >
                                                {yearInfo.stem}
                                            </span>
                                            <span
                                                className="text-sm sm:text-base font-bold"
                                                style={getCharColorStyle(yearInfo.branch)}
                                            >
                                                {yearInfo.branch}
                                            </span>
                                        </div>
                                        <div className="text-xs text-foreground-secondary">{age}岁</div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </section>
            )}

            {/* 流月 */}
            {selectedYear && monthlyList.length > 0 && (
                <section className="bg-background rounded-xl md:p-4 p-1 max-w-[390px] mx-auto sm:max-w-none">
                    <h2 className="text-base font-semibold sm:mb-3 mb-1 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-accent" />
                        {viewYear}年流月
                    </h2>
                    <div className="overflow-x-auto sm:-mx-4 sm:px-4 scrollbar-hide">
                        <div className="flex sm:gap-1.5 gap-1 min-w-max sm:pb-2">
                            {monthlyList.map(monthInfo => {
                                const isSelected = monthlySelected && selectedMonth === monthInfo.month && selectedYear === viewYear;
                                return (
                                    <button
                                        key={monthInfo.month}
                                        type="button"
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
                                        className={`
                                            flex-shrink-0 w-9 sm:w-12 text-center sm:p-1.5 rounded-lg border-2 transition-all
                                            ${isSelected
                                                ? 'border-accent bg-accent/10'
                                                : 'border-transparent bg-background hover:bg-background-secondary'
                                            }
                                        `}
                                    >
                                        <div className="text-xs text-foreground-secondary">{monthInfo.month}月</div>
                                        <div className="flex flex-col items-center mt-0.5">
                                            <span
                                                className="text-sm font-bold"
                                                style={getCharColorStyle(monthInfo.stem)}
                                            >
                                                {monthInfo.stem}
                                            </span>
                                            <span
                                                className="text-sm font-bold"
                                                style={getCharColorStyle(monthInfo.branch)}
                                            >
                                                {monthInfo.branch}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    <p className="mt-2 text-xs text-foreground-secondary">
                        点击流月可查看对应的流日
                    </p>
                </section>
            )}

            {/* 流日 */}
            {selectedMonth && dailyList.length > 0 && (
                <section className="bg-background rounded-xl md:p-4 p-1 max-w-[390px] mx-auto sm:max-w-none">
                    <h2 className="text-base font-semibold sm:mb-3 mb-1 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-accent" />
                        {viewYear}年{viewMonth}月流日
                    </h2>
                    <div className="overflow-x-auto sm:-mx-4 sm:px-4 scrollbar-hide">
                        <div className="flex sm:gap-1.5 gap-1 min-w-max sm:pb-2">
                            {dailyList.map(dayInfo => {
                                const isSelected = dailySelected && selectedDay === dayInfo.day && selectedMonth === viewMonth && selectedYear === viewYear;
                                return (
                                    <button
                                        key={dayInfo.day}
                                        type="button"
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
                                        className={`
                                            flex-shrink-0 w-10.5 sm:w-13 text-center sm:p-1.5 rounded-lg border-2 transition-all
                                            ${isSelected
                                                ? 'border-accent bg-accent/10'
                                                : 'border-transparent bg-background hover:bg-background-secondary'
                                            }
                                        `}
                                    >
                                        <div className="text-xs text-foreground-secondary">{dayInfo.day}日</div>
                                        <div className="flex flex-col items-center gap-0.5 text-xs mt-0.5">
                                            <span
                                                className="font-semibold"
                                                style={getCharColorStyle(dayInfo.stem)}
                                            >
                                                {dayInfo.stem}
                                            </span>
                                            <span
                                                className="font-semibold"
                                                style={getCharColorStyle(dayInfo.branch)}
                                            >
                                                {dayInfo.branch}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </section>
            )}

        </div>
    );
}
