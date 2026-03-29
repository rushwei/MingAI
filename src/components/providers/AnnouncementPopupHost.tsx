'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { SidebarAnnouncementCenter } from '@/components/layout/SidebarAnnouncementCenter';
import {
    ANNOUNCEMENT_CENTER_STORAGE_KEY,
    getAnnouncementCenterLocalState,
    getEndOfLocalDayIso,
    getAnnouncementPromptIdentity,
    shouldPromptLatestAnnouncement,
    type Announcement,
    type AnnouncementCenterLocalState,
} from '@/lib/announcement';
import { loadLatestAnnouncement as loadLatestAnnouncementFromStore } from '@/lib/announcement-latest-store';
import { useFeatureToggles } from '@/lib/hooks/useFeatureToggles';

export type AnnouncementCenterTab = 'notifications' | 'announcements';

type OpenAnnouncementCenterOptions = {
    tab?: AnnouncementCenterTab;
};

type CloseAnnouncementCenterOptions = {
    dismissAnnouncementForToday?: boolean;
};

type AnnouncementCenterContextValue = {
    openAnnouncementCenter: (options?: OpenAnnouncementCenterOptions) => void;
    closeAnnouncementCenter: (options?: CloseAnnouncementCenterOptions) => void;
    announcementPromptCount: number;
};

const AnnouncementCenterContext = createContext<AnnouncementCenterContextValue | null>(null);

function readAnnouncementCenterLocalState() {
    if (typeof window === 'undefined') {
        return {};
    }

    try {
        const raw = window.localStorage.getItem(ANNOUNCEMENT_CENTER_STORAGE_KEY);
        return getAnnouncementCenterLocalState(raw ? JSON.parse(raw) : null);
    } catch {
        return {};
    }
}

function writeAnnouncementCenterLocalState(value: AnnouncementCenterLocalState) {
    if (typeof window === 'undefined') {
        return;
    }

    window.localStorage.setItem(ANNOUNCEMENT_CENTER_STORAGE_KEY, JSON.stringify(value));
}

export function useAnnouncementCenterSafe() {
    return useContext(AnnouncementCenterContext) ?? {
        openAnnouncementCenter: () => { },
        closeAnnouncementCenter: () => { },
        announcementPromptCount: 0,
    };
}

export function AnnouncementPopupHost({
    userId,
    authLoading,
    children,
}: {
    userId: string | null;
    authLoading: boolean;
    children: ReactNode;
}) {
    const pathname = usePathname();
    const { isFeatureEnabled } = useFeatureToggles();
    const notificationsEnabled = isFeatureEnabled('notifications');
    const [open, setOpen] = useState(false);
    const [preferredTab, setPreferredTab] = useState<AnnouncementCenterTab>('announcements');
    const [latestAnnouncement, setLatestAnnouncement] = useState<Announcement | null>(null);
    const [announcementPromptCount, setAnnouncementPromptCount] = useState(0);
    const requestSequenceRef = useRef(0);
    const openRef = useRef(false);

    useEffect(() => {
        openRef.current = open;
    }, [open]);

    const closeAnnouncementCenter = useCallback((options: CloseAnnouncementCenterOptions = {}) => {
        if (options.dismissAnnouncementForToday && latestAnnouncement?.publishedAt) {
            writeAnnouncementCenterLocalState({
                latestAnnouncementKey: getAnnouncementPromptIdentity(latestAnnouncement) ?? undefined,
                latestPublishedAt: latestAnnouncement.publishedAt,
                dismissedUntil: getEndOfLocalDayIso(new Date()),
            });
            setAnnouncementPromptCount(0);
        }

        setOpen(false);
    }, [latestAnnouncement]);

    const openAnnouncementCenter = useCallback((options: OpenAnnouncementCenterOptions = {}) => {
        const wantsNotifications = options.tab === 'notifications' && !!userId && notificationsEnabled;
        setPreferredTab(wantsNotifications ? 'notifications' : 'announcements');
        setOpen(true);
    }, [notificationsEnabled, userId]);

    const loadLatestAnnouncement = useCallback(async () => {
        const requestId = ++requestSequenceRef.current;

        if (pathname.startsWith('/admin')) {
            setAnnouncementPromptCount(0);
            setLatestAnnouncement(null);
            setOpen(false);
            return;
        }

        if (authLoading) {
            return;
        }

        let announcement: Announcement | null = null;
        try {
            announcement = await loadLatestAnnouncementFromStore();
        } catch (error) {
            const message = error instanceof Error ? error.message : '获取公告失败';
            console.error('[announcement-center] failed to load latest announcement:', message);
            return;
        }

        if (requestId !== requestSequenceRef.current) {
            return;
        }

        setLatestAnnouncement(announcement);

        const shouldPrompt = shouldPromptLatestAnnouncement({
            announcementKey: getAnnouncementPromptIdentity(announcement),
            state: readAnnouncementCenterLocalState(),
        });
        const nextPromptCount = shouldPrompt ? 1 : 0;
        setAnnouncementPromptCount(nextPromptCount);

        if (shouldPrompt && !openRef.current) {
            setPreferredTab('announcements');
            setOpen(true);
        }
    }, [authLoading, pathname]);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            void loadLatestAnnouncement();
        }, 0);

        return () => {
            window.clearTimeout(timer);
        };
    }, [loadLatestAnnouncement, pathname]);

    useEffect(() => {
        const handleAnnouncementsInvalidate = () => {
            void loadLatestAnnouncement();
        };

        window.addEventListener('mingai:announcements:invalidate', handleAnnouncementsInvalidate);
        return () => {
            window.removeEventListener('mingai:announcements:invalidate', handleAnnouncementsInvalidate);
        };
    }, [loadLatestAnnouncement]);

    const contextValue = useMemo<AnnouncementCenterContextValue>(() => ({
        openAnnouncementCenter,
        closeAnnouncementCenter,
        announcementPromptCount,
    }), [announcementPromptCount, closeAnnouncementCenter, openAnnouncementCenter]);

    return (
        <AnnouncementCenterContext.Provider value={contextValue}>
            {children}
            {open ? (
                <SidebarAnnouncementCenter
                    key={`${preferredTab}-${userId ?? 'visitor'}`}
                    open={open}
                    userId={userId}
                    notificationsEnabled={notificationsEnabled}
                    initialTab={preferredTab}
                    onClose={closeAnnouncementCenter}
                />
            ) : null}
        </AnnouncementCenterContext.Provider>
    );
}
