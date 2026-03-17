/**
 * 支付暂停状态 Hook
 *
 * 'use client' 标记说明：
 * - 使用 React hooks (useState, useEffect, useCallback)
 * - 需要访问 window 对象和 localStorage
 */
'use client';

import { useCallback, useEffect, useState } from "react";

type PaymentPauseState = {
    isPaused: boolean;
    isLoading: boolean;
    refresh: () => Promise<void>;
};

const CACHE_TTL_MS = 60_000;
let pauseCache: boolean | null = null;
let pauseCacheAt = 0;

const getPerfEnabled = () => {
    if (typeof window === 'undefined') return false;
    try {
        const params = new URLSearchParams(window.location.search);
        if (params.get('perf') === '1') return true;
    } catch {
        return window.localStorage.getItem('mingai.debug.perf') === '1';
    }
    return window.localStorage.getItem('mingai.debug.perf') === '1';
};

const perfNow = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

async function fetchPauseStatus(force = false): Promise<boolean> {
    if (!force && pauseCache !== null && Date.now() - pauseCacheAt < CACHE_TTL_MS) {
        return pauseCache;
    }

    const url = getPerfEnabled() ? "/api/payment-status?perf=1" : "/api/payment-status";
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
        throw new Error(`Status ${response.status}`);
    }

    const result = await response.json();
    pauseCache = !!result?.paused;
    pauseCacheAt = Date.now();
    return pauseCache;
}

export function usePaymentPause(): PaymentPauseState {
    const [isPaused, setIsPaused] = useState(pauseCache ?? false);
    const [isLoading, setIsLoading] = useState(true);

    const refresh = useCallback(async (force = false) => {
        const start = perfNow();
        setIsLoading(true);
        try {
            const paused = await fetchPauseStatus(force);
            setIsPaused(paused);
        } catch (error) {
            console.error("[payment-status] Failed to fetch status:", error);
        } finally {
            setIsLoading(false);
            if (getPerfEnabled()) {
                const duration = Math.round(perfNow() - start);
                console.info(`[perf:payment-status] ${duration}ms`);
            }
        }
    }, []);

    useEffect(() => {
        void refresh();

        const handleWindowRefresh = () => {
            if (document.visibilityState === 'visible') {
                void refresh(true);
            }
        };
        window.addEventListener('focus', handleWindowRefresh);
        document.addEventListener('visibilitychange', handleWindowRefresh);

        return () => {
            window.removeEventListener('focus', handleWindowRefresh);
            document.removeEventListener('visibilitychange', handleWindowRefresh);
        };
    }, [refresh]);

    return { isPaused, isLoading, refresh };
}
