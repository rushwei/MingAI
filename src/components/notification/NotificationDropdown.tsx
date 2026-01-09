/**
 * 通知下拉列表组件
 */
'use client';

import { useState, useEffect } from 'react';
import { Check, CheckCheck, ExternalLink, Loader2 } from 'lucide-react';
import { getNotifications, markAsRead, markAllAsRead, type Notification } from '@/lib/notification';

interface NotificationDropdownProps {
    userId: string;
    onClose: () => void;
    onReadCountChange: (change: number) => void;
}

// 通知类型图标和颜色
const typeStyles: Record<string, { icon: string; color: string }> = {
    feature_launch: { icon: '🎉', color: 'text-amber-500' },
    system: { icon: '📢', color: 'text-blue-500' },
    promotion: { icon: '🎁', color: 'text-pink-500' },
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
    return date.toLocaleDateString('zh-CN');
}

export function NotificationDropdown({ userId, onClose, onReadCountChange }: NotificationDropdownProps) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [markingAll, setMarkingAll] = useState(false);

    const resolveNotificationLink = (link: string) => {
        try {
            const url = new URL(link, window.location.origin);
            return `${url.pathname}${url.search}${url.hash}`;
        } catch {
            return link.startsWith('/') ? link : `/${link}`;
        }
    };

    // 加载通知
    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            const data = await getNotifications(userId, 10);
            setNotifications(data);
            setIsLoading(false);
        };
        load();
    }, [userId]);

    // 标记单条已读
    const handleMarkRead = async (notification: Notification) => {
        if (notification.is_read) return;

        const success = await markAsRead(notification.id);
        if (success) {
            setNotifications(prev =>
                prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
            );
            onReadCountChange(-1);
        }
    };

    // 点击通知
    const handleClick = async (notification: Notification) => {
        await handleMarkRead(notification);
        if (notification.link) {
            window.location.href = resolveNotificationLink(notification.link);
        }
        onClose();
    };

    // 标记全部已读
    const handleMarkAllRead = async () => {
        setMarkingAll(true);
        const unreadCount = notifications.filter(n => !n.is_read).length;
        const success = await markAllAsRead(userId);
        if (success) {
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            onReadCountChange(-unreadCount);
        }
        setMarkingAll(false);
    };

    const hasUnread = notifications.some(n => !n.is_read);

    return (
        <div className="absolute right-0 top-full mt-2 w-80 max-h-[480px] bg-background rounded-xl border border-border shadow-xl overflow-hidden z-50 animate-fade-in">
            {/* 标题栏 */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background-secondary">
                <h3 className="font-semibold">通知</h3>
                {hasUnread && (
                    <button
                        onClick={handleMarkAllRead}
                        disabled={markingAll}
                        className="text-xs text-accent hover:underline flex items-center gap-1"
                    >
                        {markingAll ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                            <CheckCheck className="w-3 h-3" />
                        )}
                        全部已读
                    </button>
                )}
            </div>

            {/* 通知列表 */}
            <div className="overflow-y-auto max-h-[380px]">
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-6 h-6 animate-spin text-accent" />
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="py-12 text-center text-foreground-secondary">
                        <p>暂无通知</p>
                    </div>
                ) : (
                    notifications.map(notification => {
                        const style = typeStyles[notification.type] || typeStyles.system;
                        return (
                            <button
                                key={notification.id}
                                onClick={() => handleClick(notification)}
                                className={`w-full text-left px-4 py-3 border-b border-border hover:bg-background-secondary transition-colors ${!notification.is_read ? 'bg-accent/5' : ''
                                    }`}
                            >
                                <div className="flex gap-3">
                                    <span className="text-xl flex-shrink-0">{style.icon}</span>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <p className={`font-medium text-sm truncate ${!notification.is_read ? 'text-foreground' : 'text-foreground-secondary'}`}>
                                                {notification.title}
                                            </p>
                                            {!notification.is_read && (
                                                <span className="w-2 h-2 rounded-full bg-accent flex-shrink-0 mt-1.5" />
                                            )}
                                        </div>
                                        {notification.content && (
                                            <p className="text-xs text-foreground-secondary line-clamp-2 mt-0.5">
                                                {notification.content}
                                            </p>
                                        )}
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs text-foreground-tertiary">
                                                {formatTime(notification.created_at)}
                                            </span>
                                            {notification.link && (
                                                <ExternalLink className="w-3 h-3 text-foreground-tertiary" />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </button>
                        );
                    })
                )}
            </div>

            {/* 底部 */}
            {notifications.length > 0 && (
                <div className="px-4 py-2 border-t border-border bg-background-secondary">
                    <button
                        onClick={onClose}
                        className="w-full text-center text-xs text-foreground-secondary hover:text-foreground"
                    >
                        关闭
                    </button>
                </div>
            )}
        </div>
    );
}
