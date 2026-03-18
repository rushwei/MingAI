/**
 * 通知铃铛组件
 * 
 * 显示未读通知数量，点击展开通知列表
 */
'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { NotificationDropdown } from '@/components/notification/NotificationDropdown';
import { useNotificationUnreadCount } from '@/lib/hooks/useNotificationUnreadCount';

interface NotificationBellProps {
    userId: string | null;
}

export function NotificationBell({ userId }: NotificationBellProps) {
    const unreadCount = useNotificationUnreadCount(userId);
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // 点击外部关闭
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!userId) {
        return null;
    }

    return (
        <div ref={containerRef} className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-lg hover:bg-background-secondary transition-colors"
                aria-label="通知"
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-bold text-white bg-red-500 rounded-full">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <NotificationDropdown
                    userId={userId}
                    onClose={() => setIsOpen(false)}
                    onReadCountChange={(change: number) => {
                        window.dispatchEvent(
                            new CustomEvent('mingai:notifications-unread', { detail: { delta: change } })
                        );
                    }}
                />
            )}
        </div>
    );
}
