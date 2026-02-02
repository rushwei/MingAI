/**
 * 签到日历弹窗组件
 *
 * 显示签到记录日历，支持月份切换
 */
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight, X, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface CalendarModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CalendarModal({ isOpen, onClose }: CalendarModalProps) {
    const [loading, setLoading] = useState(true);
    const [calendar, setCalendar] = useState<string[]>([]);
    const [currentMonth, setCurrentMonth] = useState(() => {
        const now = new Date();
        return { year: now.getFullYear(), month: now.getMonth() + 1 };
    });

    const fetchCalendar = useCallback(async () => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) return;

            const res = await fetch(
                `/api/checkin?action=calendar&year=${currentMonth.year}&month=${currentMonth.month}`,
                { headers: { Authorization: `Bearer ${session.access_token}` } }
            );
            const data = await res.json();
            if (data.success) {
                setCalendar(data.data.calendar);
            }
        } catch (error) {
            console.error('获取签到日历失败:', error);
        } finally {
            setLoading(false);
        }
    }, [currentMonth]);

    useEffect(() => {
        if (isOpen) {
            fetchCalendar();
        }
    }, [isOpen, fetchCalendar]);

    // ESC 键关闭
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    const prevMonth = useCallback(() => {
        setCurrentMonth(prev => {
            if (prev.month === 1) {
                return { year: prev.year - 1, month: 12 };
            }
            return { ...prev, month: prev.month - 1 };
        });
    }, []);

    const nextMonth = useCallback(() => {
        setCurrentMonth(prev => {
            if (prev.month === 12) {
                return { year: prev.year + 1, month: 1 };
            }
            return { ...prev, month: prev.month + 1 };
        });
    }, []);

    // 生成日历格子（使用 useMemo 避免每次渲染重新计算）
    const calendarDays = useMemo(() => {
        const { year, month } = currentMonth;
        const firstDay = new Date(year, month - 1, 1).getDay();
        const daysInMonth = new Date(year, month, 0).getDate();
        const today = new Date().toISOString().split('T')[0];

        const days = [];

        // 空白格子
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className="h-9" />);
        }

        // 日期格子
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isCheckedIn = calendar.includes(dateStr);
            const isToday = dateStr === today;

            days.push(
                <div
                    key={day}
                    className={`h-9 flex items-center justify-center rounded-lg text-sm transition-colors ${isCheckedIn
                        ? 'bg-amber-500 text-white'
                        : isToday
                            ? 'bg-amber-500/20 text-amber-500 font-bold border-2 border-amber-500'
                            : 'bg-background-secondary text-foreground-secondary'
                        }`}
                >
                    {isCheckedIn ? <CheckCircle2 className="w-4 h-4" /> : day}
                </div>
            );
        }

        return days;
    }, [currentMonth, calendar]);

    // 统计本月签到天数（使用 useMemo 避免每次渲染重新计算）
    const checkedInThisMonth = useMemo(() => calendar.filter(date => {
        const d = new Date(date);
        return d.getFullYear() === currentMonth.year && d.getMonth() + 1 === currentMonth.month;
    }).length, [calendar, currentMonth]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            {/* 背景遮罩 */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* 弹窗内容 */}
            <div className="relative bg-background rounded-2xl border border-border shadow-xl w-full max-w-md animate-fade-in">
                {/* 头部 */}
                <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={prevMonth}
                            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-background-secondary border border-transparent hover:border-border transition-all"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <h3 className="font-bold flex items-baseline gap-1.5">
                            <span className="text-xl">{currentMonth.month}</span>
                            <span className="text-sm text-foreground-secondary">月 {currentMonth.year}</span>
                        </h3>
                        <button
                            onClick={nextMonth}
                            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-background-secondary border border-transparent hover:border-border transition-all"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-xs text-foreground-secondary">
                            本月签到 <span className="text-amber-500 font-bold">{checkedInThisMonth}</span> 天
                        </span>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-lg hover:bg-background-secondary transition-colors"
                        >
                            <X className="w-4 h-4 text-foreground-secondary" />
                        </button>
                    </div>
                </div>

                {/* 日历内容 */}
                <div className="p-5">
                    {loading ? (
                        <div className="space-y-2">
                            {/* 星期标题骨架 */}
                            <div className="grid grid-cols-7 gap-2 mb-2">
                                {[1, 2, 3, 4, 5, 6, 7].map(i => (
                                    <div key={i} className="h-8 flex items-center justify-center">
                                        <div className="h-3 w-4 rounded bg-foreground/10 animate-pulse" />
                                    </div>
                                ))}
                            </div>
                            {/* 日历格子骨架 */}
                            <div className="grid grid-cols-7 gap-2">
                                {Array.from({ length: 35 }).map((_, i) => (
                                    <div key={i} className="h-9 rounded-lg bg-foreground/10 animate-pulse" />
                                ))}
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* 星期标题 */}
                            <div className="grid grid-cols-7 gap-2 mb-2">
                                {['日', '一', '二', '三', '四', '五', '六'].map(day => (
                                    <div key={day} className="h-8 flex items-center justify-center text-xs font-bold text-foreground-secondary/60">
                                        {day}
                                    </div>
                                ))}
                            </div>

                            {/* 日历格子 */}
                            <div className="grid grid-cols-7 gap-2">
                                {calendarDays}
                            </div>

                            {/* 图例 */}
                            <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-border">
                                <div className="flex items-center gap-1.5 text-xs text-foreground-secondary">
                                    <div className="w-4 h-4 rounded bg-amber-500 flex items-center justify-center">
                                        <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                                    </div>
                                    <span>已签到</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-foreground-secondary">
                                    <div className="w-4 h-4 rounded bg-amber-500/20 border-2 border-amber-500" />
                                    <span>今日</span>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
