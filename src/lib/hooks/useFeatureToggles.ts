/**
 * 功能模块开关 Hook
 *
 * 'use client' 标记说明：
 * - 使用 React hooks (useState, useEffect, useCallback, useMemo)
 * - 需要访问 window 对象监听自定义事件
 */
'use client';

import { useCallback, useEffect, useMemo, useState } from "react";
import { createMemoryCache, createSingleFlight } from "@/lib/cache";

type FeatureTogglesState = {
    /** 被关闭的功能 ID 集合 */
    disabledFeatures: Set<string>;
    isLoading: boolean;
    /** 判断某功能是否启用（默认 true，fail-open） */
    isFeatureEnabled: (featureId: string) => boolean;
    refresh: () => Promise<void>;
};

const CACHE_TTL_MS = 60_000;
const togglesCache = createMemoryCache<Record<string, boolean>>(CACHE_TTL_MS);
const togglesSingleFlight = createSingleFlight<Record<string, boolean>>();
const clearTogglesCache = () => {
    togglesCache.clear();
    togglesSingleFlight.clear('all');
};

const fetchToggles = async (): Promise<Record<string, boolean>> => {
    const cached = togglesCache.get('all');
    if (cached !== null) return cached;
    return await togglesSingleFlight.run('all', async () => {
        const response = await fetch("/api/feature-toggles");
        if (!response.ok) {
            throw new Error(`Status ${response.status}`);
        }
        const result = await response.json();
        const toggles: Record<string, boolean> = result?.toggles ?? {};
        togglesCache.set('all', toggles);
        return toggles;
    });
};

export function useFeatureToggles(): FeatureTogglesState {
    const [toggles, setToggles] = useState<Record<string, boolean>>({});
    const [isLoading, setIsLoading] = useState(true);

    const refresh = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await fetchToggles();
            setToggles(data);
        } catch (error) {
            console.error("[feature-toggles] Failed to fetch:", error);
            setToggles({});
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();

        const handleApiWrite = (event: Event) => {
            const detail = (event as CustomEvent<{ pathname?: string }>).detail;
            if (detail?.pathname?.startsWith('/api/feature-toggles')) {
                clearTogglesCache();
                void refresh();
            }
        };
        const handleUserInvalidate = () => {
            clearTogglesCache();
            void refresh();
        };
        window.addEventListener('mingai:api-write', handleApiWrite);
        window.addEventListener('mingai:user-data:invalidate', handleUserInvalidate);

        return () => {
            window.removeEventListener('mingai:api-write', handleApiWrite);
            window.removeEventListener('mingai:user-data:invalidate', handleUserInvalidate);
        };
    }, [refresh]);

    const disabledFeatures = useMemo(
        () => new Set(Object.entries(toggles).filter(([, v]) => v).map(([k]) => k)),
        [toggles]
    );

    const isFeatureEnabled = useCallback(
        (featureId: string) => !disabledFeatures.has(featureId),
        [disabledFeatures]
    );

    return { disabledFeatures, isLoading, isFeatureEnabled, refresh };
}
