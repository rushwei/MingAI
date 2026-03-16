import { type NextRequest } from 'next/server';
import { jsonError, jsonOk, requireUserContext } from '@/lib/api-utils';

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
        ai_chat_count: 3,
    };
}

export async function GET(request: NextRequest) {
    const auth = await requireUserContext(request);
    if ('error' in auth) return jsonError(auth.error.message, auth.error.status);

    const [profileResult, settingsResult] = await Promise.all([
        auth.supabase
            .from('users')
            .select('id, nickname, avatar_url, is_admin, membership, membership_expires_at, ai_chat_count, last_credit_restore_at')
            .eq('id', auth.user.id)
            .maybeSingle(),
        auth.supabase
            .from('user_settings')
            .select('community_anonymous_name')
            .eq('user_id', auth.user.id)
            .maybeSingle(),
    ]);

    if (profileResult.error) {
        return jsonError('获取用户资料失败', 500);
    }

    return jsonOk({
        profile: profileResult.data ?? null,
        settings: settingsResult.data ?? null,
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

    let body: { nickname?: unknown; avatar_url?: unknown };
    try {
        body = await request.json() as { nickname?: unknown; avatar_url?: unknown };
    } catch {
        return jsonError('请求体不是合法 JSON', 400);
    }

    const updatePayload: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
    };

    if (typeof body.nickname === 'string') {
        updatePayload.nickname = body.nickname.trim();
    }
    if (typeof body.avatar_url === 'string' || body.avatar_url === null) {
        updatePayload.avatar_url = body.avatar_url;
    }

    const { data, error } = await auth.supabase
        .from('users')
        .update(updatePayload)
        .eq('id', auth.user.id)
        .select('id, nickname, avatar_url, is_admin, membership, membership_expires_at, ai_chat_count, last_credit_restore_at')
        .maybeSingle();

    if (error) {
        return jsonError('更新用户资料失败', 500);
    }

    return jsonOk({ profile: data ?? null });
}
