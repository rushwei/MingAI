/**
 * 通用历史记录抽屉组件
 *
 * 'use client' 标记说明：
 * - 使用 React hooks (useState, useEffect, useCallback)
 * - 使用 useRouter 进行客户端导航
 */
'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { History, ChevronLeft, Calendar, X } from 'lucide-react';
import { SoundWaveLoader } from '@/components/ui/SoundWaveLoader';
import { writeSessionJSON } from '@/lib/cache';
import { useSessionSafe } from '@/components/providers/ClientProviders';
import { loadHistoryRestore, loadHistorySummariesPage } from '@/lib/history/client';
import {
    HISTORY_CONFIG,
    type HistorySummaryItem,
    type HistoryType,
} from '@/lib/history/registry';

// 格式化日期（提取到组件外部，避免每次渲染重新创建）
function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

interface HistoryDrawerProps {
    type: HistoryType;
    className?: string;
}

export function HistoryDrawer({ type, className = '' }: HistoryDrawerProps) {
    const router = useRouter();
    const { user, loading: sessionLoading } = useSessionSafe();
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [navigating, setNavigating] = useState<string | null>(null);
    const [items, setItems] = useState<HistorySummaryItem[]>([]);
    const defaultTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai';

    const config = HISTORY_CONFIG[type];

    const loadHistory = useCallback(async () => {
        if (!user?.id) return;
        setLoading(true);
        try {
            const result = await loadHistorySummariesPage(type, { limit: 10, offset: 0 });
            setItems(result.items);
        } catch (error) {
            console.error('[history-drawer] failed to load history:', error);
            setItems([]);
        } finally {
            setLoading(false);
        }
    }, [type, user?.id]);

    const handleToggle = useCallback(() => {
        if (!isOpen) {
            loadHistory();
        }
        setIsOpen(!isOpen);
    }, [isOpen, loadHistory]);

    // 点击查看历史记录详情
    const handleViewItem = useCallback(async (itemId: string) => {
        setNavigating(itemId);

        try {
            const payload = await loadHistoryRestore(type, itemId, defaultTimeZone);
            if (!payload) {
                console.error('[history-drawer] failed to restore record:', itemId);
                setNavigating(null);
                return;
            }

            writeSessionJSON(payload.sessionKey, payload.sessionData);

            setIsOpen(false);
            setNavigating(null);
            const targetPath = payload.useTimestamp
                ? `${payload.detailPath}?from=history&t=${Date.now()}`
                : payload.detailPath;
            router.push(targetPath);
        } catch (err) {
            console.error('[history-drawer] navigation error:', err);
            setNavigating(null);
        }
    }, [defaultTimeZone, router, type]);

    if (sessionLoading || !user?.id) return null;

    // 面板宽度
    const PANEL_WIDTH = 320; // 20rem

    return (
        <>
            {/* 遮罩层 - 仅展开时显示 */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/20 z-40 transition-opacity duration-300"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* 
                主容器
                固定在右侧，手机端避开顶部和底部导航栏
                通过 translateX 控制显示/隐藏
            */}
            <div
                className={`
                    fixed top-15 bottom-15 md:top-1/2 md:bottom-auto md:-translate-y-1/2 right-0 z-50
                    flex items-center
                    transition-transform duration-300 ease-out
                    ${className}
                `}
                style={{
                    transform: isOpen ? 'translateX(0)' : `translateX(${PANEL_WIDTH}px)`,
                    filter: 'drop-shadow(-4px 0 8px rgba(0,0,0,0.05))'
                }}
            >
                {/* 
                   把手部分 (白色/背景色)
                   使用 SVG 实现带边框的反向圆角，以适应白色背景
                */}
                <div className="group relative flex flex-col items-end z-20 cursor-pointer" onClick={handleToggle}>
                    {/* 上方反向圆角 */}
                    <svg width="16" height="16" className="relative -mb-[1px] z-30 pointer-events-none">
                        {/* 填充：右下角区域，左上为凹弧 */}
                        <path d="M 16 0 L 16 16 L 0 16 A 16 16 0 0 0 16 0 Z" className="fill-background" />
                        {/* 描边：仅描绘弧线部分 */}
                        <path d="M 0 16 A 16 16 0 0 0 16 0" className="stroke-border fill-none" strokeWidth="1" />
                    </svg>

                    {/* 按钮主体 */}
                    <button
                        className={`
                            relative
                            flex items-center justify-center
                            w-10 h-16
                            bg-white
                            rounded-l-md
                            transition-colors duration-150
                            border-y border-l border-gray-200
                            border-r-0
                            -mr-[1px]
                            shadow-sm
                        `}
                        title={isOpen ? "收起" : "历史记录"}
                    >
                        <div className="transition-all duration-150 text-[#2383e2]">
                            {isOpen ? (
                                <X className="w-5 h-5" />
                            ) : (
                                <History className="w-5 h-5" />
                            )}
                        </div>
                    </button>

                    {/* 下方反向圆角 */}
                    <svg width="16" height="16" className="relative -mt-[1px] z-30 pointer-events-none">
                        {/* 填充：右上角区域，左下为凹弧 */}
                        <path d="M 16 16 L 16 0 L 0 0 A 16 16 0 0 1 16 16 Z" className="fill-white" />
                        {/* 描边：仅描绘弧线部分 */}
                        <path d="M 0 0 A 16 16 0 0 1 16 16" className="stroke-gray-200 fill-none" strokeWidth="1" />
                    </svg>
                </div>

                {/* 
                    内容面板 
                    手机端使用 h-full 自适应，桌面端使用固定高度
                */}
                <div
                    className="h-full md:h-[90vh] bg-[#f7f6f3] border-y border-l border-gray-200 rounded-l-lg shadow-md flex flex-col overflow-hidden relative text-[#37352f]"
                    style={{
                        width: PANEL_WIDTH,
                        marginLeft: '-1px' // 消除缝隙
                    }}
                >
                    {/* 头部 */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-white/80 backdrop-blur-sm">
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-sm uppercase tracking-wider text-[#37352f]/60">{config.label}</span>
                            <span className="px-2 py-0.5 rounded-md bg-[#efedea] text-[#37352f] text-[10px] font-bold">
                                {items.length}
                            </span>
                        </div>
                        <Link
                            href={config.historyPath}
                            className="text-[11px] font-bold text-[#2383e2] hover:underline transition-colors flex items-center gap-1"
                        >
                            全部
                            <ChevronLeft className="w-3 h-3 rotate-180" />
                        </Link>
                    </div>

                    {/* 列表 */}
                    <div className="flex-1 overflow-y-auto p-3">
                        {loading ? (
                            <div className="space-y-2">
                                {/* 骨架屏 - 模拟历史记录项 */}
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <div key={i} className="p-3 rounded-md bg-white border border-gray-100 animate-pulse">
                                        <div className="h-4 w-3/4 rounded bg-[#efedea] mb-2" />
                                        <div className="h-3 w-1/2 rounded bg-[#efedea]" />
                                    </div>
                                ))}
                            </div>
                        ) : items.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-[#37352f]/40 gap-3">
                                <History className="w-8 h-8 opacity-20" />
                                <span className="text-xs font-medium">暂无历史记录</span>
                            </div>
                        ) : (
                            <div className="space-y-1.5">
                                {items.map(item => (
                                    <div
                                        key={item.id}
                                        className={`group/item relative p-3 rounded-md bg-white border border-gray-100 hover:bg-[#efedea] active:bg-[#e3e1db] transition-all duration-150 cursor-pointer overflow-hidden shadow-sm ${navigating === item.id ? 'opacity-60' : ''}`}
                                        onClick={() => !navigating && handleViewItem(item.id)}
                                    >
                                        {/* 加载指示器 */}
                                        {navigating === item.id && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-20">
                                                <SoundWaveLoader variant="inline" />
                                            </div>
                                        )}
                                        <div className="flex items-start gap-3 relative z-10">
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-sm font-bold text-[#37352f] truncate flex items-center gap-1.5">
                                                    <span className="truncate">{item.title}</span>
                                                    {item.changedTitle && (
                                                        <>
                                                            <span className="text-[10px] text-[#37352f]/40 font-normal">变</span>
                                                            <span className="truncate font-medium">{item.changedTitle}</span>
                                                        </>
                                                    )}
                                                    {item.subType && (
                                                        <span className={`
                                                            text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-tight
                                                            ${item.subType === '情侣' ? 'bg-rose-50 text-rose-600' :
                                                                item.subType === '商业' ? 'bg-blue-50 text-blue-600' :
                                                                    item.subType === '亲子' ? 'bg-amber-50 text-amber-600' :
                                                                        'bg-[#efedea] text-[#37352f]/60'}
                                                        `}>
                                                            {item.subType}
                                                        </span>
                                                    )}
                                                </h4>
                                                {/* 问题显示在标题下方 */}
                                                {item.question && (
                                                    <p className="text-[11px] text-[#37352f]/50 truncate mt-0.5 font-medium">
                                                        {item.question}
                                                    </p>
                                                )}
                                                <div className="flex items-center gap-2 mt-2">
                                                    <span className="text-[10px] text-[#37352f]/40 font-bold flex items-center gap-1">
                                                        <Calendar className="w-3 h-3" />
                                                        {formatDate(item.createdAt)}
                                                    </span>
                                                    {item.modelName && (
                                                        <span className="text-[10px] text-[#37352f]/40 font-bold border-l border-gray-200 pl-2">
                                                            {item.modelName}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* 底部渐变遮罩 (提示可滚动) */}
                    <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#f7f6f3] to-transparent pointer-events-none" />
                </div>
            </div>
        </>
    );
}
