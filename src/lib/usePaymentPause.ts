'use client';

import { useCallback, useEffect, useState } from "react";

type PaymentPauseState = {
    isPaused: boolean;
    isLoading: boolean;
    refresh: () => Promise<void>;
};

export function usePaymentPause(): PaymentPauseState {
    const [isPaused, setIsPaused] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const refresh = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch("/api/payment-status");
            if (!response.ok) {
                throw new Error(`Status ${response.status}`);
            }
            const result = await response.json();
            setIsPaused(!!result?.paused);
        } catch (error) {
            console.error("[payment-status] Failed to fetch status:", error);
            setIsPaused(false);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    return { isPaused, isLoading, refresh };
}
