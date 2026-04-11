'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/auth';

interface CheckinCalendarPanelProps {
  active?: boolean;
}

export function CheckinCalendarPanel({ active = true }: CheckinCalendarPanelProps) {
  const [loading, setLoading] = useState(true);
  const [calendar, setCalendar] = useState<string[]>([]);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });

  const fetchCalendar = useCallback(async () => {
    if (!active) return;

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setCalendar([]);
        return;
      }

      const response = await fetch(
        `/api/checkin?action=calendar&year=${currentMonth.year}&month=${currentMonth.month}`,
        { headers: { Authorization: `Bearer ${session.access_token}` } },
      );
      const data = await response.json();
      if (data.success) {
        setCalendar(data.data.calendar || []);
      } else {
        setCalendar([]);
      }
    } catch (error) {
      console.error('获取签到日历失败:', error);
      setCalendar([]);
    } finally {
      setLoading(false);
    }
  }, [active, currentMonth]);

  useEffect(() => {
    if (!active) return;
    void fetchCalendar();
  }, [active, fetchCalendar]);

  const prevMonth = useCallback(() => {
    setCurrentMonth((prev) => {
      if (prev.month === 1) {
        return { year: prev.year - 1, month: 12 };
      }
      return { ...prev, month: prev.month - 1 };
    });
  }, []);

  const nextMonth = useCallback(() => {
    setCurrentMonth((prev) => {
      if (prev.month === 12) {
        return { year: prev.year + 1, month: 1 };
      }
      return { ...prev, month: prev.month + 1 };
    });
  }, []);

  const calendarDays = useMemo(() => {
    const { year, month } = currentMonth;
    const firstDay = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    const today = new Date().toISOString().split('T')[0];
    const days: JSX.Element[] = [];

    for (let index = 0; index < firstDay; index += 1) {
      days.push(<div key={`empty-${index}`} className="h-9" />);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isCheckedIn = calendar.includes(dateStr);
      const isToday = dateStr === today;

      days.push(
        <div
          key={day}
          className={`flex h-9 items-center justify-center rounded-lg text-sm transition-colors ${
            isCheckedIn
              ? 'bg-amber-500 text-white'
              : isToday
                ? 'border border-amber-500/50 bg-amber-500/10 font-semibold text-amber-600'
                : 'bg-[#f7f6f3] text-[#37352f]/55'
          }`}
        >
          {isCheckedIn ? <CheckCircle2 className="h-4 w-4" /> : day}
        </div>,
      );
    }

    return days;
  }, [calendar, currentMonth]);

  const checkedInThisMonth = useMemo(() => {
    const prefix = `${currentMonth.year}-${String(currentMonth.month).padStart(2, '0')}`;
    return calendar.filter((date) => date.startsWith(prefix)).length;
  }, [calendar, currentMonth]);

  return (
    <div className="rounded-lg border border-[#ebe8e2] bg-[#fbfaf7] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={prevMonth}
            className="flex h-7 w-7 items-center justify-center rounded-md text-[#37352f]/55 transition-colors duration-150 hover:bg-[#efedea] hover:text-[#37352f]"
            aria-label="查看上个月"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="text-sm font-medium text-[#37352f]">
            {currentMonth.year} 年 {currentMonth.month} 月
          </div>
          <button
            type="button"
            onClick={nextMonth}
            className="flex h-7 w-7 items-center justify-center rounded-md text-[#37352f]/55 transition-colors duration-150 hover:bg-[#efedea] hover:text-[#37352f]"
            aria-label="查看下个月"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="text-xs text-[#37352f]/50">
          本月 {checkedInThisMonth} 天
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 7 }).map((_, index) => (
              <div key={index} className="flex h-8 items-center justify-center">
                <div className="h-3 w-4 rounded bg-[#37352f]/10 animate-pulse" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }).map((_, index) => (
              <div key={index} className="h-9 rounded-lg bg-[#37352f]/8 animate-pulse" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="mb-2 grid grid-cols-7 gap-2">
            {['日', '一', '二', '三', '四', '五', '六'].map((day) => (
              <div key={day} className="flex h-8 items-center justify-center text-xs text-[#37352f]/40">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {calendarDays}
          </div>
        </>
      )}
    </div>
  );
}
