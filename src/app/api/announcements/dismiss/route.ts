import { NextRequest } from 'next/server';
import { getSystemAdminClient, jsonError, jsonOk, requireUserContext } from '@/lib/api-utils';
import { isAnnouncementDismissMode, isAnnouncementUuid } from '@/lib/announcement';

export async function POST(request: NextRequest) {
    const auth = await requireUserContext(request);
    if ('error' in auth) {
        return jsonError(auth.error.message, auth.error.status);
    }

    let body: {
        announcementId?: unknown;
        version?: unknown;
        mode?: unknown;
        dismissedUntil?: unknown;
    };
    try {
        body = await request.json() as {
            announcementId?: unknown;
            version?: unknown;
            mode?: unknown;
            dismissedUntil?: unknown;
        };
    } catch {
        return jsonError('请求体不是合法 JSON', 400);
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return jsonError('请求体不是合法对象', 400);
    }

    if (typeof body.announcementId !== 'string' || !body.announcementId.trim()) {
        return jsonError('缺少公告 ID', 400);
    }
    if (!isAnnouncementUuid(body.announcementId.trim())) {
        return jsonError('公告 ID 无效', 400);
    }
    if (typeof body.version !== 'number' || !Number.isInteger(body.version) || body.version < 1) {
        return jsonError('公告版本无效', 400);
    }
    if (!isAnnouncementDismissMode(body.mode)) {
        return jsonError('关闭模式无效', 400);
    }

    let dismissedUntil: string | null = null;
    let dismissedPermanentlyAt: string | null = null;

    if (body.mode === 'today') {
        if (typeof body.dismissedUntil !== 'string' || Number.isNaN(Date.parse(body.dismissedUntil))) {
            return jsonError('今日关闭截止时间无效', 400);
        }
        dismissedUntil = new Date(body.dismissedUntil).toISOString();
    } else {
        dismissedPermanentlyAt = new Date().toISOString();
    }

    const supabase = getSystemAdminClient();
    const { error } = await supabase
        .from('announcement_user_states')
        .upsert({
            announcement_id: body.announcementId.trim(),
            user_id: auth.user.id,
            version: body.version,
            dismissed_until: dismissedUntil,
            dismissed_permanently_at: dismissedPermanentlyAt,
            seen_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        }, {
            onConflict: 'announcement_id,user_id,version',
        });

    if (error) {
        console.error('[announcements][dismiss][POST] upsert failed:', error);
        return jsonError('关闭公告失败', 500);
    }

    return jsonOk({ success: true });
}
