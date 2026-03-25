import { NextRequest } from 'next/server';
import { getSystemAdminClient, jsonError, jsonOk, requireAdminContext } from '@/lib/api-utils';
import {
    parseAnnouncementInput,
    serializeAnnouncement,
    validateAnnouncementHref,
    validateAnnouncementCtaPair,
    validateAnnouncementTimeRange,
    type Announcement,
    type AnnouncementRow,
} from '@/lib/announcement';

type RouteContext = {
    params: Promise<{ id: string }>;
};

function shouldBumpVersion(current: Announcement, next: Announcement) {
    return (
        current.title !== next.title
        || current.content !== next.content
        || current.ctaLabel !== next.ctaLabel
        || current.ctaHref !== next.ctaHref
        || current.priority !== next.priority
        || current.displayOrder !== next.displayOrder
        || current.startsAt !== next.startsAt
        || current.endsAt !== next.endsAt
        || current.popupEnabled !== next.popupEnabled
        || current.audienceScope !== next.audienceScope
    );
}

export async function GET(request: NextRequest, context: RouteContext) {
    const auth = await requireAdminContext(request);
    if ('error' in auth) {
        return jsonError(auth.error.message, auth.error.status);
    }

    const { id } = await context.params;
    const supabase = getSystemAdminClient();
    const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !data) {
        return jsonError('公告不存在', 404);
    }

    return jsonOk({ announcement: serializeAnnouncement(data as AnnouncementRow) });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
    const auth = await requireAdminContext(request);
    if ('error' in auth) {
        return jsonError(auth.error.message, auth.error.status);
    }

    const { id } = await context.params;
    const supabase = getSystemAdminClient();
    const { data: currentRow, error: currentError } = await supabase
        .from('announcements')
        .select('*')
        .eq('id', id)
        .single();

    if (currentError || !currentRow) {
        return jsonError('公告不存在', 404);
    }

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return jsonError('请求体不是合法 JSON', 400);
    }

    const parsed = parseAnnouncementInput(body, { partial: true });
    if (parsed.error || !parsed.value) {
        return jsonError(parsed.error || '公告参数无效', 400);
    }

    const current = serializeAnnouncement(currentRow as AnnouncementRow);
    const next: Announcement = {
        ...current,
        ...(typeof parsed.value.title === 'string' ? { title: parsed.value.title } : {}),
        ...(typeof parsed.value.content === 'string' ? { content: parsed.value.content } : {}),
        ...(Object.prototype.hasOwnProperty.call(parsed.value, 'ctaLabel') ? { ctaLabel: parsed.value.ctaLabel ?? null } : {}),
        ...(Object.prototype.hasOwnProperty.call(parsed.value, 'ctaHref') ? { ctaHref: parsed.value.ctaHref ?? null } : {}),
        ...(parsed.value.status ? { status: parsed.value.status } : {}),
        ...(parsed.value.priority ? { priority: parsed.value.priority } : {}),
        ...(typeof parsed.value.displayOrder === 'number' ? { displayOrder: parsed.value.displayOrder } : {}),
        ...(typeof parsed.value.popupEnabled === 'boolean' ? { popupEnabled: parsed.value.popupEnabled } : {}),
        ...(parsed.value.audienceScope ? { audienceScope: parsed.value.audienceScope } : {}),
        ...(Object.prototype.hasOwnProperty.call(parsed.value, 'startsAt') ? { startsAt: parsed.value.startsAt ?? null } : {}),
        ...(Object.prototype.hasOwnProperty.call(parsed.value, 'endsAt') ? { endsAt: parsed.value.endsAt ?? null } : {}),
        ...(Object.prototype.hasOwnProperty.call(parsed.value, 'publishedAt') ? { publishedAt: parsed.value.publishedAt ?? null } : {}),
    };

    const ctaError = validateAnnouncementCtaPair(next.ctaLabel, next.ctaHref);
    if (ctaError) {
        return jsonError(ctaError, 400);
    }

    const hrefError = validateAnnouncementHref(next.ctaHref);
    if (hrefError) {
        return jsonError(hrefError, 400);
    }

    const timeError = validateAnnouncementTimeRange(next.startsAt, next.endsAt);
    if (timeError) {
        return jsonError(timeError, 400);
    }

    const nowIso = new Date().toISOString();
    const hasPublishedHistory = !!current.publishedAt;
    const isPublishingTransition = next.status === 'published' && current.status !== 'published';
    const shouldSetPublishedAt = isPublishingTransition;
    const needsVersionBump = (
        next.status === 'published'
        && (
            (current.status === 'published' && shouldBumpVersion(current, next))
            || (hasPublishedHistory && current.status !== 'published')
        )
    );

    const updatePayload: Record<string, unknown> = {
        title: next.title,
        content: next.content,
        cta_label: next.ctaLabel,
        cta_href: next.ctaHref,
        status: next.status,
        priority: next.priority,
        display_order: next.displayOrder,
        starts_at: next.startsAt,
        ends_at: next.endsAt,
        popup_enabled: next.popupEnabled,
        audience_scope: next.audienceScope,
        published_at: shouldSetPublishedAt ? nowIso : next.publishedAt,
        updated_by: auth.user.id,
    };

    if (needsVersionBump) {
        updatePayload.version = current.version + 1;
    }

    const { data, error } = await supabase
        .from('announcements')
        .update(updatePayload)
        .eq('id', id)
        .select('*')
        .single();

    if (error || !data) {
        console.error('[announcements][admin][PATCH] update failed:', error);
        return jsonError('更新公告失败', 500);
    }

    return jsonOk({ announcement: serializeAnnouncement(data as AnnouncementRow) });
}
