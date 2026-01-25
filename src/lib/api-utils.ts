import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { getServiceClient } from '@/lib/supabase-server';

export async function createRequestSupabaseClient() {
    const cookieStore = await cookies();
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
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
    const supabase = await createRequestSupabaseClient();
    const bearer = request.headers.get('authorization');
    const token = bearer?.replace(/Bearer\s+/i, '');
    const { data: { user } } = token
        ? await supabase.auth.getUser(token)
        : await supabase.auth.getUser();
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
    const authClient = process.env.NODE_ENV === 'test' || !process.env.NODE_ENV
        ? (await import('@/lib/supabase')).supabase
        : createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { auth: { persistSession: false } }
        );
    const { data: { user }, error } = await authClient.auth.getUser(token);
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

export async function requireAdminUser(
    request: NextRequest
): Promise<{ user: User } | { error: { message: string; status: number } }> {
    const authResult = await requireBearerUser(request);
    if ('error' in authResult) return authResult;

    const serviceClient = getServiceClient();
    const { data: userData, error } = await serviceClient
        .from('users')
        .select('is_admin')
        .eq('id', authResult.user.id)
        .maybeSingle();

    if (error) {
        console.error('[api-utils] admin check failed:', error);
    }

    if (!userData?.is_admin) {
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

    const serviceClient = getServiceClient();
    const { data: userData, error } = await serviceClient
        .from('users')
        .select('is_admin')
        .eq('id', authResult.user.id)
        .maybeSingle();

    if (error) {
        console.error('[api-utils] admin check failed:', error);
    }

    if (!userData?.is_admin) {
        return { error: { message: '无权限操作', status: 403 } };
    }

    return authResult;
}

export function getServiceRoleClient() {
    return getServiceClient();
}

export function jsonError(message: string, status = 400) {
    return NextResponse.json({ error: message }, { status });
}

export function jsonOk(payload: Record<string, unknown>, status = 200) {
    return NextResponse.json(payload, { status });
}
