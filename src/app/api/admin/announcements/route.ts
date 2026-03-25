import { NextRequest } from 'next/server';
import { getSystemAdminClient, jsonError, jsonOk, requireAdminContext } from '@/lib/api-utils';
import {
    parseAnnouncementInput,
    serializeAnnouncement,
    validateAnnouncementHref,
    validateAnnouncementCtaPair,
    validateAnnouncementTimeRange,
    type AnnouncementRow,
} from '@/lib/announcement';

export async function GET(request: NextRequest) {
    const auth = await requireAdminContext(request);
    if ('error' in auth) {
        return jsonError(auth.error.message, auth.error.status);
    }

    const supabase = getSystemAdminClient();
    const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('display_order', { ascending: true })
        .order('published_at', { ascending: false })
        .order('created_at', { ascending: false });

    if (error) {
        console.error('[announcements][admin][GET] query failed:', error);
        return jsonError('获取公告列表失败', 500);
    }

    return jsonOk({
        announcements: (data || []).map((row: AnnouncementRow) => serializeAnnouncement(row)),
    });
}

export async function POST(request: NextRequest) {
    const auth = await requireAdminContext(request);
    if ('error' in auth) {
        return jsonError(auth.error.message, auth.error.status);
    }

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return jsonError('请求体不是合法 JSON', 400);
    }

    const parsed = parseAnnouncementInput(body);
    if (parsed.error || !parsed.value) {
        return jsonError(parsed.error || '公告参数无效', 400);
    }

    const ctaError = validateAnnouncementCtaPair(parsed.value.ctaLabel, parsed.value.ctaHref);
    if (ctaError) {
        return jsonError(ctaError, 400);
    }

    const hrefError = validateAnnouncementHref(parsed.value.ctaHref);
    if (hrefError) {
        return jsonError(hrefError, 400);
    }

    const timeError = validateAnnouncementTimeRange(parsed.value.startsAt, parsed.value.endsAt);
    if (timeError) {
        return jsonError(timeError, 400);
    }

    const nowIso = new Date().toISOString();
    const publishedAt = parsed.value.status === 'published'
        ? (parsed.value.publishedAt || nowIso)
        : null;

    const payload = {
        title: parsed.value.title!,
        content: parsed.value.content!,
        cta_label: parsed.value.ctaLabel ?? null,
        cta_href: parsed.value.ctaHref ?? null,
        status: parsed.value.status ?? 'draft',
        priority: parsed.value.priority ?? 'normal',
        display_order: parsed.value.displayOrder ?? 0,
        starts_at: parsed.value.startsAt ?? null,
        ends_at: parsed.value.endsAt ?? null,
        popup_enabled: parsed.value.popupEnabled ?? true,
        audience_scope: parsed.value.audienceScope ?? 'all_visitors',
        version: 1,
        published_at: publishedAt,
        created_by: auth.user.id,
        updated_by: auth.user.id,
    };

    const supabase = getSystemAdminClient();
    const { data, error } = await supabase
        .from('announcements')
        .insert(payload)
        .select('*')
        .single();

    if (error) {
        console.error('[announcements][admin][POST] insert failed:', error);
        return jsonError('创建公告失败', 500);
    }

    return jsonOk({ announcement: serializeAnnouncement(data as AnnouncementRow) });
}
