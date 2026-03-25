'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Megaphone, X, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { requestBrowserJson } from '@/lib/browser-api';
import {
    buildAnnouncementLocalStateKey,
    executeAnnouncementCtaNavigation,
    resolveAnnouncementViewerScope,
    shouldApplyAnnouncementLoadResult,
    type AnnouncementDismissState,
    getAnnouncementDismissState,
    shouldSuppressAnnouncement,
    type Announcement,
} from '@/lib/announcement';

function getEndOfLocalDayIso(now: Date) {
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return end.toISOString();
}

function readLocalDismissState(announcementId: string, version: number, userId: string | null) {
    if (typeof window === 'undefined') return {};
    try {
        const raw = window.localStorage.getItem(buildAnnouncementLocalStateKey(announcementId, version, userId));
        return getAnnouncementDismissState(raw ? JSON.parse(raw) : null);
    } catch {
        return {};
    }
}

function writeLocalDismissState(
    announcementId: string,
    version: number,
    userId: string | null,
    value: AnnouncementDismissState,
) {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(
        buildAnnouncementLocalStateKey(announcementId, version, userId),
        JSON.stringify(value),
    );
}

export function AnnouncementPopupHost({
    userId,
    authLoading,
}: {
    userId: string | null;
    authLoading: boolean;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const requestSequenceRef = useRef(0);
    const scopeUserId = resolveAnnouncementViewerScope(userId, authLoading);

    const loadAnnouncements = useCallback(async () => {
        const requestId = ++requestSequenceRef.current;

        if (pathname.startsWith('/admin')) {
            setAnnouncements([]);
            setCurrentIndex(0);
            setIsOpen(false);
            return;
        }
        if (scopeUserId === undefined) {
            return;
        }

        const result = await requestBrowserJson<{ announcements?: Announcement[] }>('/api/announcements/active', {
            method: 'GET',
        });

        if (result.error) {
            console.error('[announcements][popup] load failed:', result.error.message);
            return;
        }

        const nowIso = new Date().toISOString();
        const visibleAnnouncements = (result.data?.announcements || []).filter((announcement) => (
            !shouldSuppressAnnouncement(
                readLocalDismissState(announcement.id, announcement.version, scopeUserId),
                nowIso,
            )
        ));

        if (!shouldApplyAnnouncementLoadResult({
            pathname,
            requestId,
            currentRequestId: requestSequenceRef.current,
            viewerScope: scopeUserId,
        })) {
            return;
        }
        setAnnouncements(visibleAnnouncements);
        setCurrentIndex(0);
        setIsOpen(visibleAnnouncements.length > 0);
    }, [pathname, scopeUserId]);

    useEffect(() => {
        if (scopeUserId === undefined) {
            requestSequenceRef.current += 1;
            return;
        }
        const timer = window.setTimeout(() => {
            void loadAnnouncements();
        }, 0);

        return () => {
            window.clearTimeout(timer);
        };
    }, [loadAnnouncements, scopeUserId]);

    const current = announcements[currentIndex] ?? null;
    const pageLabel = useMemo(() => (
        announcements.length > 1 ? `${currentIndex + 1} / ${announcements.length}` : null
    ), [announcements.length, currentIndex]);

    const dismissCurrent = useCallback(async (mode: 'today' | 'permanent') => {
        const active = announcements[currentIndex];
        if (!active) return;

        const now = new Date();
        const localState = mode === 'today'
            ? { dismissedUntil: getEndOfLocalDayIso(now) }
            : { dismissedPermanentlyAt: now.toISOString() };

        writeLocalDismissState(active.id, active.version, scopeUserId ?? null, localState);

        if (scopeUserId) {
            const payload = mode === 'today'
                ? {
                    announcementId: active.id,
                    version: active.version,
                    mode,
                    dismissedUntil: localState.dismissedUntil,
                }
                : {
                    announcementId: active.id,
                    version: active.version,
                    mode,
                };

            void requestBrowserJson('/api/announcements/dismiss', {
                method: 'POST',
                body: JSON.stringify(payload),
            });
        }

        setAnnouncements((currentList) => {
            const nextList = currentList.filter((_, index) => index !== currentIndex);
            setCurrentIndex((index) => Math.min(index, Math.max(0, nextList.length - 1)));
            setIsOpen(nextList.length > 0);
            return nextList;
        });
    }, [announcements, currentIndex, scopeUserId]);

    const navigateToHref = useCallback((href: string) => {
        executeAnnouncementCtaNavigation({
            href,
            origin: window.location.origin,
            dismiss: () => {
                void dismissCurrent('today');
            },
            navigateInternal: (targetHref) => {
                router.push(targetHref);
            },
            navigateExternal: (targetHref) => {
                window.location.assign(targetHref);
            },
            onBlocked: (rawHref) => {
                console.error('[announcements][popup] blocked unsafe CTA href:', rawHref);
            },
        });
    }, [dismissCurrent, router]);

    if (!isOpen || !current) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(127,29,29,0.22),rgba(15,23,42,0.66))] backdrop-blur-sm"
                onClick={() => dismissCurrent('today')}
            />
            <div className="relative w-full max-w-2xl rounded-[32px] border border-red-200 bg-white shadow-[0_30px_80px_rgba(127,29,29,0.32)] overflow-hidden">
                <button
                    onClick={() => dismissCurrent('today')}
                    className="absolute top-4 right-4 p-2 rounded-full bg-white/80 hover:bg-white transition-colors text-slate-500"
                    aria-label="关闭公告"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="px-6 py-5 border-b border-red-100 bg-[linear-gradient(135deg,rgba(254,226,226,1),rgba(255,255,255,0.96))]">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-red-500 text-white flex items-center justify-center shadow-[0_10px_24px_rgba(239,68,68,0.28)]">
                                <Megaphone className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs px-2.5 py-1 rounded-full bg-red-500 text-white font-semibold tracking-[0.18em]">公告</span>
                                    <span className="text-xs px-2.5 py-1 rounded-full bg-white text-red-600 border border-red-200">
                                        {current.priority === 'critical' ? '高优先级' : '站点通知'}
                                    </span>
                                </div>
                                <div className="text-xs text-red-700 mt-2">
                                    {current.publishedAt ? new Date(current.publishedAt).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' }) : '即时公告'}
                                </div>
                            </div>
                        </div>
                        {pageLabel ? (
                            <div className="flex items-center gap-2 text-xs text-foreground-secondary">
                                <button
                                    onClick={() => setCurrentIndex((index) => Math.max(0, index - 1))}
                                    disabled={currentIndex === 0}
                                    className="p-2 rounded-full bg-white border border-border disabled:opacity-40"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <span>{pageLabel}</span>
                                <button
                                    onClick={() => setCurrentIndex((index) => Math.min(announcements.length - 1, index + 1))}
                                    disabled={currentIndex >= announcements.length - 1}
                                    className="p-2 rounded-full bg-white border border-border disabled:opacity-40"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        ) : null}
                    </div>
                </div>

                <div className="px-6 py-6 sm:px-8 sm:py-8">
                    <h2 className="text-2xl font-semibold text-slate-900 pr-10">
                        {current.title}
                    </h2>
                    <p className="mt-4 text-[15px] leading-8 text-slate-600 whitespace-pre-wrap">
                        {current.content}
                    </p>
                </div>

                <div className="px-6 py-5 sm:px-8 border-t border-red-100 bg-red-50/60 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => dismissCurrent('today')}
                            className="px-4 py-2.5 rounded-xl border border-red-200 bg-white text-red-600 hover:bg-red-50 transition-colors"
                        >
                            今日关闭
                        </button>
                        <button
                            onClick={() => dismissCurrent('permanent')}
                            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-900 text-white hover:bg-slate-800 transition-colors"
                        >
                            关闭公告
                        </button>
                    </div>
                    {current.ctaHref && current.ctaLabel ? (
                        <button
                            onClick={() => navigateToHref(current.ctaHref!)}
                            className="px-4 py-2.5 rounded-xl bg-red-500 text-white hover:bg-red-500/90 transition-colors inline-flex items-center justify-center gap-2"
                        >
                            {current.ctaLabel}
                            <ExternalLink className="w-4 h-4" />
                        </button>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
