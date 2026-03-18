'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { getUnreadCount } from '@/lib/notification';

type NotificationUnreadState = {
    userId: string | null;
    unreadCount: number;
};

const listeners = new Set<() => void>();
let unreadState: NotificationUnreadState = {
    userId: null,
    unreadCount: 0,
};
let activeUserId: string | null = null;
let activeSubscribers = 0;
let pollTimer: number | null = null;
let listenersAttached = false;

function emitUnreadState() {
    for (const listener of listeners) {
        listener();
    }
}

function setUnreadState(next: NotificationUnreadState) {
    unreadState = next;
    emitUnreadState();
}

function applyUnreadDelta(delta: number) {
    if (!activeUserId) {
        return;
    }
    setUnreadState({
        userId: activeUserId,
        unreadCount: Math.max(0, unreadState.unreadCount + delta),
    });
}

async function refreshUnreadCount(userId: string, options?: { bypassCache?: boolean }) {
    const count = await getUnreadCount(userId, options);
    if (activeUserId !== userId) {
        return;
    }
    setUnreadState({ userId, unreadCount: count });
}

function stopPolling() {
    if (typeof window === 'undefined') {
        return;
    }
    if (pollTimer !== null) {
        window.clearInterval(pollTimer);
        pollTimer = null;
    }
    if (listenersAttached) {
        window.removeEventListener('mingai:api-write', handleApiWrite);
        window.removeEventListener('mingai:notifications:invalidate', handleNotificationsInvalidate);
        window.removeEventListener('mingai:notifications-unread', handleNotificationsUnreadUpdate);
        listenersAttached = false;
    }
}

function handleApiWrite(event: Event) {
    const detail = (event as CustomEvent<{ table?: string }>).detail;
    if (detail?.table === 'notifications' && activeUserId) {
        void refreshUnreadCount(activeUserId, { bypassCache: true });
    }
}

function handleNotificationsInvalidate() {
    if (activeUserId) {
        void refreshUnreadCount(activeUserId, { bypassCache: true });
    }
}

function handleNotificationsUnreadUpdate(event: Event) {
    const detail = (event as CustomEvent<{ count?: number; delta?: number }>).detail;
    if (typeof detail?.count === 'number') {
        setUnreadState({
            userId: activeUserId,
            unreadCount: Math.max(0, detail.count),
        });
        return;
    }
    if (typeof detail?.delta === 'number') {
        applyUnreadDelta(detail.delta);
    }
}

function startPolling(userId: string) {
    if (typeof window === 'undefined') {
        return;
    }
    stopPolling();
    activeUserId = userId;
    setUnreadState({ userId, unreadCount: 0 });
    void refreshUnreadCount(userId);
    pollTimer = window.setInterval(() => {
        void refreshUnreadCount(userId, { bypassCache: true });
    }, 30_000);
    window.addEventListener('mingai:api-write', handleApiWrite);
    window.addEventListener('mingai:notifications:invalidate', handleNotificationsInvalidate);
    window.addEventListener('mingai:notifications-unread', handleNotificationsUnreadUpdate);
    listenersAttached = true;
}

function subscribeUnreadState(listener: () => void) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

function getUnreadSnapshot(userId: string | null) {
    return unreadState.userId === userId ? unreadState.unreadCount : 0;
}

type UseNotificationUnreadCountOptions = {
    enabled?: boolean;
};

export function useNotificationUnreadCount(
    userId: string | null,
    options: UseNotificationUnreadCountOptions = {},
) {
    const enabled = options.enabled ?? true;
    const unreadCount = useSyncExternalStore(
        subscribeUnreadState,
        () => (enabled ? getUnreadSnapshot(userId) : 0),
        () => 0,
    );

    useEffect(() => {
        if (!userId || !enabled) {
            return;
        }
        activeSubscribers += 1;

        if (activeUserId !== userId || pollTimer === null) {
            startPolling(userId);
        }

        return () => {
            activeSubscribers = Math.max(0, activeSubscribers - 1);
            if (activeSubscribers === 0) {
                activeUserId = null;
                stopPolling();
                setUnreadState({ userId: null, unreadCount: 0 });
            }
        };
    }, [enabled, userId]);

    return unreadCount;
}
