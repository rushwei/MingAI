import { type NextRequest } from 'next/server';
import { jsonError, jsonOk, requireUserContext } from '@/lib/api-utils';
import { buildMembershipInfo, type MembershipType } from '@/lib/user/membership';
import { normalizeUserSettings, USER_SETTINGS_SELECT } from '@/lib/user/settings';

type UserProfilePatchBody = {
    profile?: {
        nickname?: unknown;
        avatar_url?: unknown;
    };
    nickname?: unknown;
    avatar_url?: unknown;
};

function buildEnsurePayload(user: { id: string; user_metadata?: Record<string, unknown> }) {
    return {
        id: user.id,
        nickname: typeof user.user_metadata?.nickname === 'string' && user.user_metadata.nickname.trim().length > 0
            ? user.user_metadata.nickname.trim()
            : '命理爱好者',
        avatar_url: typeof user.user_metadata?.avatar_url === 'string'
            ? user.user_metadata.avatar_url
            : null,
        membership: 'free',
        ai_chat_count: 1,
    };
}

async function loadProfile(auth: Exclude<Awaited<ReturnType<typeof requireUserContext>>, { error: unknown }>) {
    return auth.supabase
        .from('users')
        .select('id, nickname, avatar_url, is_admin, membership, membership_expires_at, ai_chat_count')
        .eq('id', auth.user.id)
        .maybeSingle();
}

function normalizeProfileRow(row: Record<string, unknown> | null) {
    if (!row) {
        return null;
    }

    const membershipType: MembershipType | null = row.membership === 'free'
        || row.membership === 'plus'
        || row.membership === 'pro'
        ? row.membership
        : null;

    const membership = buildMembershipInfo({
        membership: membershipType,
        membership_expires_at: typeof row.membership_expires_at === 'string' ? row.membership_expires_at : null,
        ai_chat_count: typeof row.ai_chat_count === 'number' ? row.ai_chat_count : null,
    });

    return {
        ...row,
        membership: membership.type,
        membership_expires_at: membership.expiresAt ? membership.expiresAt.toISOString() : null,
        ai_chat_count: membership.aiChatCount,
    };
}

async function loadSettings(auth: Exclude<Awaited<ReturnType<typeof requireUserContext>>, { error: unknown }>) {
    const { data, error } = await auth.supabase
        .from('user_settings')
        .select(USER_SETTINGS_SELECT)
        .eq('user_id', auth.user.id)
        .maybeSingle();

    return {
        settings: normalizeUserSettings((data ?? null) as Record<string, unknown> | null),
        error,
    };
}

export async function GET(request: NextRequest) {
    const auth = await requireUserContext(request);
    if ('error' in auth) return jsonError(auth.error.message, auth.error.status);
    const profileOnly = new URL(request.url).searchParams.get('scope') === 'profile';

    if (profileOnly) {
        const profileResult = await loadProfile(auth);
        if (profileResult.error) {
            return jsonError('获取用户资料失败', 500);
        }

        return jsonOk({
            profile: normalizeProfileRow((profileResult.data ?? null) as Record<string, unknown> | null),
            settings: null,
        });
    }

    const [profileResult, settingsResult] = await Promise.all([
        loadProfile(auth),
        loadSettings(auth),
    ]);
    if (profileResult.error || settingsResult.error) {
        return jsonError('获取用户资料失败', 500);
    }

    return jsonOk({
        profile: normalizeProfileRow((profileResult.data ?? null) as Record<string, unknown> | null),
        settings: settingsResult.settings,
    });
}

export async function POST(request: NextRequest) {
    const auth = await requireUserContext(request);
    if ('error' in auth) return jsonError(auth.error.message, auth.error.status);

    let action = 'ensure';
    try {
        const body = await request.json() as { action?: unknown };
        action = typeof body.action === 'string' ? body.action : 'ensure';
    } catch {
        action = 'ensure';
    }

    if (action !== 'ensure') {
        return jsonError(`Unsupported action: ${action}`, 400);
    }

    const { error } = await auth.supabase
        .from('users')
        .upsert(buildEnsurePayload(auth.user), {
            onConflict: 'id',
            ignoreDuplicates: true,
        });

    if (error) {
        return jsonError('创建用户资料失败', 500);
    }

    return jsonOk({ success: true }, 201);
}

export async function PATCH(request: NextRequest) {
    const auth = await requireUserContext(request);
    if ('error' in auth) return jsonError(auth.error.message, auth.error.status);

    let body: UserProfilePatchBody;
    try {
        body = await request.json() as UserProfilePatchBody;
    } catch {
        return jsonError('请求体不是合法 JSON', 400);
    }

    const profileInput = body.profile ?? {};
    const nicknameInput = profileInput.nickname ?? body.nickname;
    const avatarUrlInput = profileInput.avatar_url ?? body.avatar_url;

    const updatePayload: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
    };
    let shouldUpdateUser = false;

    if (typeof nicknameInput === 'string') {
        updatePayload.nickname = nicknameInput.trim();
        shouldUpdateUser = true;
    }
    if (typeof avatarUrlInput === 'string' || avatarUrlInput === null) {
        updatePayload.avatar_url = avatarUrlInput;
        shouldUpdateUser = true;
    }

    if (!shouldUpdateUser) {
        return jsonError('没有可更新的资料字段', 400);
    }

    const [updateResult, settingsResult] = await Promise.all([
        auth.supabase
        .from('users')
        .update(updatePayload)
        .eq('id', auth.user.id)
        .select('id, nickname, avatar_url, is_admin, membership, membership_expires_at, ai_chat_count')
        .maybeSingle(),
        loadSettings(auth),
    ]);

    if (updateResult.error || settingsResult.error) {
        return jsonError('更新用户资料失败', 500);
    }

    return jsonOk({
        profile: normalizeProfileRow((updateResult.data ?? null) as Record<string, unknown> | null),
        settings: settingsResult.settings,
    });
}
