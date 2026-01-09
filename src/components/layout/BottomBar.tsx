/**
 * 底部固定栏组件
 * 
 * 可复用的底部固定栏，自动适应侧边栏宽度
 * 
 * @example
 * <BottomBar show={selectMode}>
 *     <div>左侧内容</div>
 *     <div>右侧内容</div>
 * </BottomBar>
 */
'use client';

import { ReactNode } from 'react';
import { useSidebarSafe } from './SidebarContext';

interface BottomBarProps {
    show: boolean;
    children: ReactNode;
    className?: string;
}

// 侧边栏宽度常量
const SIDEBAR_COLLAPSED_WIDTH = 72;
const SIDEBAR_EXPANDED_WIDTH = 240;

export function BottomBar({ show, children, className = '' }: BottomBarProps) {
    const { collapsed } = useSidebarSafe();

    if (!show) return null;

    // 计算左侧偏移量（桌面端需要考虑侧边栏）
    const sidebarWidth = collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH;

    return (
        <>
            {/* 桌面端 - 需要偏移侧边栏宽度 */}
            <div
                className={`hidden lg:block fixed bottom-0 right-0 z-50 transition-all duration-300 ${className}`}
                style={{ left: sidebarWidth }}
            >
                <div className="max-w-2xl mx-auto px-4">
                    <div className="bg-background border border-border rounded-t-xl shadow-lg px-4 py-3 flex items-center justify-between">
                        {children}
                    </div>
                </div>
            </div>

            {/* 移动端 - 全宽 */}
            <div className={`lg:hidden fixed bottom-0 left-0 right-0 z-50 px-4 ${className}`}>
                <div className="bg-background border border-border rounded-t-xl shadow-lg px-4 py-3 flex items-center justify-between">
                    {children}
                </div>
            </div>
        </>
    );
}
