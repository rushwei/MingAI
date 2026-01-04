/**
 * ThemeProvider 组件
 * 
 * 为什么使用 Context？
 * - useContext 允许我们在组件树中共享主题状态，无需通过 props 层层传递
 * - 任何子组件都可以通过 useTheme() 获取和修改当前主题
 * 
 * 'use client' 标记说明：
 * - 主题切换需要与浏览器交互（localStorage、DOM 操作），所以必须在客户端运行
 */
'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

// 定义主题类型
type Theme = 'light' | 'dark';

// 定义 Context 类型
interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

// 创建 Context，默认值为 undefined
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * Theme Provider 组件
 * 包裹应用根组件，提供主题状态管理
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  // useState 用于管理当前主题状态
  // 默认使用浅色主题，后续会从 localStorage 读取用户偏好
  const [theme, setTheme] = useState<Theme>('dark');
  const [mounted, setMounted] = useState(false);

  // useEffect 用于在组件挂载时执行副作用
  // 这里用于：1. 读取用户保存的主题偏好 2. 监听系统主题变化
  useEffect(() => {
    // 从 localStorage 读取保存的主题
    const savedTheme = localStorage.getItem('theme') as Theme | null;

    // 如果没有保存的偏好，则检测系统主题
    if (savedTheme) {
      setTheme(savedTheme);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
    }

    setMounted(true);
  }, []);

  // 当主题变化时，更新 DOM 和 localStorage
  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;

    // 切换 dark class
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // 保存用户偏好到 localStorage
    localStorage.setItem('theme', theme);
  }, [theme, mounted]);

  // 切换主题的函数
  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // 始终提供 Context，避免 useTheme 在 SSR 时报错
  // 在挂载前使用隐藏样式避免闪烁
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      <div style={!mounted ? { visibility: 'hidden' } : undefined}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

/**
 * 自定义 Hook：获取主题上下文
 * 
 * 为什么封装成 Hook？
 * - 提供类型安全，确保在 Provider 内使用
 * - 简化使用方式：const { theme, toggleTheme } = useTheme()
 */
export function useTheme() {
  const context = useContext(ThemeContext);

  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
}
