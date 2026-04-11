/**
 * 签到弹窗组件
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  CalendarCheck,
  CheckCircle2,
  Lock,
  X,
} from 'lucide-react';
import { CheckinCalendarPanel } from '@/components/checkin/CheckinCalendarPanel';
import {
  fetchCheckinStatus,
  performCheckinAction,
  type CheckinStatus,
} from '@/components/checkin/checkin-client';
import { SoundWaveLoader } from '@/components/ui/SoundWaveLoader';
import { useToast } from '@/components/ui/Toast';

interface CheckinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCheckinSuccess?: () => void;
  stackLevel?: 'page' | 'settings';
}

export function CheckinModal({
  isOpen,
  onClose,
  onCheckinSuccess,
  stackLevel = 'page',
}: CheckinModalProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState<CheckinStatus | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const nextStatus = await fetchCheckinStatus();
      setStatus(nextStatus);
    } catch (error) {
      console.error('获取签到状态失败:', error);
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleCheckin = useCallback(async () => {
    if (checking || !status?.canCheckin) return;

    setChecking(true);
    try {
      const result = await performCheckinAction();
      if (result.ok) {
        setStatus((prev) => prev ? {
          ...prev,
          canCheckin: false,
          todayCheckedIn: true,
          blockedReason: 'already_checked_in',
          currentCredits: typeof result.credits === 'number' ? result.credits : prev.currentCredits,
          creditLimit: typeof result.creditLimit === 'number' ? result.creditLimit : prev.creditLimit,
        } : prev);
        showToast('success', `签到成功！+${result.rewardCredits} 积分`);
        onCheckinSuccess?.();
        return;
      }

      showToast('error', result.message || '签到失败');
      if (result.blockedReason === 'already_checked_in') {
        setStatus((prev) => prev ? {
          ...prev,
          canCheckin: false,
          todayCheckedIn: true,
          blockedReason: 'already_checked_in',
        } : prev);
      } else if (result.blockedReason === 'credit_cap_reached') {
        setStatus((prev) => prev ? {
          ...prev,
          canCheckin: false,
          blockedReason: 'credit_cap_reached',
          currentCredits: typeof result.credits === 'number' ? result.credits : prev.currentCredits,
          creditLimit: typeof result.creditLimit === 'number' ? result.creditLimit : prev.creditLimit,
        } : prev);
      }
    } catch (error) {
      console.error('签到失败:', error);
      showToast('error', '签到失败，请稍后重试');
    } finally {
      setChecking(false);
    }
  }, [checking, onCheckinSuccess, showToast, status]);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    void loadStatus();
  }, [isOpen, loadStatus]);

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

  const rewardRangeText = status ? `${status.rewardRange[0]}-${status.rewardRange[1]} 积分` : '--';
  const capReached = status?.blockedReason === 'credit_cap_reached';
  const modalLayerClass = stackLevel === 'settings' ? 'z-[100]' : 'z-[60]';

  return (
    <div className={`fixed inset-0 flex items-center justify-center p-4 ${modalLayerClass}`}>
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-background shadow-xl animate-fade-in">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <CalendarCheck className="h-4 w-4 text-amber-500" />
            每日签到
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 transition-colors hover:bg-background-secondary"
            aria-label="关闭"
          >
            <X className="h-4 w-4 text-foreground-secondary" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          {loading ? (
            <>
              <div className="h-11 rounded-lg bg-foreground/5 animate-pulse" />
              <div className="h-64 rounded-lg bg-foreground/5 animate-pulse" />
            </>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3 rounded-lg border border-[#ebe8e2] bg-[#fbfaf7] px-4 py-3">
                <div className="text-sm text-[#37352f]/65">
                  {status?.todayCheckedIn
                    ? '今天已经签到'
                    : capReached
                      ? '当前已达上限'
                      : `今日可得 ${rewardRangeText}`}
                </div>
                <button
                  type="button"
                  onClick={handleCheckin}
                  disabled={!status?.canCheckin || checking}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    status?.todayCheckedIn
                      ? 'bg-[#e8f4ee] text-[#1f9d6d] cursor-default'
                      : capReached
                        ? 'bg-[#f2ebe0] text-[#a16207] cursor-not-allowed'
                        : 'bg-[#efedea] text-[#37352f] hover:bg-[#e7e4de] active:bg-[#dfdbd4]'
                  } ${checking ? 'cursor-wait opacity-90' : ''}`}
                >
                  {checking ? (
                    <SoundWaveLoader variant="inline" />
                  ) : status?.todayCheckedIn ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      已签到
                    </>
                  ) : capReached ? (
                    <>
                      <Lock className="h-4 w-4" />
                      已封顶
                    </>
                  ) : (
                    <>
                      <CalendarCheck className="h-4 w-4" />
                      立即签到
                    </>
                  )}
                </button>
              </div>

              <CheckinCalendarPanel active={isOpen} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
