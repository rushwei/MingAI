/**
 * 侧边栏配置上下文
 * 
 * 用于在 SidebarCustomizer 和 Sidebar 之间共享配置状态
 * 实现实时更新无需刷新页面
 */
'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useSessionSafe } from '@/components/providers/ClientProviders';
import { readLocalCache, writeLocalCache } from '@/lib/cache';
import {
    DEFAULT_SIDEBAR_CONFIG,
    getCurrentUserSettings,
    normalizeSidebarConfig,
    updateCurrentUserSettings,
    type SidebarConfig,
} from '@/lib/user/settings';

export type { SidebarConfig } from '@/lib/user/settings';

const getSidebarCacheKey = (userId: string) => `mingai.sidebar_config.${userId}`;
const SIDEBAR_CACHE_TTL = 10 * 60 * 1000;

interface SidebarConfigContextType {
    config: SidebarConfig;
    setConfig: (config: SidebarConfig) => void;
    updateConfig: (updates: Partial<SidebarConfig>) => void;
    saveConfig: (config: SidebarConfig) => Promise<void>;
    loading: boolean;
    refreshing: boolean;
    userId: string | null;
}

const SidebarConfigContext = createContext<SidebarConfigContextType | undefined>(undefined);

export function SidebarConfigProvider({ children }: { children: ReactNode }) {
    const [config, setConfigState] = useState<SidebarConfig>(DEFAULT_SIDEBAR_CONFIG);
    const [configLoading, setConfigLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const { user, loading: sessionLoading } = useSessionSafe();

    // 加载用户配置
    useEffect(() => {
        let isActive = true;

        const syncConfig = async (nextUser: typeof user, options?: { showRefreshing?: boolean }) => {
            const showRefreshing = options?.showRefreshing ?? false;
            if (!nextUser) {
                setUserId(null);
                setConfigState(DEFAULT_SIDEBAR_CONFIG);
                setConfigLoading(false);
                setRefreshing(false);
                return;
            }

            setUserId(nextUser.id);
            if (showRefreshing) {
                setRefreshing(true);
            }
            const cached = readLocalCache<SidebarConfig>(getSidebarCacheKey(nextUser.id), SIDEBAR_CACHE_TTL);
            if (cached) {
                const normalizedCached = normalizeSidebarConfig(cached);
                setConfigState(normalizedCached);
                writeLocalCache(getSidebarCacheKey(nextUser.id), normalizedCached);
                setConfigLoading(false);
            } else {
                setConfigLoading(true);
            }
            const { settings, error } = await getCurrentUserSettings();

            if (!isActive) return;

            if (error) {
                console.error('[sidebar-config] failed to load user settings:', error.message);
                setConfigLoading(false);
                setRefreshing(false);
                return;
            }

            if (settings?.sidebarConfig) {
                const nextConfig = settings.sidebarConfig;
                setConfigState(nextConfig);
                writeLocalCache(getSidebarCacheKey(nextUser.id), nextConfig);
            }
            setConfigLoading(false);
            setRefreshing(false);
        };

        if (!sessionLoading) {
            void syncConfig(user ?? null);
        }

        const handleUserDataInvalidate = () => {
            if (!sessionLoading) {
                void syncConfig(user ?? null, { showRefreshing: true });
            }
        };
        window.addEventListener('mingai:user-data:invalidate', handleUserDataInvalidate);

        return () => {
            isActive = false;
            window.removeEventListener('mingai:user-data:invalidate', handleUserDataInvalidate);
        };
    }, [sessionLoading, user]);

    const setConfig = useCallback((newConfig: SidebarConfig) => {
        setConfigState(newConfig);
    }, []);

    const updateConfig = useCallback((updates: Partial<SidebarConfig>) => {
        setConfigState(prev => ({ ...prev, ...updates }));
    }, []);

    const saveConfig = useCallback(async (newConfig: SidebarConfig) => {
        if (!userId) return;
        const saved = await updateCurrentUserSettings({ sidebarConfig: newConfig });
        if (saved?.sidebarConfig) {
            writeLocalCache(getSidebarCacheKey(userId), saved.sidebarConfig);
        }
    }, [userId]);

    return (
        <SidebarConfigContext.Provider value={{
            config,
            setConfig,
            updateConfig,
            saveConfig,
            loading: sessionLoading || configLoading,
            refreshing: refreshing,
            userId,
        }}>
            {children}
        </SidebarConfigContext.Provider>
    );
}

export function useSidebarConfig() {
    const context = useContext(SidebarConfigContext);
    if (!context) {
        throw new Error('useSidebarConfig must be used within SidebarConfigProvider');
    }
    return context;
}

export function useSidebarConfigSafe() {
    const context = useContext(SidebarConfigContext);
    return context ?? {
        config: DEFAULT_SIDEBAR_CONFIG,
        setConfig: () => { },
        updateConfig: () => { },
        saveConfig: async () => { },
        loading: false,
        refreshing: false,
        userId: null,
    };
}
