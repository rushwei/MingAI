/**
 * 签到弹窗组件
 *
 * 替代独立签到页面，在用户中心以弹窗形式打开
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    CalendarCheck,
    Flame,
    Gift,
    Loader2,
    Trophy,
    CheckCircle2,
    X,
    Calendar,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/Toast';
import { CalendarModal } from './CalendarModal';

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

function getNextLevelXp(level: number): number {
    const xpTable: Record<number, number> = {
        1: 100, 2: 200, 3: 400, 4: 800, 5: 1600, 6: 3200, 7: 6400, 8: 12800,
    };
    return xpTable[level] || 12800;
}

interface CheckinModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCheckinSuccess?: () => void;
}

export function CheckinModal({ isOpen, onClose, onCheckinSuccess }: CheckinModalProps) {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [checking, setChecking] = useState(false);
    const [status, setStatus] = useState<CheckinStatus | null>(null);
    const [level, setLevel] = useState<LevelInfo | null>(null);
    const [showCalendar, setShowCalendar] = useState(false);

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

    const handleCheckin = useCallback(async () => {
        if (checking || !status?.canCheckin) return;

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
                const rewardCredits = data.data.result.rewardCredits;
                const rewardXp = data.data.result.rewardXp || 10;

                setStatus(prev => prev ? {
                    ...prev,
                    canCheckin: false,
                    todayCheckedIn: true,
                    streakDays: data.data.result.streakDays,
                } : null);

                if (data.data.level) {
                    setLevel(data.data.level);
                }

                // 显示签到成功提示
                const rewardText = rewardCredits > 0
                    ? `签到成功！+${rewardXp} 经验，+${rewardCredits} 积分`
                    : `签到成功！+${rewardXp} 经验`;
                showToast('success', rewardText);

                // 通知父组件签到成功
                onCheckinSuccess?.();

                if (data.data.result.leveledUp) {
                    setTimeout(() => {
                        showToast('success', `恭喜升级到 ${data.data.level?.title || '新等级'}！`);
                    }, 1500);
                }
            } else {
                showToast('error', data.error || '签到失败');
            }
        } catch (error) {
            console.error('签到失败:', error);
            showToast('error', '签到失败，请稍后重试');
        } finally {
            setChecking(false);
        }
    }, [checking, status?.canCheckin, showToast, onCheckinSuccess]);

    // 弹窗打开时获取状态
    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            fetchStatus();
        }
    }, [isOpen, fetchStatus]);

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

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                {/* 背景遮罩 */}
                <div
                    className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                    onClick={onClose}
                />

                {/* 弹窗内容 */}
                <div className="relative bg-background rounded-2xl border border-border shadow-xl w-full max-w-sm animate-fade-in overflow-hidden">
                    {/* 顶部渐变装饰 */}
                    <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-amber-500/10 to-transparent pointer-events-none" />

                    {/* 头部 */}
                    <div className="relative flex items-center justify-between px-5 pt-5 pb-2">
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <CalendarCheck className="w-5 h-5 text-amber-500" />
                            每日签到
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-lg hover:bg-background-secondary transition-colors"
                        >
                            <X className="w-4 h-4 text-foreground-secondary" />
                        </button>
                    </div>

                    {/* 主体内容 */}
                    <div className="relative px-5 pb-5">
                        {loading ? (
                            <div className="flex flex-col items-center py-10">
                                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                                <span className="text-sm text-foreground-secondary mt-3">加载中...</span>
                            </div>
                        ) : (
                            <>
                                {/* 签到状态卡片 */}
                                <div className="bg-background-secondary/50 rounded-xl p-4 mb-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Flame className="w-5 h-5 text-orange-500" />
                                            <div>
                                                <div className="text-xs text-foreground-secondary">已连续签到</div>
                                                <div className="text-xl font-bold text-foreground">
                                                    {status?.streakDays || 0} <span className="text-sm font-normal text-foreground-secondary">天</span>
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleCheckin}
                                            disabled={!status?.canCheckin || checking}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${status?.todayCheckedIn
                                                    ? 'bg-green-500/10 text-green-600 border border-green-500/20 cursor-default'
                                                    : 'bg-amber-500 text-white hover:bg-amber-600'
                                                } ${checking ? 'cursor-wait opacity-90' : ''}`}
                                        >
                                            {checking ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : status?.todayCheckedIn ? (
                                                <>
                                                    <CheckCircle2 className="w-4 h-4" />
                                                    已签到
                                                </>
                                            ) : (
                                                <>
                                                    <CalendarCheck className="w-4 h-4" />
                                                    立即签到
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* 等级进度 */}
                                {level && (
                                    <div className="mb-4">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <div className="flex items-center gap-1.5">
                                                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                                                <span className="text-xs font-medium">Lv.{level.level} {level.title}</span>
                                            </div>
                                            <span className="text-[10px] text-foreground-secondary">
                                                {level.experience} / {getNextLevelXp(level.level)} XP
                                            </span>
                                        </div>
                                        <div className="h-1.5 bg-background-secondary rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-500"
                                                style={{ width: `${Math.min(level.experience / getNextLevelXp(level.level) * 100, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* 分割线 */}
                                <div className="border-t border-border pt-3">
                                    {/* 奖励规则 */}
                                    <h4 className="text-xs font-medium text-foreground-secondary mb-2 flex items-center gap-1.5">
                                        <Gift className="w-3.5 h-3.5 text-amber-500" />
                                        奖励规则
                                    </h4>
                                    <ul className="text-xs text-foreground-secondary space-y-1.5 mb-3">
                                        <li>• 每日签到获得 10 经验值</li>
                                        <li>• 等级提升时额外获得 1 积分</li>
                                        <li>• 连续签到满 7 天额外获得 1 积分</li>
                                        <li>• 连续签到满 30 天额外获得 5 积分，每日经验提升至 11</li>
                                    </ul>

                                    {/* 查看日历按钮 */}
                                    <button
                                        onClick={() => setShowCalendar(true)}
                                        className="w-full py-2 rounded-lg border border-border text-sm text-foreground-secondary hover:bg-background-secondary hover:text-foreground transition-colors flex items-center justify-center gap-1.5"
                                    >
                                        <Calendar className="w-3.5 h-3.5" />
                                        查看签到日历
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* 日历弹窗 */}
            <CalendarModal
                isOpen={showCalendar}
                onClose={() => setShowCalendar(false)}
            />
        </>
    );
}
