/**
 * 消息通知页面
 * 
 * 支持多选、批量删除、批量已读
 */
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft,
    Bell,
    CheckCheck,
    Loader2,
    ExternalLink,
    Trash2,
    Square,
    CheckSquare,
    MailOpen,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { BottomBar } from '@/components/layout/BottomBar';
import {
    getNotifications,
    markAsRead,
    markAllAsRead,
    markSelectedAsRead,
    deleteNotification,
    deleteNotifications,
    type Notification
} from '@/lib/notification';

// 通知类型样式 - 保持简洁的颜色
const typeStyles: Record<string, { icon: string; label: string }> = {
    feature_launch: { icon: '🎉', label: '功能上线' },
    system: { icon: '📢', label: '系统通知' },
    promotion: { icon: '🎁', label: '活动推广' },
};

// 格式化时间
function formatTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;
    return date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
}

export default function NotificationsPage() {
    const router = useRouter();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // 多选状态
    const [selectMode, setSelectMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const resolveNotificationLink = (link: string) => {
        try {
            const url = new URL(link, window.location.origin);
            return `${url.pathname}${url.search}${url.hash}`;
        } catch {
            return link.startsWith('/') ? link : `/${link}`;
        }
    };

    // 获取用户和通知
    useEffect(() => {
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) {
                router.push('/');
                return;
            }
            setUserId(session.user.id);

            const data = await getNotifications(session.user.id, 50);
            setNotifications(data);
            setIsLoading(false);
        };
        init();
    }, [router]);

    // 统计数据
    const unreadCount = useMemo(() => notifications.filter(n => !n.is_read).length, [notifications]);
    const selectedCount = selectedIds.size;
    const allSelected = notifications.length > 0 && selectedIds.size === notifications.length;

    useEffect(() => {
        window.dispatchEvent(
            new CustomEvent('mingai:notifications-unread', { detail: { count: unreadCount } })
        );
    }, [unreadCount]);

    // 切换选择模式
    const toggleSelectMode = () => {
        setSelectMode(!selectMode);
        setSelectedIds(new Set());
    };

    // 切换单个选择
    const toggleSelect = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    // 全选/取消全选
    const toggleSelectAll = () => {
        if (allSelected) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(notifications.map(n => n.id)));
        }
    };

    // 标记单条已读
    const handleMarkRead = async (notification: Notification, e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (notification.is_read) return;

        const success = await markAsRead(notification.id);
        if (success) {
            setNotifications(prev =>
                prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
            );
        }
    };

    // 删除单条
    const handleDeleteSingle = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const success = await deleteNotification(id);
        if (success) {
            setNotifications(prev => prev.filter(n => n.id !== id));
        }
    };

    // 点击通知
    const handleClick = async (notification: Notification) => {
        if (selectMode) {
            toggleSelect(notification.id);
            return;
        }

        await handleMarkRead(notification);
        if (notification.link) {
            router.push(resolveNotificationLink(notification.link));
        }
    };

    // 标记全部已读
    const handleMarkAllRead = async () => {
        if (!userId) return;
        setIsProcessing(true);
        const success = await markAllAsRead(userId);
        if (success) {
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        }
        setIsProcessing(false);
    };

    // 标记选中已读
    const handleMarkSelectedRead = async () => {
        if (selectedIds.size === 0) return;
        setIsProcessing(true);
        const success = await markSelectedAsRead(Array.from(selectedIds));
        if (success) {
            setNotifications(prev =>
                prev.map(n => selectedIds.has(n.id) ? { ...n, is_read: true } : n)
            );
            setSelectedIds(new Set());
        }
        setIsProcessing(false);
    };

    // 删除选中
    const handleDeleteSelected = async () => {
        if (selectedIds.size === 0) return;
        setIsProcessing(true);
        const success = await deleteNotifications(Array.from(selectedIds));
        if (success) {
            setNotifications(prev => prev.filter(n => !selectedIds.has(n.id)));
            setSelectedIds(new Set());
            if (notifications.length - selectedIds.size === 0) {
                setSelectMode(false);
            }
        }
        setIsProcessing(false);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto px-4 py-8 animate-fade-in">
            {/* 标题栏 */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <Link
                        href="/user"
                        className="p-2 -ml-2 rounded-lg hover:bg-background-secondary transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div className="flex items-center gap-3">
                        <Bell className="w-6 h-6 text-accent" />
                        <h1 className="text-xl font-bold">消息通知</h1>
                        {unreadCount > 0 && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-accent/10 text-accent rounded-full">
                                {unreadCount} 未读
                            </span>
                        )}
                    </div>
                </div>

                {/* 操作按钮 */}
                <div className="flex items-center gap-2">
                    {notifications.length > 0 && !selectMode && (
                        <button
                            onClick={handleMarkAllRead}
                            disabled={isProcessing || unreadCount === 0}
                            className="text-sm px-3 py-1.5 rounded-lg text-foreground-secondary hover:bg-background-secondary transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isProcessing ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <CheckCheck className="w-4 h-4" />
                            )}
                            一键已读
                        </button>
                    )}
                    {notifications.length > 0 && (
                        <button
                            onClick={toggleSelectMode}
                            className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${selectMode
                                ? 'bg-accent/10 text-accent'
                                : 'text-foreground-secondary hover:bg-background-secondary'
                                }`}
                        >
                            {selectMode ? '取消' : '多选'}
                        </button>
                    )}
                </div>
            </div>

            {/* 通知列表 */}
            {notifications.length === 0 ? (
                <div className="text-center py-16">
                    <Bell className="w-12 h-12 text-foreground-tertiary mx-auto mb-4" />
                    <p className="text-foreground-secondary">暂无通知</p>
                </div>
            ) : (
                <div className={`bg-background rounded-xl border border-border overflow-hidden ${selectMode ? 'mb-20' : ''}`}>
                    {notifications.map((notification, index) => {
                        const style = typeStyles[notification.type] || typeStyles.system;
                        const isSelected = selectedIds.has(notification.id);

                        return (
                            <div
                                key={notification.id}
                                onClick={() => handleClick(notification)}
                                className={`
                                    w-full text-left px-4 py-4 cursor-pointer transition-colors
                                    ${index !== notifications.length - 1 ? 'border-b border-border' : ''}
                                    ${!notification.is_read ? 'bg-accent/5' : ''}
                                    ${isSelected ? 'bg-accent/10' : ''}
                                    hover:bg-background-secondary
                                `}
                            >
                                <div className="flex gap-3">
                                    {/* 选择框 */}
                                    {selectMode && (
                                        <div className="flex items-center">
                                            {isSelected ? (
                                                <CheckSquare className="w-5 h-5 text-accent" />
                                            ) : (
                                                <Square className="w-5 h-5 text-foreground-tertiary" />
                                            )}
                                        </div>
                                    )}

                                    {/* 图标 */}
                                    <span className="text-xl flex-shrink-0">{style.icon}</span>

                                    {/* 内容 */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2 mb-1">
                                            <div className="flex-1 min-w-0">
                                                <span className="text-xs px-1.5 py-0.5 rounded bg-foreground/5 text-foreground-secondary mr-2">
                                                    {style.label}
                                                </span>
                                                <span className={`font-medium ${!notification.is_read ? 'text-foreground' : 'text-foreground-secondary'}`}>
                                                    {notification.title}
                                                </span>
                                            </div>
                                            {!notification.is_read && !selectMode && (
                                                <span className="w-2 h-2 rounded-full bg-accent flex-shrink-0 mt-2" />
                                            )}
                                        </div>
                                        {notification.content && (
                                            <p className="text-sm text-foreground-secondary line-clamp-2 mb-2">
                                                {notification.content}
                                            </p>
                                        )}
                                        <div className="flex items-center gap-3 text-xs text-foreground-tertiary">
                                            <span>{formatTime(notification.created_at)}</span>
                                            {notification.link && !selectMode && (
                                                <span className="flex items-center gap-1 text-accent">
                                                    查看详情
                                                    <ExternalLink className="w-3 h-3" />
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* 单条操作按钮 - 右侧居中 */}
                                    {!selectMode && (
                                        <div className="flex items-center justify-center gap-2">
                                            {!notification.is_read && (
                                                <button
                                                    onClick={(e) => handleMarkRead(notification, e)}
                                                    className="p-1.5 rounded-lg text-foreground-tertiary hover:text-accent hover:bg-accent/10 transition-colors"
                                                    title="标记已读"
                                                >
                                                    <MailOpen className="w-5 h-5" />
                                                </button>
                                            )}
                                            <button
                                                onClick={(e) => handleDeleteSingle(notification.id, e)}
                                                className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors"
                                                title="删除"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* 底部选择工具栏 */}
            <BottomBar show={selectMode && notifications.length > 0}>
                <div className="flex items-center gap-4">
                    <button
                        onClick={toggleSelectAll}
                        className="flex items-center gap-2 text-sm text-foreground-secondary hover:text-foreground transition-colors"
                    >
                        {allSelected ? (
                            <CheckSquare className="w-5 h-5 text-accent" />
                        ) : (
                            <Square className="w-5 h-5" />
                        )}
                        {allSelected ? '取消全选' : '全选'}
                    </button>
                    <span className="text-sm text-foreground-secondary">
                        已选 {selectedCount} 条
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleMarkSelectedRead}
                        disabled={isProcessing || selectedCount === 0}
                        className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-background-secondary hover:bg-background border border-border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <CheckCheck className="w-4 h-4" />
                        已读
                    </button>
                    <button
                        onClick={handleDeleteSelected}
                        disabled={isProcessing || selectedCount === 0}
                        className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg text-red-500 bg-red-500/10 hover:bg-red-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Trash2 className="w-4 h-4" />
                        删除
                    </button>
                </div>
            </BottomBar>
        </div>
    );
}
