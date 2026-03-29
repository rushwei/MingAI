/**
 * 支付暂停状态 Hook
 *
 * 'use client' 标记说明：
 * - 使用 React hooks 订阅客户端共享状态
 */
'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import {
    getPaymentPauseStoreSnapshot,
    refreshPaymentPauseStore,
    retainPaymentPauseStore,
    subscribePaymentPauseStore,
} from '@/lib/payment-status-store';

type PaymentPauseState = {
    isPaused: boolean;
    isLoading: boolean;
    refresh: () => Promise<void>;
};

export function usePaymentPause(): PaymentPauseState {
    const storeState = useSyncExternalStore(
        subscribePaymentPauseStore,
        getPaymentPauseStoreSnapshot,
        getPaymentPauseStoreSnapshot,
    );

    const refresh = useCallback(async () => {
        await refreshPaymentPauseStore(true);
    }, []);

    useEffect(() => {
        return retainPaymentPauseStore();
    }, []);

    return {
        isPaused: storeState.isPaused,
        isLoading: storeState.isLoading,
        refresh,
    };
}
