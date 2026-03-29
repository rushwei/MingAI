import { createMemoryCache, createSingleFlight } from '@/lib/cache';
import { requestBrowserJson } from '@/lib/browser-api';
import type { Announcement } from '@/lib/announcement';

type LatestAnnouncementCacheEntry = {
    announcement: Announcement | null;
};

const LATEST_ANNOUNCEMENT_CACHE_KEY = 'latest';
const LATEST_ANNOUNCEMENT_CACHE_TTL_MS = 60_000;

const latestAnnouncementCache = createMemoryCache<LatestAnnouncementCacheEntry>(
    LATEST_ANNOUNCEMENT_CACHE_TTL_MS,
    1,
);
const latestAnnouncementSingleFlight = createSingleFlight<Announcement | null>();

export async function loadLatestAnnouncement(options: { force?: boolean } = {}) {
    if (!options.force) {
        const cached = latestAnnouncementCache.get(LATEST_ANNOUNCEMENT_CACHE_KEY);
        if (cached) {
            return cached.announcement;
        }
    }

    return await latestAnnouncementSingleFlight.run(LATEST_ANNOUNCEMENT_CACHE_KEY, async () => {
        const result = await requestBrowserJson<{ announcement?: Announcement | null }>('/api/announcements?latest=1', {
            method: 'GET',
        });

        if (result.error) {
            throw new Error(result.error.message ?? '获取公告失败');
        }

        const announcement = result.data?.announcement ?? null;
        latestAnnouncementCache.set(LATEST_ANNOUNCEMENT_CACHE_KEY, { announcement });
        return announcement;
    });
}

export function invalidateLatestAnnouncementCache() {
    latestAnnouncementCache.clear();
    latestAnnouncementSingleFlight.clear();
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('mingai:announcements:invalidate'));
    }
}

export function resetLatestAnnouncementStoreForTests() {
    latestAnnouncementCache.clear();
    latestAnnouncementSingleFlight.clear();
}
