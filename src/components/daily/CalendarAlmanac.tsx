/**
 * 黄历信息展示组件
 * 
 * 显示完整的黄历数据，包括宜忌、吉神凶煞、冲煞、神位等
 */
'use client';

import { useMemo } from 'react';
import {
    Calendar,
    CheckCircle,
    XCircle,
    MapPin,
    Clock,
} from 'lucide-react';
import { getCalendarAlmanac, getZhiShenDesc, isBlackDay } from '@/lib/calendar';
import { getBranchElement, getElementColor, getStemElement } from '@/lib/bazi';

interface CalendarAlmanacProps {
    date: Date;
}

export function CalendarAlmanac({ date }: CalendarAlmanacProps) {
    const data = useMemo(() => getCalendarAlmanac(date), [date]);
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
            {/* 日期标题 */}
            <div className="p-4 border-b border-border">
                <div className="flex items-baseline gap-2 mb-1">
                    <h2 className="text-xl font-bold">{data.solarDateChinese}</h2>
                    <span className="text-accent font-medium">{data.weekday}</span>
                </div>
                <p className="text-foreground-secondary">
                    农历 {data.lunarDate}
                </p>
            </div>

            <div className="p-4 space-y-4">
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
                <div className="pt-3 border-t border-border text-sm space-y-2 text-foreground-secondary">
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
