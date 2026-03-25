import { NextRequest } from 'next/server';
import { getAuthContext, getSystemAdminClient, jsonError, jsonOk } from '@/lib/api-utils';
import { serializeAnnouncement, type AnnouncementRow } from '@/lib/announcement';

export async function GET(request: NextRequest) {
    const auth = await getAuthContext(request);
    const nowIso = new Date().toISOString();
    const supabase = getSystemAdminClient();

    const { data: rows, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('status', 'published')
        .eq('popup_enabled', true)
        .or(`starts_at.is.null,starts_at.lte.${nowIso}`)
        .or(`ends_at.is.null,ends_at.gt.${nowIso}`)
        .order('published_at', { ascending: false });

    if (error) {
        console.error('[announcements][active][GET] query failed:', error);
        return jsonError('获取公告失败', 500);
    }

    const announcements = (rows || [])
        .map((row: AnnouncementRow) => serializeAnnouncement(row))
        .filter((announcement) => (
            auth.user
                ? announcement.audienceScope === 'all_visitors' || announcement.audienceScope === 'signed_in_only'
                : announcement.audienceScope === 'all_visitors'
        ))
        .sort((left, right) => (
            left.displayOrder - right.displayOrder
            || Date.parse(right.publishedAt || right.createdAt) - Date.parse(left.publishedAt || left.createdAt)
        ));

    if (!auth.user || announcements.length === 0) {
        return jsonOk({ announcements });
    }

    const ids = announcements.map((announcement) => announcement.id);
    const { data: states, error: statesError } = await supabase
        .from('announcement_user_states')
        .select('announcement_id, version, dismissed_until, dismissed_permanently_at')
        .eq('user_id', auth.user.id)
        .in('announcement_id', ids);

    if (statesError) {
        console.error('[announcements][active][GET] states query failed:', statesError);
        return jsonError('获取公告失败', 500);
    }

    const dismissedMap = new Map(
        (states || []).map((state: {
            announcement_id: string;
            version: number;
            dismissed_until: string | null;
            dismissed_permanently_at: string | null;
        }) => [`${state.announcement_id}:${state.version}`, state]),
    );

    const visibleAnnouncements = announcements.filter((announcement) => {
        const state = dismissedMap.get(`${announcement.id}:${announcement.version}`);
        if (!state) return true;
        if (state.dismissed_permanently_at) return false;
        if (state.dismissed_until && Date.parse(state.dismissed_until) > Date.parse(nowIso)) {
            return false;
        }
        return true;
    });

    return jsonOk({ announcements: visibleAnnouncements });
}
