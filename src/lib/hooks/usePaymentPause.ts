/**
 * 支付暂停状态 Hook
 */
'use client';

import { useCallback } from 'react';
import { useAppBootstrap } from '@/lib/hooks/useAppBootstrap';

type PaymentPauseState = {
  isPaused: boolean;
  isLoading: boolean;
  refresh: () => Promise<void>;
};

export function usePaymentPause(): PaymentPauseState {
  const bootstrap = useAppBootstrap();

  const refresh = useCallback(async () => {
    await bootstrap.refresh();
  }, [bootstrap]);

  return {
    isPaused: bootstrap.data.paymentStatusLoaded ? bootstrap.data.paymentPaused : true,
    isLoading: bootstrap.isLoading,
    refresh,
  };
}
