/**
 * 签到弹窗组件
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    CalendarCheck,
    Gift,
    CheckCircle2,
    X,
    Calendar,
    Coins,
    Lock,
} from 'lucide-react';
import { SoundWaveLoader } from '@/components/ui/SoundWaveLoader';
import { supabase } from '@/lib/auth';
import { requestBrowserJson } from '@/lib/browser-api';
import { useToast } from '@/components/ui/Toast';
import { CalendarModal } from '@/components/checkin/CalendarModal';

interface CheckinStatus {
    canCheckin: boolean;
    lastCheckin: string | null;
    todayCheckedIn: boolean;
    rewardRange: [number, number];
    currentCredits: number;
    creditLimit: number;
    blockedReason: 'already_checked_in' | 'credit_cap_reached' | null;
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
    const [showCalendar, setShowCalendar] = useState(false);

    const fetchStatus = useCallback(async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) return;

            const result = await requestBrowserJson<{ status?: CheckinStatus }>('/api/checkin?action=status', {
                method: 'GET',
                headers: { Authorization: `Bearer ${session.access_token}` },
            });
            if (!result.error && result.data?.status) {
                setStatus(result.data.status);
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

            const result = await requestBrowserJson<{
                result?: {
                    rewardCredits: number;
                    credits?: number;
                    creditLimit?: number;
                    blockedReason?: 'already_checked_in' | 'credit_cap_reached';
                };
            }>('/api/checkin', {
                method: 'POST',
                headers: { Authorization: `Bearer ${session.access_token}` },
            });
            const checkinResult = result.data?.result;

            if (!result.error && checkinResult) {
                const rewardCredits = checkinResult.rewardCredits;
                const nextCredits = checkinResult.credits;
                const nextLimit = checkinResult.creditLimit;

                setStatus((prev) => prev ? {
                    ...prev,
                    canCheckin: false,
                    todayCheckedIn: true,
                    blockedReason: 'already_checked_in',
                    currentCredits: typeof nextCredits === 'number' ? nextCredits : prev.currentCredits,
                    creditLimit: typeof nextLimit === 'number' ? nextLimit : prev.creditLimit,
                } : null);

                showToast('success', `签到成功！+${rewardCredits} 积分`);
                onCheckinSuccess?.();
            } else {
                showToast('error', result.error?.message || '签到失败');

                if (checkinResult?.blockedReason === 'already_checked_in') {
                    setStatus((prev) => prev ? {
                        ...prev,
                        canCheckin: false,
                        todayCheckedIn: true,
                        blockedReason: 'already_checked_in',
                    } : prev);
                } else if (checkinResult?.blockedReason === 'credit_cap_reached') {
                    setStatus((prev) => prev ? {
                        ...prev,
                        canCheckin: false,
                        blockedReason: 'credit_cap_reached',
                        currentCredits: typeof checkinResult.credits === 'number' ? checkinResult.credits : prev.currentCredits,
                        creditLimit: typeof checkinResult.creditLimit === 'number' ? checkinResult.creditLimit : prev.creditLimit,
                    } : prev);
                }
            }
        } catch (error) {
            console.error('签到失败:', error);
            showToast('error', '签到失败，请稍后重试');
        } finally {
            setChecking(false);
        }
    }, [checking, onCheckinSuccess, showToast, status]);

    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            void fetchStatus();
        }
    }, [fetchStatus, isOpen]);

    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const rewardRangeText = status ? `${status.rewardRange[0]} ~ ${status.rewardRange[1]} 积分` : '--';
    const capReached = status?.blockedReason === 'credit_cap_reached';

    return (
        <>
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                <div
                    className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                    onClick={onClose}
                />

                <div className="relative bg-background rounded-2xl border border-border shadow-xl w-full max-w-sm animate-fade-in overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-amber-500/10 to-transparent pointer-events-none" />

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

                    <div className="relative px-5 pb-5">
                        {loading ? (
                            <div className="space-y-4">
                                <div className="h-24 rounded-xl bg-foreground/5 animate-pulse" />
                                <div className="h-20 rounded-xl bg-foreground/5 animate-pulse" />
                            </div>
                        ) : (
                            <>
                                <div className="bg-background-secondary/50 rounded-xl p-4 mb-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 text-sm text-foreground-secondary">
                                                <Coins className="w-4 h-4 text-amber-500" />
                                                <span>当前积分</span>
                                            </div>
                                            <div className="text-xl font-bold text-foreground">
                                                {status?.currentCredits ?? 0}
                                                <span className="ml-1 text-sm font-normal text-foreground-secondary">
                                                    / {status?.creditLimit ?? 0}
                                                </span>
                                            </div>
                                            <div className="text-xs text-foreground-secondary">
                                                今日签到可获得 {rewardRangeText}
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleCheckin}
                                            disabled={!status?.canCheckin || checking}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                                                status?.todayCheckedIn
                                                    ? 'bg-green-500/10 text-green-600 border border-green-500/20 cursor-default'
                                                    : capReached
                                                        ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20 cursor-not-allowed'
                                                        : 'bg-amber-500 text-white hover:bg-amber-600'
                                            } ${checking ? 'cursor-wait opacity-90' : ''}`}
                                        >
                                            {checking ? (
                                                <SoundWaveLoader variant="inline" />
                                            ) : status?.todayCheckedIn ? (
                                                <>
                                                    <CheckCircle2 className="w-4 h-4" />
                                                    已签到
                                                </>
                                            ) : capReached ? (
                                                <>
                                                    <Lock className="w-4 h-4" />
                                                    已封顶
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

                                <div className="border-t border-border pt-3">
                                    <h4 className="text-xs font-medium text-foreground-secondary mb-2 flex items-center gap-1.5">
                                        <Gift className="w-3.5 h-3.5 text-amber-500" />
                                        规则说明
                                    </h4>
                                    <ul className="text-xs text-foreground-secondary space-y-1.5 mb-3">
                                        <li>• Free：每日签到随机 1-3 积分，上限 10</li>
                                        <li>• Plus：在 Free 奖励基础上 x2，上限 20</li>
                                        <li>• Pro：在 Free 奖励基础上 x3，上限 50</li>
                                        <li>• 签到前若仍低于上限，本次奖励会完整发放，允许单次超过上限</li>
                                        <li>• 当前积分达到或超过上限后，需先消耗积分才能再次签到</li>
                                    </ul>

                                    {capReached && (
                                        <div className="mb-3 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-700">
                                            当前积分已达或超过上限，先消耗一部分积分后再来签到。
                                        </div>
                                    )}

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

            <CalendarModal
                isOpen={showCalendar}
                onClose={() => setShowCalendar(false)}
            />
        </>
    );
}
