import { createMemoryCache, createSingleFlight } from '@/lib/cache';

type PaymentPauseStoreState = {
    isPaused: boolean;
    isLoading: boolean;
};

const PAYMENT_STATUS_CACHE_TTL_MS = 60_000;
const PAYMENT_STATUS_CACHE_KEY = 'status';

const pauseCache = createMemoryCache<boolean>(PAYMENT_STATUS_CACHE_TTL_MS, 1);
const pauseSingleFlight = createSingleFlight<boolean>();
const storeListeners = new Set<(state: PaymentPauseStoreState) => void>();

let paymentPauseStoreState: PaymentPauseStoreState = {
    isPaused: false,
    isLoading: true,
};
let activeSubscribers = 0;
let listenersAttached = false;
let hasInitializedStore = false;

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

function emitPaymentPauseStore() {
    for (const listener of storeListeners) {
        listener(paymentPauseStoreState);
    }
}

function setPaymentPauseStoreState(next: Partial<PaymentPauseStoreState>) {
    const merged = { ...paymentPauseStoreState, ...next };
    if (
        merged.isPaused === paymentPauseStoreState.isPaused
        && merged.isLoading === paymentPauseStoreState.isLoading
    ) {
        return;
    }
    paymentPauseStoreState = merged;
    emitPaymentPauseStore();
}

async function fetchPaymentPauseStatus(force = false): Promise<boolean> {
    if (!force) {
        const cached = pauseCache.get(PAYMENT_STATUS_CACHE_KEY);
        if (cached !== null) {
            return cached;
        }
    }

    return await pauseSingleFlight.run(PAYMENT_STATUS_CACHE_KEY, async () => {
        const url = getPerfEnabled() ? '/api/payment-status?perf=1' : '/api/payment-status';
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) {
            throw new Error(`Status ${response.status}`);
        }

        const result = await response.json();
        const paused = !!result?.paused;
        pauseCache.set(PAYMENT_STATUS_CACHE_KEY, paused);
        return paused;
    });
}

function handleVisibilityRefresh() {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        void refreshPaymentPauseStore(true);
    }
}

function attachGlobalListeners() {
    if (typeof window === 'undefined' || listenersAttached) {
        return;
    }
    window.addEventListener('focus', handleVisibilityRefresh);
    document.addEventListener('visibilitychange', handleVisibilityRefresh);
    listenersAttached = true;
}

function detachGlobalListeners() {
    if (typeof window === 'undefined' || !listenersAttached) {
        return;
    }
    window.removeEventListener('focus', handleVisibilityRefresh);
    document.removeEventListener('visibilitychange', handleVisibilityRefresh);
    listenersAttached = false;
}

export function getPaymentPauseStoreSnapshot(): PaymentPauseStoreState {
    return paymentPauseStoreState;
}

export function subscribePaymentPauseStore(listener: (state: PaymentPauseStoreState) => void) {
    storeListeners.add(listener);
    return () => {
        storeListeners.delete(listener);
    };
}

export async function refreshPaymentPauseStore(force = false) {
    const cached = pauseCache.get(PAYMENT_STATUS_CACHE_KEY);
    if (!hasInitializedStore && cached !== null) {
        hasInitializedStore = true;
        setPaymentPauseStoreState({
            isPaused: cached,
            isLoading: false,
        });
    }

    const start = perfNow();
    if (!hasInitializedStore && cached === null) {
        setPaymentPauseStoreState({ isLoading: true });
    }

    try {
        const paused = await fetchPaymentPauseStatus(force);
        hasInitializedStore = true;
        setPaymentPauseStoreState({
            isPaused: paused,
            isLoading: false,
        });
    } catch (error) {
        console.error('[payment-status] Failed to fetch status:', error);
        hasInitializedStore = true;
        setPaymentPauseStoreState({ isLoading: false });
    } finally {
        if (getPerfEnabled()) {
            const duration = Math.round(perfNow() - start);
            console.info(`[perf:payment-status] ${duration}ms`);
        }
    }
}

export function retainPaymentPauseStore() {
    activeSubscribers += 1;
    attachGlobalListeners();
    if (!hasInitializedStore) {
        void refreshPaymentPauseStore();
    }

    return () => {
        activeSubscribers = Math.max(0, activeSubscribers - 1);
        if (activeSubscribers === 0) {
            detachGlobalListeners();
        }
    };
}

export function resetPaymentPauseStoreForTests() {
    pauseCache.clear();
    pauseSingleFlight.clear();
    storeListeners.clear();
    activeSubscribers = 0;
    listenersAttached = false;
    hasInitializedStore = false;
    paymentPauseStoreState = {
        isPaused: false,
        isLoading: true,
    };
}
