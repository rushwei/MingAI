/**
 * 签到页面
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    CalendarCheck,
    Flame,
    Gift,
    Loader2,
    Trophy,
    CheckCircle2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { LoginOverlay } from '@/components/auth/LoginOverlay';
import { useToast } from '@/components/ui/Toast';

interface CheckinStatus {
    canCheckin: boolean;
    lastCheckin: string | null;
    streakDays: number;
    todayCheckedIn: boolean;
}

interface LevelInfo {
    level: number;
    experience: number;
    totalExperience: number;
    title: string;
}

export default function CheckinPage() {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [checking, setChecking] = useState(false);
    const [status, setStatus] = useState<CheckinStatus | null>(null);
    const [level, setLevel] = useState<LevelInfo | null>(null);
    const [calendar, setCalendar] = useState<string[]>([]);
    const [currentMonth, setCurrentMonth] = useState(() => {
        const now = new Date();
        return { year: now.getFullYear(), month: now.getMonth() + 1 };
    });
    const [showSuccess, setShowSuccess] = useState(false);
    const [lastReward, setLastReward] = useState(0);
    const [lastXpReward, setLastXpReward] = useState(10);

    const fetchStatus = useCallback(async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) return;

            const res = await fetch('/api/checkin?action=status', {
                headers: { Authorization: `Bearer ${session.access_token}` },
            });
            const data = await res.json();
            if (data.success) {
                setStatus(data.data.status);
                setLevel(data.data.level);
            }
        } catch (error) {
            console.error('获取签到状态失败:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchCalendar = useCallback(async () => {
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
        }
    }, [currentMonth]);

    useEffect(() => {
        fetchStatus();
    }, [fetchStatus]);

    useEffect(() => {
        fetchCalendar();
    }, [fetchCalendar]);

    const handleCheckin = async () => {
        if (!status?.canCheckin || checking) return;

        setChecking(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) {
                showToast('error', '请先登录');
                return;
            }

            const res = await fetch('/api/checkin', {
                method: 'POST',
                headers: { Authorization: `Bearer ${session.access_token}` },
            });
            const data = await res.json();

            if (data.success) {
                setLastReward(data.data.result.rewardCredits);
                setLastXpReward(data.data.result.rewardXp || 10);
                setShowSuccess(true);
                setStatus(prev => prev ? { ...prev, canCheckin: false, todayCheckedIn: true, streakDays: data.data.result.streakDays } : null);
                if (data.data.level) {
                    setLevel(data.data.level);
                }
                fetchCalendar();

                if (data.data.result.leveledUp) {
                    showToast('success', `恭喜升级到 ${data.data.level?.title || '新等级'}！`);
                }

                setTimeout(() => setShowSuccess(false), 3000);
            } else {
                showToast('error', data.error || '签到失败');
            }
        } catch (error) {
            console.error('签到失败:', error);
            showToast('error', '签到失败，请稍后重试');
        } finally {
            setChecking(false);
        }
    };

    // 生成日历格子
    const renderCalendar = () => {
        const { year, month } = currentMonth;
        const firstDay = new Date(year, month - 1, 1).getDay();
        const daysInMonth = new Date(year, month, 0).getDate();
        const today = new Date().toISOString().split('T')[0];

        const days = [];

        // 空白格子
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className="h-10" />);
        }

        // 日期格子
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isCheckedIn = calendar.includes(dateStr);
            const isToday = dateStr === today;

            days.push(
                <div
                    key={day}
                    className={`h-10 flex items-center justify-center rounded-lg text-sm transition-colors ${isCheckedIn
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
    };

    const prevMonth = () => {
        setCurrentMonth(prev => {
            if (prev.month === 1) {
                return { year: prev.year - 1, month: 12 };
            }
            return { ...prev, month: prev.month - 1 };
        });
    };

    const nextMonth = () => {
        setCurrentMonth(prev => {
            if (prev.month === 12) {
                return { year: prev.year + 1, month: 1 };
            }
            return { ...prev, month: prev.month + 1 };
        });
    };

    if (loading) {
        return (
            <LoginOverlay message="登录后查看签到">
                <div className="min-h-screen flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                </div>
            </LoginOverlay>
        );
    }

    return (
        <LoginOverlay message="登录后签到领取奖励">
            <div className="min-h-screen bg-background relative overflow-hidden">
                <div className="max-w-3xl mx-auto px-4 py-8 relative z-10 animate-fade-in">
                    {/* 头部 */}
                    <div className="hidden md:block flex items-center gap-4 mb-4 md:mb-8">
                        <div>
                            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-500 to-orange-600 tracking-tight">每日签到</h1>
                            <p className="text-foreground-secondary text-sm mt-1.5 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                坚持签到，累积好运与奖励
                            </p>
                        </div>
                    </div>

                    {/* 等级信息 */}
                    {level && (
                        <div className="relative overflow-hidden bg-background/80 backdrop-blur-xl border border-border/60 rounded-[2rem] p-8 mb-8 shadow-2xl group">
                            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-orange-500/5 group-hover:from-amber-500/10 transition-colors duration-500" />
                            <div className="absolute right-0 top-0 w-32 h-32 bg-gradient-to-br from-amber-400/20 to-transparent rounded-bl-[100px] opacity-50" />

                            <div className="relative flex flex-col sm:flex-row items-center gap-8">
                                <div className="relative flex-shrink-0 group-hover:scale-105 transition-transform duration-500">
                                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/30 transform rotate-3 ring-4 ring-background">
                                        <Trophy className="w-12 h-12 text-white drop-shadow-md" />
                                    </div>
                                    <div className="absolute -bottom-3 -right-3 bg-background border-2 border-amber-100 dark:border-amber-900 rounded-full px-3 py-1 text-xs font-black text-amber-600 dark:text-amber-400 shadow-md transform -rotate-3">
                                        Lv.{level.level}
                                    </div>
                                </div>

                                <div className="flex-1 min-w-0 w-full text-center sm:text-left">
                                    <div className="flex flex-col sm:flex-row items-center justify-between mb-3 gap-2">
                                        <h2 className="text-2xl font-bold text-foreground">{level.title}</h2>
                                        <span className="text-sm font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-3 py-1 rounded-full">
                                            {level.experience} <span className="text-foreground-secondary/70 font-normal">/</span> {getNextLevelXp(level.level)} XP
                                        </span>
                                    </div>

                                    <div className="h-5 bg-background-secondary rounded-full overflow-hidden border border-border/50 p-1 shadow-inner">
                                        <div
                                            className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-1000 ease-out relative overflow-hidden shadow-sm"
                                            style={{ width: `${Math.min(level.experience / getNextLevelXp(level.level) * 100, 100)}%` }}
                                        >
                                            <div className="absolute inset-y-0 left-0 right-0 w-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full" />
                                        </div>
                                    </div>
                                    <div className="text-sm text-foreground-secondary mt-3 flex items-center justify-center sm:justify-start gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                                        距离下一级还需 <span className="font-bold text-foreground">{getNextLevelXp(level.level) - level.experience}</span> 经验，加油！
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 签到卡片 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div className="bg-background backdrop-blur-sm rounded-3xl border border-border p-8 flex flex-col items-center justify-center relative overflow-hidden group">
                            {/* 签到背景光效 */}
                            {status?.canCheckin && !checking && (
                                <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            )}

                            {/* 连续签到 */}
                            <div className="flex flex-col items-center mb-6 relative z-10">
                                <span className="text-sm text-foreground-secondary mb-1">已连续签到</span>
                                <div className="flex items-end gap-2">
                                    <Flame className="w-8 h-8 text-orange-500 animate-pulse" />
                                    <span className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-amber-500 to-orange-600 font-mono tracking-tighter">
                                        {status?.streakDays || 0}
                                    </span>
                                    <span className="text-lg font-medium text-foreground-secondary mb-1">天</span>
                                </div>
                            </div>

                            {/* 签到按钮 */}
                            <button
                                onClick={handleCheckin}
                                disabled={!status?.canCheckin || checking}
                                className={`
                                    relative w-40 h-40 rounded-full flex flex-col items-center justify-center gap-3 transition-all duration-500
                                    ${status?.todayCheckedIn
                                        ? 'bg-gradient-to-br from-green-500/10 to-emerald-500/10 text-green-600 border border-green-500/20 cursor-default scale-95 shadow-inner'
                                        : 'bg-gradient-to-br from-amber-400 to-orange-600 text-white shadow-[0_10px_30px_-10px_rgba(245,158,11,0.5)] hover:shadow-[0_20px_40px_-10px_rgba(245,158,11,0.6)] hover:scale-105 active:scale-95'
                                    }
                                    ${checking ? 'cursor-wait opacity-90' : ''}
                                `}
                            >
                                {status?.canCheckin && !checking && (
                                    <div className="absolute inset-0 rounded-full border-2 border-white/20 animate-ping opacity-20" />
                                )}

                                {checking ? (
                                    <Loader2 className="w-10 h-10 animate-spin" />
                                ) : status?.todayCheckedIn ? (
                                    <>
                                        <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center shadow-lg">
                                            <CheckCircle2 className="w-7 h-7 text-white" />
                                        </div>
                                        <span className="text-base font-bold">已签到</span>
                                    </>
                                ) : (
                                    <>
                                        <CalendarCheck className="w-10 h-10 drop-shadow-md" />
                                        <span className="text-lg font-bold tracking-wider">立即签到</span>
                                        <div className="absolute bottom-6 text-[10px] opacity-80 bg-black/10 px-2 py-0.5 rounded-full">
                                            +{(status?.streakDays || 0) >= 30 ? 11 : 10} 经验
                                        </div>
                                    </>
                                )}
                            </button>

                            {/* 成功提示 */}
                            {showSuccess && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm z-20 animate-zoom-in">
                                    <div className="text-6xl mb-4 animate-[bounce_1s_infinite]">🎁</div>
                                    <div className="text-xl font-bold text-amber-500 mb-2">签到成功！</div>
                                    <div className="flex items-center gap-3 text-sm font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-4 py-2 rounded-full">
                                        {lastReward > 0 && (
                                            <>
                                                <span>+{lastReward} 积分</span>
                                                <span className="w-1 h-1 bg-current rounded-full" />
                                            </>
                                        )}
                                        <span>+{lastXpReward} 经验</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 奖励说明小卡片 */}
                        <div className="bg-background backdrop-blur-sm rounded-3xl border border-border p-6 flex flex-col">
                            <h4 className="font-bold mb-4 flex items-center gap-2 text-lg">
                                <Gift className="w-5 h-5 text-amber-500" />
                                奖励规则
                            </h4>
                            <div className="flex-1 space-y-4">
                                <div className="flex items-start gap-3 p-3 rounded-xl bg-background/50 border border-border hover:bg-background transition-colors">
                                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0 text-blue-500 font-bold text-xs">
                                        日常
                                    </div>
                                    <div className="text-sm">
                                        <div className="font-medium text-foreground">每日签到</div>
                                        <div className="text-foreground-secondary text-xs mt-0.5">获得 10 经验值</div>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 p-3 rounded-xl bg-background/50 border border-border hover:bg-background transition-colors">
                                    <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0 text-green-500 font-bold text-xs">
                                        升级
                                    </div>
                                    <div className="text-sm">
                                        <div className="font-medium text-foreground">等级提升</div>
                                        <div className="text-foreground-secondary text-xs mt-0.5">+1 积分 & +1 积分上限</div>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 p-3 rounded-xl bg-background/50 border border-border hover:bg-background transition-colors">
                                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0 text-purple-500 font-bold text-xs">
                                        7天
                                    </div>
                                    <div className="text-sm">
                                        <div className="font-medium text-foreground">每7天连续签到</div>
                                        <div className="text-foreground-secondary text-xs mt-0.5">额外 +1 积分奖励</div>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 p-3 rounded-xl bg-background/50 border border-border hover:bg-background transition-colors">
                                    <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0 text-red-500 font-bold text-xs">
                                        30天
                                    </div>
                                    <div className="text-sm">
                                        <div className="font-medium text-foreground">每30天连续签到</div>
                                        <div className="text-foreground-secondary text-xs mt-0.5">额外 +5 积分，每日经验提升至 11</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 签到日历 */}
                    <div className="bg-background backdrop-blur-sm rounded-3xl border border-border p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <button
                                onClick={prevMonth}
                                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-background-secondary border border-transparent hover:border-border transition-all"
                            >
                                ←
                            </button>
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <span className="text-2xl">{currentMonth.month}</span>
                                <span className="text-sm text-foreground-secondary uppercase tracking-wider">{currentMonth.year}</span>
                            </h3>
                            <button
                                onClick={nextMonth}
                                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-background-secondary border border-transparent hover:border-border transition-all"
                            >
                                →
                            </button>
                        </div>

                        {/* 星期标题 */}
                        <div className="grid grid-cols-7 gap-2 mb-3">
                            {['日', '一', '二', '三', '四', '五', '六'].map(day => (
                                <div key={day} className="h-8 flex items-center justify-center text-xs font-bold text-foreground-secondary/60">
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* 日历格子 */}
                        <div className="grid grid-cols-7 gap-2">
                            {renderCalendar()}
                        </div>
                    </div>
                </div>
            </div>
        </LoginOverlay>
    );
}

// 获取下一级所需经验
function getNextLevelXp(level: number): number {
    const xpTable: Record<number, number> = {
        1: 100, 2: 200, 3: 400, 4: 800, 5: 1600, 6: 3200, 7: 6400, 8: 12800
    };
    return xpTable[level] || 12800;
}
