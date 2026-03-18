/**
 * 功能模块开关 Hook
 *
 * 'use client' 标记说明：
 * - 使用 React hooks (useState, useEffect, useCallback, useMemo)
 * - 需要访问 window 对象做前台刷新
 */
'use client';

import { useCallback, useEffect, useMemo, useState } from "react";
import { readLocalCache, writeLocalCache } from "@/lib/cache";

type FeatureTogglesState = {
    /** 被关闭的功能 ID 集合 */
    disabledFeatures: Set<string>;
    isLoading: boolean;
    isRefreshing: boolean;
    /** 判断某功能是否启用（默认 false，fail-closed） */
    isFeatureEnabled: (featureId: string) => boolean;
    refresh: (force?: boolean, showLoading?: boolean) => Promise<void>;
};

type UseFeatureTogglesOptions = {
    enabled?: boolean;
};

type FeatureToggleStoreState = {
    toggles: Record<string, boolean> | null;
    isLoading: boolean;
    isRefreshing: boolean;
};

const CACHE_TTL_MS = 60_000;
const FEATURE_TOGGLES_CACHE_KEY = 'mingai.feature_toggles';
let togglesCache: Record<string, boolean> | null = null;
let togglesCacheAt = 0;
let refreshPromise: Promise<void> | null = null;
const storeListeners = new Set<(state: FeatureToggleStoreState) => void>();

function readWarmToggles(): Record<string, boolean> | null {
    if (togglesCache && Date.now() - togglesCacheAt < CACHE_TTL_MS) {
        return togglesCache;
    }
    return readLocalCache<Record<string, boolean>>(FEATURE_TOGGLES_CACHE_KEY, CACHE_TTL_MS);
}

function shallowEqualToggles(a: Record<string, boolean> | null, b: Record<string, boolean>): boolean {
    if (!a) return false;
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    return keysA.every(k => a[k] === b[k]);
}

function persistToggles(next: Record<string, boolean>) {
    // Preserve reference if data is unchanged — prevents downstream no-op re-renders
    if (shallowEqualToggles(togglesCache, next)) {
        togglesCacheAt = Date.now();
        return;
    }
    togglesCache = next;
    togglesCacheAt = Date.now();
    writeLocalCache(FEATURE_TOGGLES_CACHE_KEY, next);
}

function getInitialStoreState(): FeatureToggleStoreState {
    return {
        toggles: null,
        isLoading: true,
        isRefreshing: false,
    };
}

let featureToggleStoreState = getInitialStoreState();

function emitFeatureToggleStore() {
    for (const listener of storeListeners) {
        listener(featureToggleStoreState);
    }
}

function setFeatureToggleStoreState(next: Partial<FeatureToggleStoreState>) {
    const prev = featureToggleStoreState;
    const merged = { ...prev, ...next };
    // Skip emit when nothing changed — avoids no-op re-renders on polling/focus
    if (
        merged.isLoading === prev.isLoading &&
        merged.isRefreshing === prev.isRefreshing &&
        merged.toggles === prev.toggles
    ) {
        return;
    }
    featureToggleStoreState = merged;
    emitFeatureToggleStore();
}

function seedFeatureToggleStoreFromCache() {
    if (featureToggleStoreState.toggles != null) {
        return;
    }
    const warmToggles = readWarmToggles();
    if (!warmToggles) {
        return;
    }
    setFeatureToggleStoreState({
        toggles: warmToggles,
        isLoading: false,
        isRefreshing: false,
    });
}

async function fetchToggles(force = false): Promise<Record<string, boolean>> {
    if (!force && togglesCache && Date.now() - togglesCacheAt < CACHE_TTL_MS) {
        return togglesCache;
    }

    const response = await fetch('/api/feature-toggles', { cache: 'no-store' });
    if (!response.ok) {
        throw new Error(`Status ${response.status}`);
    }

    const result = await response.json();
    const next = result?.toggles && typeof result.toggles === 'object'
        ? result.toggles as Record<string, boolean>
        : {};
    persistToggles(next);
    return togglesCache!;
}

export function getFeatureToggleStoreSnapshot(): FeatureToggleStoreState {
    return featureToggleStoreState;
}

export function subscribeFeatureToggleStore(listener: (state: FeatureToggleStoreState) => void) {
    storeListeners.add(listener);
    return () => {
        storeListeners.delete(listener);
    };
}

export async function refreshFeatureToggleStore(force = false, showLoading = false) {
    if (refreshPromise) {
        if (showLoading && !featureToggleStoreState.isRefreshing) {
            setFeatureToggleStoreState({ isRefreshing: true });
        }
        return await refreshPromise;
    }

    refreshPromise = (async () => {
        const shouldBlock = featureToggleStoreState.toggles == null;
        if (shouldBlock) {
            setFeatureToggleStoreState({ isLoading: true });
        }
        if (showLoading) {
            setFeatureToggleStoreState({ isRefreshing: true });
        }

        try {
            const data = await fetchToggles(force);
            setFeatureToggleStoreState({
                toggles: data,
                isLoading: false,
                isRefreshing: false,
            });
        } catch (error) {
            console.error("[feature-toggles] Failed to fetch:", error);
            setFeatureToggleStoreState({ isLoading: false, isRefreshing: false });
        }
    })();

    try {
        await refreshPromise;
    } finally {
        refreshPromise = null;
    }
}

export function resetFeatureToggleStoreForTests() {
    togglesCache = null;
    togglesCacheAt = 0;
    refreshPromise = null;
    storeListeners.clear();
    featureToggleStoreState = getInitialStoreState();
}

export function useFeatureToggles(options: UseFeatureTogglesOptions = {}): FeatureTogglesState {
    const enabled = options.enabled ?? true;
    const [storeState, setStoreState] = useState<FeatureToggleStoreState>(() => getFeatureToggleStoreSnapshot());

    const refresh = useCallback(async (force = false, showLoading = false) => {
        await refreshFeatureToggleStore(force, showLoading);
    }, []);

    useEffect(() => subscribeFeatureToggleStore(setStoreState), []);

    useEffect(() => {
        if (!enabled) {
            return;
        }
        seedFeatureToggleStoreFromCache();
        void refreshFeatureToggleStore();

        const handleWindowRefresh = () => {
            if (document.visibilityState === 'visible') {
                void refreshFeatureToggleStore(true);
            }
        };
        window.addEventListener('focus', handleWindowRefresh);
        document.addEventListener('visibilitychange', handleWindowRefresh);

        return () => {
            window.removeEventListener('focus', handleWindowRefresh);
            document.removeEventListener('visibilitychange', handleWindowRefresh);
        };
    }, [enabled]);

    const disabledFeatures = useMemo(
        () => new Set(Object.entries(storeState.toggles || {}).filter(([, value]) => value === true).map(([key]) => key)),
        [storeState.toggles]
    );

    const isFeatureEnabled = useCallback(
        (featureId: string) => enabled && storeState.toggles ? !disabledFeatures.has(featureId) : false,
        [disabledFeatures, enabled, storeState.toggles]
    );

    return {
        disabledFeatures,
        isLoading: enabled ? storeState.isLoading : false,
        isRefreshing: enabled ? storeState.isRefreshing : false,
        isFeatureEnabled,
        refresh,
    };
}
