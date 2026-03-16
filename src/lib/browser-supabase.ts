/**
 * 浏览器侧 Supabase 查询兼容客户端
 *
 * 仅用于过渡期浏览器查询与 RPC 访问：
 * - 认证仍统一通过 `@/lib/auth`
 * - 查询通过 accessToken 回调读取 `/api/auth` 当前会话
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/supabase-env';

type SessionEnvelope = {
    data?: {
        session?: {
            access_token?: string | null;
        } | null;
    } | null;
    session?: {
        access_token?: string | null;
    } | null;
};

let browserQueryClient: SupabaseClient | null = null;

async function loadAccessToken(): Promise<string | null> {
    try {
        const response = await fetch('/api/auth', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            return null;
        }

        const payload = await response.json().catch(() => null) as SessionEnvelope | null;
        return payload?.data?.session?.access_token ?? payload?.session?.access_token ?? null;
    } catch {
        return null;
    }
}

export function getBrowserSupabase(): SupabaseClient {
    if (browserQueryClient) return browserQueryClient;

    browserQueryClient = createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
        },
        accessToken: loadAccessToken,
    });

    return browserQueryClient;
}

export const browserSupabase = {
    from(table: string) {
        return getBrowserSupabase().from(table);
    },

    rpc(fn: string, args?: Record<string, unknown>) {
        return getBrowserSupabase().rpc(fn, args);
    },

    storage: {
        from(bucket: string) {
            return getBrowserSupabase().storage.from(bucket);
        },
    },
};
