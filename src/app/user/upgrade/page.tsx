/**
 * 会员与积分内容
 *
 * 'use client' 标记说明：
 * - 使用 hooks 管理会员、签到、激活码与积分记录状态
 * - 该模块供统一设置中心复用，旧路由仅保留启动入口
 */
'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  CalendarCheck,
  CheckCircle2,
  Key,
  Lock,
  RefreshCw,
} from 'lucide-react';
import {
  type CheckinStatus,
  fetchCheckinStatus,
  performCheckinAction,
} from '@/components/checkin/checkin-client';
import { AuthModal } from '@/components/auth/AuthModal';
import { CheckinModal } from '@/components/checkin/CheckinModal';
import { CreditProgressBar } from '@/components/membership/CreditProgressBar';
import { CreditTransactionsPanel } from '@/components/membership/CreditTransactionsPanel';
import { KeyActivationModal } from '@/components/membership/KeyActivationModal';
import { useSessionSafe } from '@/components/providers/ClientProviders';
import { SettingsRouteLauncher } from '@/components/settings/SettingsRouteLauncher';
import { useToast } from '@/components/ui/Toast';
import { useFeatureToggles } from '@/lib/hooks/useFeatureToggles';
import { getSettingsCenterRouteTarget } from '@/lib/settings-center';
import { getMembershipInfo, type MembershipInfo } from '@/lib/user/membership';

type ClaimStatus =
  | 'ok'
  | 'cooldown'
  | 'lower_tier_ignored'
  | 'no_eligibility'
  | 'claim_failed'
  | 'missing_linuxdo';

function ActionButton({
  icon,
  label,
  onClick,
  href,
  disabled = false,
}: {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
}) {
  const className = `inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150 ${
    disabled
      ? 'cursor-not-allowed bg-[#ede9e2] text-[#37352f]/42'
      : 'bg-[#efedea] text-[#37352f] hover:bg-[#e7e4de] active:bg-[#dfdbd4]'
  }`;

  if (href) {
    return (
      <a href={href} className={className}>
        {icon}
        <span>{label}</span>
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={className}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function UpgradeContent({ embedded = false }: { embedded?: boolean }) {
  const { user, loading: sessionLoading } = useSessionSafe();
  const searchParams = useSearchParams();
  const { isFeatureEnabled, loaded: featureLoaded } = useFeatureToggles();
  const [membership, setMembership] = useState<MembershipInfo | null>(null);
  const [membershipError, setMembershipError] = useState<string | null>(null);
  const [checkinStatus, setCheckinStatus] = useState<CheckinStatus | null>(null);
  const [checkinError, setCheckinError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [checkinSubmitting, setCheckinSubmitting] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [showCheckinModal, setShowCheckinModal] = useState(false);
  const [transactionsRefreshKey, setTransactionsRefreshKey] = useState(0);
  const { showToast } = useToast();

  const checkinEnabled = featureLoaded && isFeatureEnabled('checkin');
  const containerClass = embedded
    ? 'space-y-8'
    : 'mx-auto max-w-4xl space-y-8 px-4 py-6';

  const refreshMembership = useCallback(async (userId: string) => {
    const result = await getMembershipInfo(userId);
    if (result.ok) {
      setMembership(result.info);
      setMembershipError(null);
      return result;
    }

    setMembershipError(result.error.message || '获取会员状态失败');
    return result;
  }, []);

  const refreshCheckinStatus = useCallback(async () => {
    if (!user || !checkinEnabled) {
      setCheckinStatus(null);
      setCheckinError(null);
      return null;
    }

    setCheckinLoading(true);
    try {
      const nextStatus = await fetchCheckinStatus();
      if (nextStatus.ok) {
        setCheckinStatus(nextStatus.status);
        setCheckinError(null);
        return nextStatus.status;
      }

      console.error('获取签到状态失败:', nextStatus.error);
      setCheckinStatus(null);
      setCheckinError(nextStatus.error.message || '获取签到状态失败');
      return null;
    } catch (error) {
      console.error('获取签到状态失败:', error);
      setCheckinStatus(null);
      setCheckinError('获取签到状态失败，请稍后重试');
      return null;
    } finally {
      setCheckinLoading(false);
    }
  }, [checkinEnabled, user]);

  const refreshMembershipAndCheckin = useCallback(async (userId: string) => {
    await Promise.all([
      refreshMembership(userId),
      checkinEnabled ? refreshCheckinStatus() : Promise.resolve(null),
    ]);
  }, [checkinEnabled, refreshCheckinStatus, refreshMembership]);

  useEffect(() => {
    const init = async () => {
      if (sessionLoading) return;
      if (user) {
        await refreshMembership(user.id);
      } else {
        setMembership(null);
        setMembershipError(null);
      }
      setLoading(false);
    };
    void init();
  }, [refreshMembership, sessionLoading, user]);

  useEffect(() => {
    if (sessionLoading) return;
    if (!user || !checkinEnabled) {
      setCheckinStatus(null);
      setCheckinError(null);
      return;
    }
    void refreshCheckinStatus();
  }, [checkinEnabled, refreshCheckinStatus, sessionLoading, user]);

  useEffect(() => {
    const claim = searchParams.get('claim') as ClaimStatus | null;
    if (!claim) return;

    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.delete('claim');
    nextUrl.searchParams.delete('next_available_at');
    window.history.replaceState({}, '', nextUrl.toString());

    if (claim === 'ok') {
      showToast('success', 'Linux.do 月度会员已领取');
      return;
    }

    if (claim === 'cooldown') {
      const nextAvailableAt = searchParams.get('next_available_at');
      const formatted = nextAvailableAt
        ? new Date(nextAvailableAt).toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          })
        : null;
      showToast('info', formatted ? `本月已领取，请在 ${formatted} 后再试` : '本月已领取，请下次再来');
      return;
    }

    if (claim === 'lower_tier_ignored') {
      showToast('info', '当前已有更高等级会员，本次 Linux.do 月领未覆盖');
      return;
    }

    if (claim === 'no_eligibility') {
      showToast('info', '当前 Linux.do 等级不足，无法领取本月会员');
      return;
    }

    if (claim === 'missing_linuxdo') {
      showToast('error', '请使用 Linux.do 账号重新登录后再领取');
      return;
    }

    showToast('error', '领取会员失败，请稍后重试');
  }, [searchParams, showToast]);

  const handleKeySuccess = (info: MembershipInfo | null) => {
    if (info) {
      setMembership(info);
      setMembershipError(null);
    }

    if (user) {
      void refreshMembershipAndCheckin(user.id);
    }
    setTransactionsRefreshKey((value) => value + 1);
  };

  const handleCheckinClick = () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    if (!checkinStatus?.canCheckin || checkinSubmitting) {
      return;
    }

    setCheckinSubmitting(true);
    void (async () => {
      try {
        const result = await performCheckinAction();
        if (result.ok) {
          setCheckinError(null);
          setCheckinStatus((prev) => prev ? {
            ...prev,
            canCheckin: false,
            todayCheckedIn: true,
            blockedReason: 'already_checked_in',
            currentCredits: typeof result.credits === 'number' ? result.credits : prev.currentCredits,
            creditLimit: typeof result.creditLimit === 'number' ? result.creditLimit : prev.creditLimit,
          } : prev);
          showToast('success', `签到成功！+${result.rewardCredits} 积分`);
          void refreshMembership(user.id);
          setTransactionsRefreshKey((value) => value + 1);
          return;
        }

        showToast('error', result.message || '签到失败');
        if (result.blockedReason === 'already_checked_in') {
          setCheckinStatus((prev) => prev ? {
            ...prev,
            canCheckin: false,
            todayCheckedIn: true,
            blockedReason: 'already_checked_in',
          } : prev);
        } else if (result.blockedReason === 'credit_cap_reached') {
          setCheckinStatus((prev) => prev ? {
            ...prev,
            canCheckin: false,
            blockedReason: 'credit_cap_reached',
            currentCredits: typeof result.credits === 'number' ? result.credits : prev.currentCredits,
            creditLimit: typeof result.creditLimit === 'number' ? result.creditLimit : prev.creditLimit,
          } : prev);
        }
      } catch (error) {
        console.error('签到失败:', error);
        const errorMessage = error instanceof Error ? error.message : '签到失败，请稍后重试';
        setCheckinError(errorMessage);
        showToast('error', errorMessage);
      } finally {
        setCheckinSubmitting(false);
      }
    })();
  };

  const currentPlan = membership?.type || 'free';
  const linuxdoClaimUrl = useMemo(() => {
    const params = new URLSearchParams({
      intent: 'membership-claim',
      returnTo: getSettingsCenterRouteTarget('upgrade'),
    });
    return `/api/auth/linuxdo?${params.toString()}`;
  }, []);
  const checkinButtonLabel = !user
    ? '登录后签到'
    : checkinSubmitting
      ? '签到中'
      : checkinError && !checkinStatus
        ? '状态加载失败'
      : checkinStatus?.todayCheckedIn
        ? '已签到'
        : checkinStatus?.blockedReason === 'credit_cap_reached'
          ? '已封顶'
          : '立即签到';
  const checkinButtonIcon = !user
    ? <CalendarCheck className="h-4 w-4" />
    : checkinSubmitting
      ? <CalendarCheck className="h-4 w-4" />
      : checkinError && !checkinStatus
        ? <RefreshCw className="h-4 w-4" />
        : checkinStatus?.todayCheckedIn
          ? <CheckCircle2 className="h-4 w-4" />
        : checkinStatus?.blockedReason === 'credit_cap_reached'
          ? <Lock className="h-4 w-4" />
          : <CalendarCheck className="h-4 w-4" />;
  const checkinDisabled = !!user && (checkinSubmitting || checkinLoading || !!checkinError || !checkinStatus?.canCheckin);

  if (loading) {
    return (
      <div className={containerClass}>
        <div className="space-y-2">
          <div className="h-3 w-20 rounded bg-[#37352f]/10 animate-pulse" />
          <div className="h-7 w-36 rounded bg-[#37352f]/10 animate-pulse" />
          <div className="h-4 w-64 rounded bg-[#37352f]/5 animate-pulse" />
        </div>
        <div className="h-36 rounded-lg border border-gray-200 bg-[#f7f6f3] animate-pulse" />
        <div className="h-28 rounded-lg border border-gray-200 bg-[#f7f6f3] animate-pulse" />
      </div>
    );
  }

  return (
    <div className={containerClass}>
      {user && membershipError && !membership ? (
        <div className="rounded-lg border border-[#ead9bf] bg-[#fcf8ee] px-4 py-3 text-sm text-[#946c21]">
          <div className="flex items-center justify-between gap-3">
            <span className="min-w-0 flex-1">{membershipError}</span>
            <button
              type="button"
              onClick={() => void refreshMembership(user.id)}
              className="shrink-0 rounded-md px-2 py-1 font-medium text-[#7c5f1c] transition-colors hover:bg-[#f4ead3]"
            >
              重试
            </button>
          </div>
        </div>
      ) : (
        <CreditProgressBar
          credits={membership?.aiChatCount ?? 0}
          membershipType={currentPlan}
        />
      )}

      <div className="rounded-lg border border-[#ebe8e2] bg-[#f7f6f3] px-4 py-4">
        <div className="flex flex-wrap gap-2">
          <ActionButton
            href={linuxdoClaimUrl}
            icon={<RefreshCw className="h-4 w-4" />}
            label="领取月度会员"
          />
          <ActionButton
            onClick={() => {
              if (!user) {
                setShowAuthModal(true);
                return;
              }
              setShowKeyModal(true);
            }}
            icon={<Key className="h-4 w-4" />}
            label="输入激活码"
          />
          {checkinEnabled ? (
            <div className="flex items-center gap-2">
              <ActionButton
                onClick={handleCheckinClick}
                icon={checkinButtonIcon}
                label={checkinButtonLabel}
                disabled={checkinDisabled}
              />
              {user && checkinStatus?.todayCheckedIn ? (
                <button
                  type="button"
                  onClick={() => setShowCheckinModal(true)}
                  className="text-xs font-medium text-[#37352f]/55 transition-colors duration-150 hover:text-[#37352f]"
                >
                  查看详情
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
        {checkinEnabled && user && checkinError ? (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-[#ead9bf] bg-[#fcf8ee] px-3 py-2 text-xs text-[#946c21]">
            <span className="min-w-0 flex-1">{checkinError}</span>
            <button
              type="button"
              onClick={() => void refreshCheckinStatus()}
              className="shrink-0 rounded-md px-2 py-1 font-medium text-[#7c5f1c] transition-colors hover:bg-[#f4ead3]"
            >
              重试
            </button>
          </div>
        ) : null}
      </div>

      <CreditTransactionsPanel pageSize={5} refreshKey={transactionsRefreshKey} />

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />

      <KeyActivationModal
        isOpen={showKeyModal}
        onClose={() => setShowKeyModal(false)}
        onSuccess={handleKeySuccess}
      />

      <CheckinModal
        isOpen={showCheckinModal}
        onClose={() => setShowCheckinModal(false)}
        stackLevel={embedded ? 'settings' : 'page'}
      />
    </div>
  );
}

function UpgradePage() {
  return <SettingsRouteLauncher tab="upgrade" preserveExistingSearch />;
}

const UpgradePageEntry = Object.assign(UpgradePage, { Content: UpgradeContent });

export default UpgradePageEntry;
