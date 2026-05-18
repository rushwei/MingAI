import { NextResponse, type NextRequest } from 'next/server';
import { createAnonClient, createAuthedClient, getAuthContext, type AuthContextResult, type User, type LocalDbClient } from '@/lib/api-utils-local';

type RequestDbClient = ReturnType<typeof createAuthedClient>;

export { createAnonClient, createAuthedClient, getAuthContext };

export async function createRequestSupabaseClient(): Promise<LocalDbClient> {
    return createAnonClient();
}

export type AuthContextResult = {
    db: RequestDbClient;
    supabase: RequestDbClient;
    accessToken: string | null;
    user: User | null;
    authError: { message: string; status: number } | null;
};

export function resolveRequestDbClient(
    auth: Partial<Pick<AuthContextResult, 'db' | 'supabase'>> | null | undefined,
): RequestDbClient | null {
    if (auth?.db && typeof auth.db.from === 'function') {
        return auth.db;
    }
    if (auth?.supabase && typeof auth.supabase.from === 'function') {
        return auth.supabase;
    }
    return null;
}

export async function requireUserContext(
    request: NextRequest
): Promise<
    | { db: RequestDbClient; supabase: RequestDbClient; accessToken: string | null; user: User }
    | { error: { message: string; status: number } }
> {
    const { db, supabase, accessToken, user, authError } = await getAuthContext(request);
    if (authError) {
        return { error: { message: authError.message, status: authError.status } };
    }
    if (!user) {
        return { error: { message: '请先登录', status: 401 } };
    }
    return { db, supabase, accessToken, user };
}

async function checkIsAdmin(
    db: RequestDbClient,
    userId: string
): Promise<
    | { ok: true; isAdmin: boolean }
    | { ok: false; error: { message: string; status: number } }
> {
    try {
        const result = await db.query('SELECT is_admin FROM users WHERE id = $1', [userId]);
        const userData = result.rows[0];
        return {
            ok: true,
            isAdmin: userData?.is_admin ?? false,
        };
    } catch (error) {
        console.error('[api-utils] admin check failed:', error);
        return {
            ok: false,
            error: {
                message: '管理员权限校验失败，请稍后重试',
                status: 503,
            },
        };
    }
}

export async function requireAdminUser(
    request: NextRequest,
    dependencies: {
        userContext?: Awaited<ReturnType<typeof requireUserContext>>;
    } = {},
): Promise<{ user: User } | { error: { message: string; status: number } }> {
    const authResult = dependencies.userContext ?? await requireUserContext(request);
    const resolvedAuthResult = dependencies.userContext ?? authResult;
    if ('error' in resolvedAuthResult) return resolvedAuthResult;

    const adminCheck = await checkIsAdmin(resolvedAuthResult.db, resolvedAuthResult.user.id);
    if (!adminCheck.ok) {
        return { error: adminCheck.error };
    }
    if (!adminCheck.isAdmin) {
        return { error: { message: '无权限操作', status: 403 } };
    }

    return { user: resolvedAuthResult.user };
}

export async function requireAdminContext(
    request: NextRequest,
    dependencies: {
        userContext?: Awaited<ReturnType<typeof requireUserContext>>;
    } = {},
): Promise<
    | { db: RequestDbClient; supabase: RequestDbClient; accessToken: string | null; user: User }
    | { error: { message: string; status: number } }
> {
    const authResult = dependencies.userContext ?? await requireUserContext(request);
    const resolvedAuthResult = dependencies.userContext ?? authResult;
    if ('error' in resolvedAuthResult) return resolvedAuthResult;

    const adminCheck = await checkIsAdmin(resolvedAuthResult.db, resolvedAuthResult.user.id);
    if (!adminCheck.ok) {
        return { error: adminCheck.error };
    }
    if (!adminCheck.isAdmin) {
        return { error: { message: '无权限操作', status: 403 } };
    }

    return resolvedAuthResult;
}

export async function getAccessToken(request: NextRequest): Promise<string | null> {
    const { accessToken } = await getAuthContext(request);
    return accessToken;
}

export function jsonError<TExtra extends Record<string, unknown> = Record<string, never>>(
    message: string,
    status = 400,
    extra?: TExtra
) {
    const body = extra
        ? ({ success: false, error: message, ...extra } as { success: false; error: string } & TExtra)
        : ({ success: false, error: message } as { success: false; error: string } & TExtra);
    return NextResponse.json(body, { status });
}

export function jsonOk<TPayload>(payload: TPayload, status = 200, headers?: Record<string, string>) {
    return NextResponse.json(payload, { status, headers });
}

export const SSE_HEADERS = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
} as const;

export function getSystemAdminClient(): LocalDbClient {
    return createAnonClient();
}

export function getAuthAdminClient(): LocalDbClient {
    return createAnonClient();
}