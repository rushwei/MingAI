/**
 * 侧边栏状态上下文
 * 
 * 用于跨组件共享侧边栏的展开/收起状态
 */
'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface SidebarContextType {
    collapsed: boolean;
    setCollapsed: (collapsed: boolean) => void;
    toggleCollapsed: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
    const [collapsed, setCollapsedState] = useState(false);

    const setCollapsed = useCallback((value: boolean) => {
        setCollapsedState(value);
    }, []);

    const toggleCollapsed = useCallback(() => {
        setCollapsedState(prev => !prev);
    }, []);

    return (
        <SidebarContext.Provider value={{ collapsed, setCollapsed, toggleCollapsed }}>
            {children}
        </SidebarContext.Provider>
    );
}

export function useSidebar() {
    const context = useContext(SidebarContext);
    if (context === undefined) {
        throw new Error('useSidebar must be used within a SidebarProvider');
    }
    return context;
}

/**
 * 可选的 hook，在没有 Provider 时返回默认值
 */
export function useSidebarSafe() {
    const context = useContext(SidebarContext);
    return context ?? { collapsed: false, setCollapsed: () => { }, toggleCollapsed: () => { } };
}
