import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { getAuthAdminClient as getPrivilegedAuthClient, getServiceClient } from '@/lib/supabase-server';
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/supabase-env';

export async function createRequestSupabaseClient() {
    let cookieValues: Array<{ name: string; value: string }> = [];
    let cookieStore: Awaited<ReturnType<typeof cookies>> | null = null;
    try {
        cookieStore = await cookies();
        cookieValues = cookieStore.getAll();
    } catch {
        // 在测试环境中可能没有 Next.js request scope，此时降级为无 cookie 客户端
        cookieValues = [];
        cookieStore = null;
    }
    return createServerClient(
        getSupabaseUrl(),
        getSupabaseAnonKey(),
        {
            cookies: {
                getAll() {
                    return cookieValues;
                },
                setAll(cookiesToSet) {
                    if (!cookieStore) return;
                    try {
                        for (const { name, value, options } of cookiesToSet) {
                            cookieStore.set(name, value, options);
                        }
                    } catch {
                        // 在只读 cookies 上下文（如部分 Server Component）中忽略写入
                    }
                },
            },
        }
    );
}

// 统一从请求中解析用户身份，支持 Bearer 与 Cookie 会话
export async function getAuthContext(request: NextRequest): Promise<{
    supabase: Awaited<ReturnType<typeof createRequestSupabaseClient>>;
    user: User | null;
}> {
    const bearer = request.headers.get('authorization');
    const bearerToken = bearer?.replace(/Bearer\s+/i, '');
    const cookieToken = request.cookies.get('sb-access-token')?.value;
    const token = bearerToken || cookieToken;
    const supabase = token ? createAuthedClient(token) : await createRequestSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    return { supabase, user: user ?? null };
}

// 仅用于必须使用 Bearer Token 的接口
export async function requireBearerUser(
    request: NextRequest
): Promise<{ user: User } | { error: { message: string; status: number } }> {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
        return { error: { message: '请先登录', status: 401 } };
    }

    const token = authHeader.replace(/Bearer\s+/i, '');
    const useMockClient = process.env.NODE_ENV === 'test' || !process.env.NODE_ENV;
    const authClient = useMockClient
        ? (await import('@/lib/supabase')).supabase
        : createAuthedClient(token);
    const { data: { user }, error } = useMockClient
        ? await authClient.auth.getUser(token)
        : await authClient.auth.getUser();
    if (error || !user) {
        return { error: { message: '认证失败', status: 401 } };
    }

    return { user };
}

export async function requireUserContext(
    request: NextRequest
): Promise<
    | { supabase: Awaited<ReturnType<typeof createRequestSupabaseClient>>; user: User }
    | { error: { message: string; status: number } }
> {
    const { supabase, user } = await getAuthContext(request);
    if (!user) {
        return { error: { message: '请先登录', status: 401 } };
    }
    return { supabase, user };
}

/**
 * 检查用户是否为管理员
 */
async function checkIsAdmin(
    supabase: Awaited<ReturnType<typeof createRequestSupabaseClient>>,
    userId: string
): Promise<boolean> {
    const { data: userData, error } = await supabase
        .from('users')
        .select('is_admin')
        .eq('id', userId)
        .maybeSingle();

    if (error) {
        console.error('[api-utils] admin check failed:', error);
    }

    return userData?.is_admin ?? false;
}

export async function requireAdminUser(
    request: NextRequest
): Promise<{ user: User } | { error: { message: string; status: number } }> {
    const authResult = await requireUserContext(request);
    if ('error' in authResult) return authResult;

    const isAdmin = await checkIsAdmin(authResult.supabase, authResult.user.id);
    if (!isAdmin) {
        return { error: { message: '无权限操作', status: 403 } };
    }

    return { user: authResult.user };
}

export async function requireAdminContext(
    request: NextRequest
): Promise<
    | { supabase: Awaited<ReturnType<typeof createRequestSupabaseClient>>; user: User }
    | { error: { message: string; status: number } }
> {
    const authResult = await requireUserContext(request);
    if ('error' in authResult) return authResult;

    const isAdmin = await checkIsAdmin(authResult.supabase, authResult.user.id);
    if (!isAdmin) {
        return { error: { message: '无权限操作', status: 403 } };
    }

    return authResult;
}

export function getServiceRoleClient() {
    return getServiceClient();
}

export function getAuthAdminClient() {
    return getPrivilegedAuthClient();
}

export function createAnonClient() {
    return createClient(
        getSupabaseUrl(),
        getSupabaseAnonKey(),
        {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false,
            },
        }
    );
}

/**
 * 创建带有用户 access token 的 Supabase 客户端
 * 用于需要 RLS 策略识别用户身份的场景
 */
export function createAuthedClient(accessToken: string) {
    return createClient(
        getSupabaseUrl(),
        getSupabaseAnonKey(),
        {
            global: { headers: { Authorization: `Bearer ${accessToken}` } },
            auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false,
            }
        }
    );
}

/**
 * 从请求中获取 access token（优先 Bearer，其次 session）
 */
export async function getAccessToken(request: NextRequest): Promise<string | null> {
    const bearer = request.headers.get('authorization');
    const token = bearer?.replace(/Bearer\s+/i, '');
    if (token) return token;

    const supabase = await createRequestSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
}

export function jsonError<TExtra extends Record<string, unknown> = Record<string, never>>(
    message: string,
    status = 400,
    extra?: TExtra
) {
    const body = extra
        ? ({ error: message, ...extra } as { error: string } & TExtra)
        : ({ error: message } as { error: string } & TExtra);
    return NextResponse.json(body, { status });
}

export function jsonOk<TPayload>(payload: TPayload, status = 200) {
    return NextResponse.json(payload, { status });
}
