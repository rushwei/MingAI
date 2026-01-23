/**
 * 侧边栏配置上下文
 * 
 * 用于在 SidebarCustomizer 和 Sidebar 之间共享配置状态
 * 实现实时更新无需刷新页面
 */
'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

export interface SidebarConfig {
    hiddenNavItems: string[];
    hiddenToolItems: string[];
    navOrder: string[];
    toolOrder: string[];
}

const DEFAULT_CONFIG: SidebarConfig = {
    hiddenNavItems: [],
    hiddenToolItems: [],
    navOrder: ['fortune-hub', 'bazi', 'hepan', 'ziwei', 'tarot', 'liuyao', 'face', 'palm', 'mbti'],
    toolOrder: ['checkin', 'chat', 'daily', 'monthly', 'records', 'community'],
};

interface SidebarConfigContextType {
    config: SidebarConfig;
    setConfig: (config: SidebarConfig) => void;
    updateConfig: (updates: Partial<SidebarConfig>) => void;
    saveConfig: (config: SidebarConfig) => Promise<void>;
    loading: boolean;
    userId: string | null;
}

const SidebarConfigContext = createContext<SidebarConfigContextType | undefined>(undefined);

export function SidebarConfigProvider({ children }: { children: ReactNode }) {
    const [config, setConfigState] = useState<SidebarConfig>(DEFAULT_CONFIG);
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);

    // 加载用户配置
    useEffect(() => {
        const loadConfig = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) {
                setLoading(false);
                return;
            }

            setUserId(session.user.id);

            const { data } = await supabase
                .from('user_settings')
                .select('sidebar_config')
                .eq('user_id', session.user.id)
                .maybeSingle();

            if (data?.sidebar_config) {
                setConfigState({
                    hiddenNavItems: data.sidebar_config.hiddenNavItems || [],
                    hiddenToolItems: data.sidebar_config.hiddenToolItems || [],
                    navOrder: data.sidebar_config.navOrder || DEFAULT_CONFIG.navOrder,
                    toolOrder: data.sidebar_config.toolOrder || DEFAULT_CONFIG.toolOrder,
                });
            }
            setLoading(false);
        };

        loadConfig();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                if (session?.user) {
                    setUserId(session.user.id);
                    const { data } = await supabase
                        .from('user_settings')
                        .select('sidebar_config')
                        .eq('user_id', session.user.id)
                        .maybeSingle();

                    if (data?.sidebar_config) {
                        setConfigState({
                            hiddenNavItems: data.sidebar_config.hiddenNavItems || [],
                            hiddenToolItems: data.sidebar_config.hiddenToolItems || [],
                            navOrder: data.sidebar_config.navOrder || DEFAULT_CONFIG.navOrder,
                            toolOrder: data.sidebar_config.toolOrder || DEFAULT_CONFIG.toolOrder,
                        });
                    }
                } else {
                    setUserId(null);
                    setConfigState(DEFAULT_CONFIG);
                }
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    const setConfig = useCallback((newConfig: SidebarConfig) => {
        setConfigState(newConfig);
    }, []);

    const updateConfig = useCallback((updates: Partial<SidebarConfig>) => {
        setConfigState(prev => ({ ...prev, ...updates }));
    }, []);

    const saveConfig = useCallback(async (newConfig: SidebarConfig) => {
        if (!userId) return;
        await supabase
            .from('user_settings')
            .upsert({
                user_id: userId,
                sidebar_config: newConfig,
            }, { onConflict: 'user_id' });
    }, [userId]);

    return (
        <SidebarConfigContext.Provider value={{
            config,
            setConfig,
            updateConfig,
            saveConfig,
            loading,
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
        config: DEFAULT_CONFIG,
        setConfig: () => { },
        updateConfig: () => { },
        saveConfig: async () => { },
        loading: false,
        userId: null,
    };
}
