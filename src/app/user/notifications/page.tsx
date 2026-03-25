/**
 * 消息通知页面
 *
 * 支持筛选、多选、批量删除、批量已读
 */
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Bell,
    CheckCheck,
    ExternalLink,
    Trash2,
    Square,
    CheckSquare,
    MailOpen,
    Funnel,
} from 'lucide-react';
import { SoundWaveLoader } from '@/components/ui/SoundWaveLoader';
import { useToast } from '@/components/ui/Toast';
import { supabase } from '@/lib/auth';
import { BottomBar } from '@/components/layout/BottomBar';
import {
    deleteNotification,
    deleteNotifications,
    getNotifications,
    markAllAsRead,
    markAsRead,
    markSelectedAsRead,
    type Notification,
} from '@/lib/notification';
import { FeatureGate } from '@/components/layout/FeatureGate';
import {
    filterNotifications,
    groupNotificationsByDay,
    reconcileSelectedNotificationIds,
    type NotificationFilterState,
} from '@/lib/notification-view';

const typeStyles: Record<string, { icon: string; label: string }> = {
    feature_launch: { icon: '🎉', label: '功能上线' },
    system: { icon: '📢', label: '系统通知' },
    promotion: { icon: '🎁', label: '活动推广' },
};

const readFilterOptions: Array<{ value: NotificationFilterState['read']; label: string }> = [
    { value: 'all', label: '全部' },
    { value: 'unread', label: '未读' },
    { value: 'read', label: '已读' },
];

const typeFilterOptions: Array<{ value: NotificationFilterState['type']; label: string }> = [
    { value: 'all', label: '全部类型' },
    { value: 'system', label: '系统' },
    { value: 'feature_launch', label: '功能' },
    { value: 'promotion', label: '活动' },
];

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
    return (
        <FeatureGate featureId="notifications">
            <NotificationsContent />
        </FeatureGate>
    );
}

function NotificationsContent() {
    const router = useRouter();
    const { showToast } = useToast();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectMode, setSelectMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [filters, setFilters] = useState<NotificationFilterState>({
        read: 'all',
        type: 'all',
    });

    const resolveNotificationLink = (link: string) => {
        try {
            const url = new URL(link, window.location.origin);
            return `${url.pathname}${url.search}${url.hash}`;
        } catch {
            return link.startsWith('/') ? link : `/${link}`;
        }
    };

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

        void init();
    }, [router]);

    const unreadCount = useMemo(() => notifications.filter((item) => !item.is_read).length, [notifications]);
    const visibleNotifications = useMemo(
        () => filterNotifications(notifications, filters),
        [notifications, filters],
    );
    const groupedNotifications = useMemo(
        () => groupNotificationsByDay(visibleNotifications),
        [visibleNotifications],
    );
    const selectedCount = selectedIds.size;
    const allSelected = visibleNotifications.length > 0 && visibleNotifications.every((item) => selectedIds.has(item.id));

    useEffect(() => {
        window.dispatchEvent(
            new CustomEvent('mingai:notifications-unread', { detail: { count: unreadCount } }),
        );
    }, [unreadCount]);

    const toggleSelectMode = () => {
        setSelectMode((current) => !current);
        setSelectedIds(new Set());
    };

    const toggleSelect = (id: string) => {
        setSelectedIds((current) => {
            const next = new Set(current);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (allSelected) {
            setSelectedIds(new Set());
            return;
        }
        setSelectedIds(new Set(visibleNotifications.map((item) => item.id)));
    };

    const updateFilters = (patch: Partial<NotificationFilterState>) => {
        const nextFilters = { ...filters, ...patch };
        setFilters(nextFilters);
        setSelectedIds((existing) => reconcileSelectedNotificationIds(
            existing,
            filterNotifications(notifications, nextFilters),
        ));
    };

    const handleMarkRead = async (notification: Notification, e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (notification.is_read) return;

        const success = await markAsRead(notification.id);
        if (success) {
            setNotifications((current) => current.map((item) => (
                item.id === notification.id ? { ...item, is_read: true } : item
            )));
            showToast('success', '已标记为已读');
        } else {
            showToast('error', '标记已读失败');
        }
    };

    const handleDeleteSingle = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const success = await deleteNotification(id);
        if (success) {
            setNotifications((current) => current.filter((item) => item.id !== id));
            setSelectedIds((current) => {
                const next = new Set(current);
                next.delete(id);
                return next;
            });
            showToast('success', '通知已删除');
        } else {
            showToast('error', '删除通知失败');
        }
    };

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

    const handleMarkAllRead = async () => {
        if (!userId) return;
        setIsProcessing(true);
        const success = await markAllAsRead(userId);
        if (success) {
            setNotifications((current) => current.map((item) => ({ ...item, is_read: true })));
            showToast('success', '已将全部通知标记为已读');
        } else {
            showToast('error', '一键已读失败');
        }
        setIsProcessing(false);
    };

    const handleMarkSelectedRead = async () => {
        if (selectedIds.size === 0) return;
        setIsProcessing(true);
        const ids = Array.from(selectedIds);
        const success = await markSelectedAsRead(ids);
        if (success) {
            setNotifications((current) => current.map((item) => (
                selectedIds.has(item.id) ? { ...item, is_read: true } : item
            )));
            setSelectedIds(new Set());
            showToast('success', `已处理 ${ids.length} 条通知`);
        } else {
            showToast('error', '批量已读失败');
        }
        setIsProcessing(false);
    };

    const handleDeleteSelected = async () => {
        if (selectedIds.size === 0) return;
        setIsProcessing(true);
        const ids = Array.from(selectedIds);
        const success = await deleteNotifications(ids);
        if (success) {
            setNotifications((current) => current.filter((item) => !selectedIds.has(item.id)));
            setSelectedIds(new Set());
            if (notifications.length - ids.length <= 0) {
                setSelectMode(false);
            }
            showToast('success', `已删除 ${ids.length} 条通知`);
        } else {
            showToast('error', '批量删除失败');
        }
        setIsProcessing(false);
    };

    if (isLoading) {
        return (
            <div className="animate-fade-in">
                <div className="max-w-2xl mx-auto px-4 py-2 md:py-8">
                    <div className="hidden md:flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="h-7 w-24 rounded bg-foreground/10 animate-pulse" />
                            <div className="h-5 w-14 rounded-full bg-foreground/10 animate-pulse" />
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="h-8 w-20 rounded-lg bg-foreground/5 animate-pulse" />
                            <div className="h-8 w-14 rounded-lg bg-foreground/5 animate-pulse" />
                        </div>
                    </div>
                    <div className="bg-background rounded-xl border border-border overflow-hidden">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="px-4 py-4 border-b border-border last:border-b-0">
                                <div className="flex gap-3">
                                    <div className="w-6 h-6 rounded bg-foreground/10 animate-pulse flex-shrink-0" />
                                    <div className="flex-1 min-w-0 space-y-2">
                                        <div className="flex items-center gap-2">
                                            <div className="h-4 w-16 rounded bg-foreground/5 animate-pulse" />
                                            <div className="h-5 w-40 rounded bg-foreground/10 animate-pulse" />
                                        </div>
                                        <div className="h-4 w-full rounded bg-foreground/5 animate-pulse" />
                                        <div className="h-3 w-20 rounded bg-foreground/5 animate-pulse" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-fade-in">
            <div className="max-w-2xl mx-auto px-4 py-2 md:py-8">
                <div className="hidden md:flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <h1 className="text-xl font-bold">消息通知</h1>
                        {unreadCount > 0 && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-accent/10 text-accent rounded-full">
                                {unreadCount} 未读
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {notifications.length > 0 && !selectMode && (
                            <button
                                onClick={handleMarkAllRead}
                                disabled={isProcessing || unreadCount === 0}
                                className="text-sm px-3 py-1.5 rounded-lg text-foreground-secondary hover:bg-background-secondary transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isProcessing ? <SoundWaveLoader variant="inline" /> : <CheckCheck className="w-4 h-4" />}
                                一键已读
                            </button>
                        )}
                        {notifications.length > 0 && (
                            <button
                                onClick={toggleSelectMode}
                                className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
                                    selectMode ? 'bg-accent/10 text-accent' : 'text-foreground-secondary hover:bg-background-secondary'
                                }`}
                            >
                                {selectMode ? '取消' : '多选'}
                            </button>
                        )}
                    </div>
                </div>

                <div className="md:hidden flex items-center justify-between sm:mb-4 mb-2">
                    {unreadCount > 0 && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-accent/10 text-accent rounded-full">
                            {unreadCount} 未读
                        </span>
                    )}
                    <div className="flex items-center gap-2 ml-auto">
                        {notifications.length > 0 && !selectMode && unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllRead}
                                disabled={isProcessing}
                                className="text-sm px-3 py-1.5 rounded-lg text-foreground-secondary hover:bg-background-secondary transition-colors"
                            >
                                <CheckCheck className="w-4 h-4" />
                            </button>
                        )}
                        {notifications.length > 0 && (
                            <button
                                onClick={toggleSelectMode}
                                className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
                                    selectMode ? 'bg-accent/10 text-accent' : 'text-foreground-secondary hover:bg-background-secondary'
                                }`}
                            >
                                {selectMode ? '取消' : '多选'}
                            </button>
                        )}
                    </div>
                </div>

                {notifications.length > 0 && (
                    <div className="mb-4 rounded-2xl border border-border bg-background p-4">
                        <div className="flex items-center gap-2 text-sm font-medium mb-3">
                            <Funnel className="w-4 h-4 text-foreground-secondary" />
                            筛选通知
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {readFilterOptions.map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => updateFilters({ read: option.value })}
                                    className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                                        filters.read === option.value
                                            ? 'bg-accent text-white'
                                            : 'bg-background-secondary text-foreground-secondary hover:bg-background-secondary/80'
                                    }`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                        <div className="flex flex-wrap gap-2 mt-3">
                            {typeFilterOptions.map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => updateFilters({ type: option.value })}
                                    className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                                        filters.type === option.value
                                            ? 'bg-foreground text-background'
                                            : 'bg-background-secondary text-foreground-secondary hover:bg-background-secondary/80'
                                    }`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {notifications.length === 0 ? (
                    <div className="text-center py-16">
                        <Bell className="w-12 h-12 text-foreground-tertiary mx-auto mb-4" />
                        <p className="text-foreground-secondary">暂无通知</p>
                    </div>
                ) : visibleNotifications.length === 0 ? (
                    <div className="text-center py-16 rounded-2xl border border-dashed border-border">
                        <Bell className="w-12 h-12 text-foreground-tertiary mx-auto mb-4" />
                        <p className="text-foreground-secondary">当前筛选下暂无通知</p>
                    </div>
                ) : (
                    <div className={`space-y-4 ${selectMode ? 'mb-20' : ''}`}>
                        {groupedNotifications.map((group) => (
                            <section key={group.label}>
                                <div className="text-xs font-medium text-foreground-secondary mb-2 px-1">
                                    {group.label}
                                </div>
                                <div className="bg-background rounded-xl border border-border overflow-hidden">
                                    {group.items.map((notification, index) => {
                                        const style = typeStyles[notification.type] || typeStyles.system;
                                        const isSelected = selectedIds.has(notification.id);

                                        return (
                                            <div
                                                key={notification.id}
                                                onClick={() => handleClick(notification)}
                                                className={`
                                                    w-full text-left px-4 py-4 cursor-pointer transition-colors
                                                    ${index !== group.items.length - 1 ? 'border-b border-border' : ''}
                                                    ${!notification.is_read ? 'bg-accent/5' : ''}
                                                    ${isSelected ? 'bg-accent/10' : ''}
                                                    hover:bg-background-secondary
                                                `}
                                            >
                                                <div className="flex gap-3">
                                                    {selectMode && (
                                                        <div className="flex items-center">
                                                            {isSelected ? (
                                                                <CheckSquare className="w-5 h-5 text-accent" />
                                                            ) : (
                                                                <Square className="w-5 h-5 text-foreground-tertiary" />
                                                            )}
                                                        </div>
                                                    )}

                                                    <span className="text-xl flex-shrink-0">{style.icon}</span>

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
                                                            <div className="flex items-center gap-2 shrink-0">
                                                                {!notification.is_read && !selectMode && (
                                                                    <span className="w-2 h-2 rounded-full bg-accent" />
                                                                )}
                                                                <span className={`text-[11px] px-2 py-0.5 rounded-full ${
                                                                    notification.is_read
                                                                        ? 'bg-background-secondary text-foreground-tertiary'
                                                                        : 'bg-accent/10 text-accent'
                                                                }`}>
                                                                    {notification.is_read ? '已读' : '未读'}
                                                                </span>
                                                            </div>
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
                            </section>
                        ))}
                    </div>
                )}

                <BottomBar show={selectMode && visibleNotifications.length > 0}>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={toggleSelectAll}
                            className="flex items-center gap-2 text-sm text-foreground-secondary hover:text-foreground transition-colors"
                        >
                            {allSelected ? <CheckSquare className="w-5 h-5 text-accent" /> : <Square className="w-5 h-5" />}
                            {allSelected ? '取消全选' : '全选当前筛选'}
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
        </div>
    );
}
