/**
 * 支付暂停状态 Hook
 *
 * 'use client' 标记说明：
 * - 使用 React hooks (useState, useEffect, useCallback)
 * - 需要访问 window 对象和 localStorage
 */
'use client';

import { useCallback, useEffect, useState } from "react";
import { createMemoryCache, createSingleFlight } from "@/lib/cache";

type PaymentPauseState = {
    isPaused: boolean;
    isLoading: boolean;
    refresh: () => Promise<void>;
};

const CACHE_TTL_MS = 60_000;
const pauseCache = createMemoryCache<boolean>(CACHE_TTL_MS);
const pauseSingleFlight = createSingleFlight<boolean>();

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

const fetchPauseStatus = async (): Promise<boolean> => {
    const cached = pauseCache.get('status');
    if (cached !== null) return cached;
    return await pauseSingleFlight.run('status', async () => {
        const url = getPerfEnabled() ? "/api/payment-status?perf=1" : "/api/payment-status";
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Status ${response.status}`);
        }
        const result = await response.json();
        const paused = !!result?.paused;
        pauseCache.set('status', paused);
        return paused;
    });
};

export function usePaymentPause(): PaymentPauseState {
    const [isPaused, setIsPaused] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const refresh = useCallback(async () => {
        const start = perfNow();
        setIsLoading(true);
        try {
            const paused = await fetchPauseStatus();
            setIsPaused(paused);
        } catch (error) {
            console.error("[payment-status] Failed to fetch status:", error);
            setIsPaused(false);
        } finally {
            setIsLoading(false);
            if (getPerfEnabled()) {
                const duration = Math.round(perfNow() - start);
                console.info(`[perf:payment-status] ${duration}ms`);
            }
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    return { isPaused, isLoading, refresh };
}
