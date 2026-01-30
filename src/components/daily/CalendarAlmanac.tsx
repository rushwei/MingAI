/**
 * 黄历信息展示组件
 *
 * 显示完整的黄历数据，包括宜忌、吉神凶煞、冲煞、神位等
 * 支持整合日期选择器、命盘选择器和流日/主神信息
 */
'use client';

import { useMemo } from 'react';
import {
    Calendar,
    CheckCircle,
    XCircle,
    MapPin,
    Clock,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    User,
} from 'lucide-react';
import Link from 'next/link';
import { getCalendarAlmanac, getZhiShenDesc, isBlackDay } from '@/lib/calendar';
import { getBranchElement, getElementColor, getStemElement } from '@/lib/bazi';

interface CalendarAlmanacProps {
    date: Date;
    /** 日期变更回调 */
    onDateChange?: (days: number) => void;
    /** 回到今天回调 */
    onGoToday?: () => void;
    /** 是否为今天 */
    isToday?: boolean;
    /** 命盘名称 */
    chartName?: string;
    /** 点击命盘选择器回调 */
    onChartSelect?: () => void;
    /** 是否为个性化模式 */
    isPersonalized?: boolean;
    /** 流日干支 */
    dayStem?: string;
    dayBranch?: string;
    /** 主神（十神） */
    tenGod?: string;
}

export function CalendarAlmanac({
    date,
    onDateChange,
    onGoToday,
    isToday = false,
    chartName,
    onChartSelect,
    isPersonalized = false,
    dayStem,
    dayBranch,
    tenGod,
}: CalendarAlmanacProps) {
    const data = useMemo(() => getCalendarAlmanac(date), [date]);

    // 流日干支颜色
    const dayStemElement = dayStem ? getStemElement(dayStem) : null;
    const dayBranchElement = dayBranch ? getBranchElement(dayBranch) : null;
    const dayStemColor = dayStemElement ? getElementColor(dayStemElement) : undefined;
    const dayBranchColor = dayBranchElement ? getElementColor(dayBranchElement) : undefined;

    const renderGanZhi = (value: string) => {
        const stem = value?.[0] || '';
        const branch = value?.[1] || '';
        const stemElement = getStemElement(stem);
        const branchElement = getBranchElement(branch);
        const stemColor = stemElement ? getElementColor(stemElement) : undefined;
        const branchColor = branchElement ? getElementColor(branchElement) : undefined;

        return (
            <span>
                <span style={{ color: stemColor }}>{stem}</span>
                <span style={{ color: branchColor }}>{branch}</span>
            </span>
        );
    };

    return (
        <section className="bg-background rounded-xl border border-border overflow-hidden">
            {/* 顶部控制栏：日期切换（含日期信息）+ 流日/主神 + 命盘选择 */}
            {onDateChange && (
                <div className="px-3 py-8 border-b border-border/50 bg-background">
                    <div className="flex items-center justify-between gap-3">
                        {/* 左侧：← 日期信息 → */}
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => onDateChange(-1)}
                                className="p-1.5 rounded-md hover:bg-background border border-transparent hover:border-border transition-all text-foreground-secondary hover:text-foreground"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <div className="text-center px-2">
                                <div className="flex items-baseline justify-center gap-2">
                                    <span className="text-xl font-bold">{data.solarDateChinese}</span>
                                    <span className="text-accent font-medium">{data.weekday}</span>
                                </div>
                                <p className="text-foreground-secondary text-sm">
                                    农历 {data.lunarDate}
                                </p>
                            </div>
                            <button
                                onClick={() => onDateChange(1)}
                                className="p-1.5 rounded-md hover:bg-background border border-transparent hover:border-border transition-all text-foreground-secondary hover:text-foreground"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>

                            {!isToday && onGoToday && (
                                <button
                                    onClick={onGoToday}
                                    className="ml-1 px-2 py-1 text-xs bg-accent/10 hover:bg-accent/20 text-accent rounded-md transition-colors"
                                >
                                    今
                                </button>
                            )}
                        </div>

                        {/* 中间：流日/主神（竖排） */}
                        {isPersonalized && dayStem && tenGod && (
                            <div className="flex flex-col items-center gap-0.5 text-sm">
                                <div className="flex items-center gap-1">
                                    <span className="text-foreground-secondary">流日: </span>
                                    <span className="font-bold">
                                        <span style={{ color: dayStemColor }}>{dayStem}</span>
                                        <span style={{ color: dayBranchColor }}>{dayBranch}</span>
                                    </span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <span className="text-foreground-secondary">主神: </span>
                                    <span className="font-bold">{tenGod}</span>
                                </div>
                            </div>
                        )}

                        {/* 右侧：命盘选择 */}
                        {isPersonalized && onChartSelect ? (
                            <button
                                onClick={onChartSelect}
                                className="flex items-center gap-1 px-2 py-1 bg-background hover:bg-background-secondary rounded-xl border border-border/60 hover:border-purple-500/30 transition-all text-sm"
                            >
                                当前命盘为:
                                <span className="font-medium text-purple-600 dark:text-purple-400 max-w-[50px] truncate">
                                    {chartName}
                                </span>
                                <ChevronDown className="w-3 h-3 text-foreground-secondary" />
                            </button>
                        ) : !isPersonalized && (
                            <Link
                                href="/bazi"
                                className="flex items-center gap-1 px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded-md text-xs text-amber-600 hover:bg-amber-500/20 transition-colors"
                            >
                                <User className="w-3 h-3" />
                                <span>个性化</span>
                            </Link>
                        )}
                    </div>
                </div>
            )}

            {/* 无控制栏时显示日期标题 */}
            {!onDateChange && (
                <div className="p-4 border-b border-border">
                    <div className="flex items-baseline gap-2 mb-0.5">
                        <h2 className="text-xl font-bold">{data.solarDateChinese}</h2>
                        <span className="text-accent font-medium">{data.weekday}</span>
                    </div>
                    <p className="text-foreground-secondary text-sm">
                        农历 {data.lunarDate}
                    </p>
                </div>
            )}

            <div className="p-6 space-y-6">
                {/* 生肖 & 干支 */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <span className="text-foreground-secondary">生肖：</span>
                        <span>{data.shengXiao.year} {data.shengXiao.month} {data.shengXiao.day}</span>
                    </div>
                    <div>
                        <span className="text-foreground-secondary">干支：</span>
                        <span>
                            {renderGanZhi(data.ganZhi.year)} {renderGanZhi(data.ganZhi.month)} {renderGanZhi(data.ganZhi.day)}
                        </span>
                    </div>
                </div>

                {/* 纳音 */}
                <div className="text-sm">
                    <span className="text-foreground-secondary">纳音：</span>
                    <span>{data.naYin.year} {data.naYin.month} {data.naYin.day}</span>
                </div>

                {/* 节气 */}
                {(data.jieQi.current || data.jieQi.next) && (
                    <div className="p-3 rounded-lg border border-border text-sm space-y-1">
                        <div className="text-foreground-secondary font-medium mb-2">节气：</div>
                        {data.jieQi.current && (
                            <div className="flex items-center gap-2">
                                <Calendar className="w-3.5 h-3.5 text-accent" />
                                <span>当前节气：{data.jieQi.current.name} ({data.jieQi.current.date})</span>
                                <Clock className="w-3 h-3 text-foreground-tertiary ml-1" />
                                <span className="text-foreground-secondary text-xs">{data.jieQi.current.time}</span>
                            </div>
                        )}
                        {data.jieQi.next && (
                            <div className="flex items-center gap-2">
                                <Calendar className="w-3.5 h-3.5 text-foreground-secondary" />
                                <span className="text-foreground-secondary">下一节气：{data.jieQi.next.name} ({data.jieQi.next.date})</span>
                                <Clock className="w-3 h-3 text-foreground-tertiary ml-1" />
                                <span className="text-foreground-tertiary text-xs">{data.jieQi.next.time}</span>
                            </div>
                        )}
                    </div>
                )}

                {/* 宜忌 */}
                <div className="grid grid-cols-2 gap-4">
                    {/* 宜 */}
                    <div>
                        <h3 className="text-sm font-medium text-emerald-500 flex items-center gap-1 mb-2">
                            <CheckCircle className="w-3.5 h-3.5" />
                            宜
                        </h3>
                        <div className="flex flex-wrap gap-1.5">
                            {data.yi.length > 0 ? (
                                data.yi.slice(0, 6).map((item, idx) => (
                                    <span
                                        key={idx}
                                        className="px-2 py-0.5 text-xs rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                    >
                                        {item}
                                    </span>
                                ))
                            ) : (
                                <span className="text-xs text-foreground-secondary">诸事不宜</span>
                            )}
                        </div>
                    </div>

                    {/* 忌 */}
                    <div>
                        <h3 className="text-sm font-medium text-rose-500 flex items-center gap-1 mb-2">
                            <XCircle className="w-3.5 h-3.5" />
                            忌
                        </h3>
                        <div className="flex flex-wrap gap-1.5">
                            {data.ji.length > 0 ? (
                                data.ji.slice(0, 6).map((item, idx) => (
                                    <span
                                        key={idx}
                                        className="px-2 py-0.5 text-xs rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                                    >
                                        {item}
                                    </span>
                                ))
                            ) : (
                                <span className="text-xs text-foreground-secondary">无</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* 吉神凶煞 */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <h3 className="font-medium mb-1">吉神</h3>
                        <p className="text-emerald-600 dark:text-emerald-400">
                            {data.jiShen.length > 0 ? data.jiShen.join('、') : '无'}
                        </p>
                    </div>
                    <div>
                        <h3 className="font-medium mb-1">凶煞</h3>
                        <p className="text-rose-600 dark:text-rose-400">
                            {data.xiongSha.length > 0 ? data.xiongSha.join('、') : '无'}
                        </p>
                    </div>
                </div>

                {/* 冲煞 & 空亡 */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <span className="text-foreground-secondary">冲煞：</span>
                        <span>{data.chongSha.chong || '-'}</span>
                    </div>
                    <div>
                        <span className="text-foreground-secondary">空亡：</span>
                        <span>{data.kongWang || '-'}</span>
                    </div>
                </div>

                {/* 胎神 & 天神 */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <span className="text-foreground-secondary">胎神：</span>
                        <span>{data.taiShen || '-'}</span>
                    </div>
                    <div>
                        <span className="text-foreground-secondary">天神：</span>
                        <span className={isBlackDay(data.zhiShen) ? 'text-rose-500' : 'text-emerald-500'}>
                            {getZhiShenDesc(data.zhiShen) || '-'}
                        </span>
                    </div>
                </div>

                {/* 神位 */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-foreground-secondary">财神位：</span>
                        <span>{data.shenWei.caiShen || '-'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-pink-500" />
                        <span className="text-foreground-secondary">喜神位：</span>
                        <span>{data.shenWei.xiShen || '-'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-foreground-secondary">福神位：</span>
                        <span>{data.shenWei.fuShen || '-'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-purple-500" />
                        <span className="text-foreground-secondary">阳贵神：</span>
                        <span>{data.shenWei.yangGuiShen || '-'}</span>
                    </div>
                </div>

                {/* 扩展信息 */}
                <div className="pt-8 border-t border-border text-sm space-y-2 text-foreground-secondary">
                    <div className="flex justify-between">
                        <span>二十八宿：{data.xiu.gong} {data.xiu.name} ({data.xiu.luck})</span>
                        <span>月相：{data.yueXiang}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>六曜：{data.liuYao}</span>
                        <span>九星：{data.jiuXing}</span>
                    </div>
                    <div>
                        <span>物候：{data.wuHou}</span>
                    </div>
                </div>
            </div>
        </section>
    );
}
