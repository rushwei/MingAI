/**
 * ThemeProvider 组件
 *
 * 支持三种主题模式：
 * - light: 浅色主题
 * - dark: 深色主题
 * - system: 跟随系统设置自动切换
 */
'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { readLocalCache, writeLocalCache } from '@/lib/cache';

// 主题模式：light、dark 或 system（跟随系统）
type ThemeMode = 'light' | 'dark' | 'system';
// 实际应用的主题（只有 light 或 dark）
type AppliedTheme = 'light' | 'dark';

interface ThemeContextType {
  theme: AppliedTheme;
  themeMode: ThemeMode;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// 获取系统主题偏好
function getSystemTheme(): AppliedTheme {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // 用户选择的主题模式
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return 'system';
    const saved = readLocalCache<ThemeMode>('mingai.pref.themeMode', Number.POSITIVE_INFINITY);
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      return saved;
    }
    // 兼容旧版本存储
    const legacy = readLocalCache<string>('mingai.pref.theme', Number.POSITIVE_INFINITY);
    if (legacy === 'light' || legacy === 'dark') {
      return legacy;
    }
    return 'system';
  });

  // 实际应用的主题
  const [theme, setTheme] = useState<AppliedTheme>(() => {
    if (typeof window === 'undefined') return 'dark';
    if (themeMode === 'system') {
      return getSystemTheme();
    }
    return themeMode;
  });

  // 监听系统主题变化
  useEffect(() => {
    if (themeMode !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [themeMode]);

  // 当主题模式变化时，更新实际主题
  useEffect(() => {
    if (themeMode === 'system') {
      setTheme(getSystemTheme());
    } else {
      setTheme(themeMode);
    }
    writeLocalCache('mingai.pref.themeMode', themeMode);
  }, [themeMode]);

  // 当实际主题变化时，更新 DOM
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // 切换主题：light -> dark -> system -> light
  const toggleTheme = () => {
    setThemeModeState(prev => {
      if (prev === 'light') return 'dark';
      if (prev === 'dark') return 'system';
      return 'light';
    });
  };

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
  };

  return (
    <ThemeContext.Provider value={{ theme, themeMode, toggleTheme, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
