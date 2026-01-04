/**
 * 主题切换按钮组件
 * 
 * 'use client' 标记说明：
 * - 需要与用户交互（点击事件），必须在客户端运行
 */
'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from './ThemeProvider';

/**
 * ThemeToggle 组件
 * 点击后在深色/浅色主题之间切换
 */
export function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className="p-2 rounded-lg transition-all duration-200
                 hover:bg-background-secondary
                 focus:outline-none focus:ring-2 focus:ring-accent/50"
            aria-label={theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
            title={theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
        >
            {theme === 'dark' ? (
                // 深色模式下显示太阳图标，提示用户可以切换到浅色
                <Sun className="w-5 h-5 text-foreground-secondary hover:text-accent transition-colors" />
            ) : (
                // 浅色模式下显示月亮图标，提示用户可以切换到深色
                <Moon className="w-5 h-5 text-foreground-secondary hover:text-accent transition-colors" />
            )}
        </button>
    );
}
