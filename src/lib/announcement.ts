export const ANNOUNCEMENT_STATUSES = ['draft', 'published', 'archived'] as const;
export const ANNOUNCEMENT_PRIORITIES = ['normal', 'critical'] as const;
export const ANNOUNCEMENT_AUDIENCE_SCOPES = ['all_visitors', 'signed_in_only'] as const;
export const ANNOUNCEMENT_DISMISS_MODES = ['today', 'permanent'] as const;

export type AnnouncementStatus = typeof ANNOUNCEMENT_STATUSES[number];
export type AnnouncementPriority = typeof ANNOUNCEMENT_PRIORITIES[number];
export type AnnouncementAudienceScope = typeof ANNOUNCEMENT_AUDIENCE_SCOPES[number];
export type AnnouncementDismissMode = typeof ANNOUNCEMENT_DISMISS_MODES[number];

export interface Announcement {
    id: string;
    title: string;
    content: string;
    ctaLabel: string | null;
    ctaHref: string | null;
    status: AnnouncementStatus;
    priority: AnnouncementPriority;
    displayOrder: number;
    startsAt: string | null;
    endsAt: string | null;
    popupEnabled: boolean;
    audienceScope: AnnouncementAudienceScope;
    version: number;
    publishedAt: string | null;
    createdBy: string | null;
    updatedBy: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface AnnouncementRow {
    id: string;
    title: string;
    content: string;
    cta_label: string | null;
    cta_href: string | null;
    status: AnnouncementStatus;
    priority: AnnouncementPriority;
    display_order: number;
    starts_at: string | null;
    ends_at: string | null;
    popup_enabled: boolean;
    audience_scope: AnnouncementAudienceScope;
    version: number;
    published_at: string | null;
    created_by: string | null;
    updated_by: string | null;
    created_at: string;
    updated_at: string;
}

export interface AnnouncementDismissState {
    dismissedUntil?: string;
    dismissedPermanentlyAt?: string;
    seenAt?: string;
}

export interface AnnouncementInput {
    title?: string;
    content?: string;
    ctaLabel?: string | null;
    ctaHref?: string | null;
    status?: AnnouncementStatus;
    priority?: AnnouncementPriority;
    displayOrder?: number;
    startsAt?: string | null;
    endsAt?: string | null;
    popupEnabled?: boolean;
    audienceScope?: AnnouncementAudienceScope;
    publishedAt?: string | null;
}

const ANNOUNCEMENT_STORAGE_PREFIX = 'mingai:announcement:';

const hasOwn = (value: Record<string, unknown>, key: string) => Object.prototype.hasOwnProperty.call(value, key);

function isAnnouncementStatus(value: unknown): value is AnnouncementStatus {
    return typeof value === 'string' && ANNOUNCEMENT_STATUSES.includes(value as AnnouncementStatus);
}

function isAnnouncementPriority(value: unknown): value is AnnouncementPriority {
    return typeof value === 'string' && ANNOUNCEMENT_PRIORITIES.includes(value as AnnouncementPriority);
}

function isAnnouncementAudienceScope(value: unknown): value is AnnouncementAudienceScope {
    return typeof value === 'string' && ANNOUNCEMENT_AUDIENCE_SCOPES.includes(value as AnnouncementAudienceScope);
}

export function isAnnouncementDismissMode(value: unknown): value is AnnouncementDismissMode {
    return typeof value === 'string' && ANNOUNCEMENT_DISMISS_MODES.includes(value as AnnouncementDismissMode);
}

function normalizeRequiredText(value: unknown, fieldLabel: string): { value?: string; error?: string } {
    if (typeof value !== 'string') {
        return { error: `${fieldLabel}格式无效` };
    }

    const trimmed = value.trim();
    if (!trimmed) {
        return { error: `${fieldLabel}不能为空` };
    }

    return { value: trimmed };
}

function normalizeOptionalText(value: unknown, fieldLabel: string): { value?: string | null; error?: string } {
    if (value === null) return { value: null };
    if (typeof value === 'undefined') return {};
    if (typeof value !== 'string') {
        return { error: `${fieldLabel}格式无效` };
    }
    const trimmed = value.trim();
    return { value: trimmed ? trimmed : null };
}

function normalizeOptionalIsoDate(value: unknown, fieldLabel: string): { value?: string | null; error?: string } {
    if (value === null) return { value: null };
    if (typeof value === 'undefined') return {};
    if (typeof value !== 'string') {
        return { error: `${fieldLabel}格式无效` };
    }

    const trimmed = value.trim();
    if (!trimmed) return { value: null };
    const timestamp = Date.parse(trimmed);
    if (Number.isNaN(timestamp)) {
        return { error: `${fieldLabel}不是合法时间` };
    }
    return { value: new Date(timestamp).toISOString() };
}

export function serializeAnnouncement(row: AnnouncementRow): Announcement {
    return {
        id: row.id,
        title: row.title,
        content: row.content,
        ctaLabel: row.cta_label,
        ctaHref: row.cta_href,
        status: row.status,
        priority: row.priority,
        displayOrder: row.display_order,
        startsAt: row.starts_at,
        endsAt: row.ends_at,
        popupEnabled: row.popup_enabled,
        audienceScope: row.audience_scope,
        version: row.version,
        publishedAt: row.published_at,
        createdBy: row.created_by,
        updatedBy: row.updated_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

export function parseAnnouncementInput(
    body: unknown,
    options: { partial?: boolean } = {},
): { value?: AnnouncementInput; error?: string } {
    const partial = options.partial ?? false;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return { error: '请求体不是合法对象' };
    }

    const raw = body as Record<string, unknown>;
    const value: AnnouncementInput = {};

    if (!partial || hasOwn(raw, 'title')) {
        const parsed = normalizeRequiredText(raw.title, '公告标题');
        if (parsed.error) return { error: parsed.error };
        value.title = parsed.value;
    }

    if (!partial || hasOwn(raw, 'content')) {
        const parsed = normalizeRequiredText(raw.content, '公告内容');
        if (parsed.error) return { error: parsed.error };
        value.content = parsed.value;
    }

    if (hasOwn(raw, 'ctaLabel')) {
        const parsed = normalizeOptionalText(raw.ctaLabel, '按钮文案');
        if (parsed.error) return { error: parsed.error };
        value.ctaLabel = parsed.value ?? null;
    }

    if (hasOwn(raw, 'ctaHref')) {
        const parsed = normalizeOptionalText(raw.ctaHref, '按钮链接');
        if (parsed.error) return { error: parsed.error };
        value.ctaHref = parsed.value ?? null;
    }

    if (hasOwn(raw, 'status')) {
        if (!isAnnouncementStatus(raw.status)) {
            return { error: '公告状态无效' };
        }
        value.status = raw.status;
    } else if (!partial) {
        value.status = 'draft';
    }

    if (hasOwn(raw, 'priority')) {
        if (!isAnnouncementPriority(raw.priority)) {
            return { error: '公告优先级无效' };
        }
        value.priority = raw.priority;
    } else if (!partial) {
        value.priority = 'normal';
    }

    if (hasOwn(raw, 'displayOrder')) {
        if (typeof raw.displayOrder !== 'number' || !Number.isFinite(raw.displayOrder)) {
            return { error: '展示顺序无效' };
        }
        value.displayOrder = Math.trunc(raw.displayOrder);
    } else if (!partial) {
        value.displayOrder = 0;
    }

    if (hasOwn(raw, 'popupEnabled')) {
        if (typeof raw.popupEnabled !== 'boolean') {
            return { error: '弹窗开关无效' };
        }
        value.popupEnabled = raw.popupEnabled;
    } else if (!partial) {
        value.popupEnabled = true;
    }

    if (hasOwn(raw, 'audienceScope')) {
        if (!isAnnouncementAudienceScope(raw.audienceScope)) {
            return { error: '公告受众范围无效' };
        }
        value.audienceScope = raw.audienceScope;
    } else if (!partial) {
        value.audienceScope = 'all_visitors';
    }

    const startsAt = normalizeOptionalIsoDate(raw.startsAt, '开始时间');
    if (startsAt.error) return { error: startsAt.error };
    if (hasOwn(raw, 'startsAt')) value.startsAt = startsAt.value ?? null;

    const endsAt = normalizeOptionalIsoDate(raw.endsAt, '结束时间');
    if (endsAt.error) return { error: endsAt.error };
    if (hasOwn(raw, 'endsAt')) value.endsAt = endsAt.value ?? null;

    const publishedAt = normalizeOptionalIsoDate(raw.publishedAt, '发布时间');
    if (publishedAt.error) return { error: publishedAt.error };
    if (hasOwn(raw, 'publishedAt')) value.publishedAt = publishedAt.value ?? null;

    return { value };
}

export function validateAnnouncementCtaPair(ctaLabel: string | null | undefined, ctaHref: string | null | undefined) {
    const hasLabel = !!ctaLabel;
    const hasHref = !!ctaHref;
    if (hasLabel !== hasHref) {
        return '按钮文案和按钮链接必须同时填写或同时留空';
    }
    return null;
}

export function validateAnnouncementTimeRange(startsAt: string | null | undefined, endsAt: string | null | undefined) {
    if (startsAt && endsAt && Date.parse(endsAt) <= Date.parse(startsAt)) {
        return '结束时间必须晚于开始时间';
    }
    return null;
}

export function isSafeAnnouncementHref(value: string) {
    try {
        const url = new URL(value, 'https://mingai.local');
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
}

export function validateAnnouncementHref(href: string | null | undefined) {
    if (!href) return null;
    return isSafeAnnouncementHref(href) ? null : '按钮链接不安全';
}

export function normalizeAnnouncementNavigationTarget(href: string, origin: string) {
    try {
        const url = new URL(href, origin);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
            return null;
        }
        if (url.origin === origin) {
            return {
                href: `${url.pathname}${url.search}${url.hash}`,
                external: false,
            } as const;
        }
        return {
            href: url.toString(),
            external: true,
        } as const;
    } catch {
        return null;
    }
}

export type AnnouncementCtaExecutionResult = 'blocked' | 'internal' | 'external';

export function executeAnnouncementCtaNavigation(input: {
    href: string;
    origin: string;
    dismiss: () => void;
    navigateInternal: (href: string) => void;
    navigateExternal: (href: string) => void;
    onBlocked?: (href: string) => void;
}): AnnouncementCtaExecutionResult {
    const target = normalizeAnnouncementNavigationTarget(input.href, input.origin);
    if (!target) {
        input.onBlocked?.(input.href);
        return 'blocked';
    }

    // Always dismiss first so CTA target is visible after navigation.
    input.dismiss();

    if (target.external) {
        input.navigateExternal(target.href);
        return 'external';
    }

    input.navigateInternal(target.href);
    return 'internal';
}

export function buildAnnouncementLocalStateKey(
    announcementId: string,
    version: number,
    userId: string | null = null,
) {
    return `${ANNOUNCEMENT_STORAGE_PREFIX}${userId || 'visitor'}:${announcementId}:v${version}`;
}

export function resolveAnnouncementViewerScope(
    userId: string | null,
    authLoading: boolean,
) {
    if (authLoading) {
        return undefined;
    }

    return userId;
}

export function isAnnouncementUuid(value: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value);
}

export function shouldApplyAnnouncementLoadResult(input: {
    pathname: string;
    requestId: number;
    currentRequestId: number;
    viewerScope: string | null | undefined;
}) {
    if (input.viewerScope === undefined) {
        return false;
    }
    if (input.pathname.startsWith('/admin')) {
        return false;
    }
    return input.requestId === input.currentRequestId;
}

export function getAnnouncementDismissState(raw: unknown): AnnouncementDismissState {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        return {};
    }

    const parsed = raw as Record<string, unknown>;
    const state: AnnouncementDismissState = {};

    if (typeof parsed.dismissedUntil === 'string' && parsed.dismissedUntil.trim()) {
        state.dismissedUntil = parsed.dismissedUntil;
    }
    if (typeof parsed.dismissedPermanentlyAt === 'string' && parsed.dismissedPermanentlyAt.trim()) {
        state.dismissedPermanentlyAt = parsed.dismissedPermanentlyAt;
    }
    if (typeof parsed.seenAt === 'string' && parsed.seenAt.trim()) {
        state.seenAt = parsed.seenAt;
    }

    return state;
}

export function shouldSuppressAnnouncement(
    state: AnnouncementDismissState | null | undefined,
    nowIso: string = new Date().toISOString(),
) {
    if (!state) return false;
    if (state.dismissedPermanentlyAt) return true;
    if (!state.dismissedUntil) return false;
    const dismissedUntil = Date.parse(state.dismissedUntil);
    const now = Date.parse(nowIso);
    if (Number.isNaN(dismissedUntil) || Number.isNaN(now)) {
        return false;
    }
    return dismissedUntil > now;
}
