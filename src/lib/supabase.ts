/**
 * Supabase 客户端配置
 *
 * 前端不再直连 Supabase，统一通过后端 API 代理。
 */

import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { invalidateLocalCaches, type LocalCacheScope } from '@/lib/cache';

type SupabaseProxyError = {
    message: string;
    code?: string;
};

type SupabaseProxyResult<T = unknown> = {
    data: T | null;
    error: SupabaseProxyError | null;
    count?: number | null;
    status?: number;
    statusText?: string;
};

type AuthListener = (event: AuthChangeEvent, session: Session | null) => void;

type QueryChainStep = {
    method: string;
    args: unknown[];
};

const WRITE_QUERY_METHODS = new Set(['insert', 'upsert', 'update', 'delete']);

const authListeners = new Set<AuthListener>();
let cachedSession: Session | null = null;

function normalizeError(raw: unknown): SupabaseProxyError | null {
    if (!raw) return null;
    if (typeof raw === 'object' && raw && 'message' in raw) {
        const message = String((raw as { message?: unknown }).message ?? 'Unknown error');
        const code = 'code' in raw ? String((raw as { code?: unknown }).code ?? '') : undefined;
        return code ? { message, code } : { message };
    }
    return { message: String(raw) };
}

function emitAuthEvent(event: AuthChangeEvent, session: Session | null) {
    for (const listener of authListeners) {
        try {
            listener(event, session);
        } catch (error) {
            console.error('[supabase-proxy] auth listener error:', error);
        }
    }
}

function applySession(session: Session | null, event?: AuthChangeEvent) {
    cachedSession = session;
    if (event) {
        emitAuthEvent(event, session);
    }
}

function getCacheScopesForTable(table: string): LocalCacheScope[] {
    switch (table) {
        case 'users':
            return ['profile', 'membership'];
        case 'user_settings':
            return ['sidebar_config', 'default_bazi_chart'];
        case 'orders':
        case 'credit_transactions':
        case 'rate_limits':
            return ['membership', 'level'];
        case 'ai_models':
        case 'ai_model_sources':
        case 'ai_model_stats':
            return ['models'];
        case 'knowledge_bases':
        case 'knowledge_entries':
            return ['knowledge_bases', 'data_sources'];
        case 'bazi_charts':
            return ['data_sources', 'default_bazi_chart'];
        case 'ziwei_charts':
        case 'tarot_readings':
        case 'liuyao_divinations':
        case 'hepan_charts':
        case 'mbti_readings':
        case 'face_readings':
        case 'palm_readings':
        case 'conversations':
            return ['data_sources'];
        default:
            return [];
    }
}

function emitWriteEvent(table: string, chain: QueryChainStep[], error: SupabaseProxyError | null) {
    if (typeof window === 'undefined') return;
    if (error) return;

    const methods = chain
        .map(step => step.method)
        .filter(method => WRITE_QUERY_METHODS.has(method));

    if (methods.length === 0) return;

    const cacheScopes = getCacheScopesForTable(table);
    if (cacheScopes.length > 0) {
        invalidateLocalCaches(cacheScopes);
    }

    if (table === 'knowledge_bases'
        || table === 'knowledge_entries'
        || table === 'bazi_charts'
        || table === 'ziwei_charts'
        || table === 'tarot_readings'
        || table === 'liuyao_divinations'
        || table === 'hepan_charts'
        || table === 'mbti_readings'
        || table === 'face_readings'
        || table === 'palm_readings'
        || table === 'conversations'
        || table === 'user_settings') {
        window.dispatchEvent(new CustomEvent('mingai:data-index:invalidate'));
    }

    if (table === 'users'
        || table === 'user_settings'
        || table === 'rate_limits'
        || table === 'credit_transactions'
        || table === 'orders') {
        window.dispatchEvent(new CustomEvent('mingai:user-data:invalidate', { detail: { table } }));
    }

    if (table === 'ai_models'
        || table === 'ai_model_sources'
        || table === 'ai_model_stats') {
        window.dispatchEvent(new CustomEvent('mingai:models:invalidate', { detail: { table } }));
    }

    window.dispatchEvent(
        new CustomEvent('mingai:supabase-write', {
            detail: {
                table,
                methods,
                at: Date.now(),
            },
        })
    );
}

async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<{
    ok: boolean;
    status: number;
    result: SupabaseProxyResult<T>;
}> {
    try {
        const response = await fetch(input, {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'x-mingai-proxy-client': 'web',
                ...(init?.headers || {}),
            },
            ...init,
        });

        const payload = await response.json().catch(() => null) as
            | { data?: T | null; error?: unknown; count?: number | null; status?: number; statusText?: string }
            | null;

        return {
            ok: response.ok,
            status: response.status,
            result: {
                data: (payload?.data ?? null) as T | null,
                error: normalizeError(payload?.error ?? null),
                count: payload?.count ?? null,
                status: payload?.status,
                statusText: payload?.statusText,
            },
        };
    } catch (error) {
        return {
            ok: false,
            status: 500,
            result: {
                data: null,
                error: normalizeError(error) || { message: 'Request failed' },
            },
        };
    }
}

async function postAuthAction<T>(action: string, payload: Record<string, unknown> = {}): Promise<SupabaseProxyResult<T>> {
    const { result } = await fetchJson<T>('/api/auth', {
        method: 'POST',
        body: JSON.stringify({
            action,
            ...payload,
        }),
    });
    return result;
}

async function loadSessionFromServer(): Promise<SupabaseProxyResult<{ session: Session | null; user: User | null }>> {
    const { result } = await fetchJson<{ session: Session | null; user: User | null }>('/api/auth', {
        method: 'GET',
    });
    if (!result.error) {
        applySession(result.data?.session ?? null);
    }
    return result;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Proxy 动态分发无法静态类型化
function createQueryProxy(table: string, chain: QueryChainStep[] = []): any {
    const run = async () => {
        const res = await fetchJson('/api/supabase/proxy', {
            method: 'POST',
            body: JSON.stringify({
                kind: 'query',
                table,
                chain,
            }),
        });
        emitWriteEvent(table, chain, res.result.error);
        return res.result;
    };

    const target = () => undefined;
    return new Proxy(target, {
        get(_obj, prop) {
            if (prop === 'then') {
                return (onFulfilled: (value: unknown) => unknown, onRejected?: (reason: unknown) => unknown) =>
                    run().then(onFulfilled, onRejected);
            }
            if (prop === 'catch') {
                return (onRejected: (reason: unknown) => unknown) => run().catch(onRejected);
            }
            if (prop === 'finally') {
                return (onFinally: () => void) => run().finally(onFinally);
            }
            if (typeof prop === 'symbol') {
                if (prop === Symbol.toStringTag) return 'SupabaseQueryProxy';
                return undefined;
            }
            return (...args: unknown[]) =>
                createQueryProxy(table, [...chain, { method: String(prop), args }]);
        },
    });
}

export const supabase = {
    auth: {
        async signInWithPassword(credentials: { email: string; password: string }) {
            const result = await postAuthAction<{ session: Session | null; user: User | null }>('signInWithPassword', credentials);
            if (!result.error) {
                applySession(result.data?.session ?? null, 'SIGNED_IN');
            }
            return result;
        },

        async signUp(params: {
            email: string;
            password: string;
            options?: Record<string, unknown>;
        }) {
            const result = await postAuthAction<{ session: Session | null; user: User | null }>('signUp', params);
            if (!result.error && result.data?.session) {
                applySession(result.data.session, 'SIGNED_IN');
            }
            return result;
        },

        async signOut() {
            const result = await postAuthAction<{ signedOut: boolean }>('signOut');
            if (!result.error) {
                applySession(null, 'SIGNED_OUT');
            }
            return result;
        },

        async getSession(): Promise<{ data: { session: Session | null }; error: SupabaseProxyError | null }> {
            const result = await loadSessionFromServer();
            return {
                data: { session: result.data?.session ?? null },
                error: result.error,
            };
        },

        async getUser(token?: string): Promise<{ data: { user: User | null }; error: SupabaseProxyError | null }> {
            if (token) {
                const result = await postAuthAction<{ user: User | null }>('getUser', { token });
                return { data: { user: result.data?.user ?? null }, error: result.error };
            }
            const sessionResult = await loadSessionFromServer();
            return { data: { user: sessionResult.data?.user ?? null }, error: sessionResult.error };
        },

        async updateUser(attributes: Record<string, unknown>) {
            const result = await postAuthAction<{ user: User | null }>('updateUser', { attributes });
            if (!result.error && cachedSession?.user) {
                applySession(
                    {
                        ...cachedSession,
                        user: result.data?.user || cachedSession.user,
                    },
                    'USER_UPDATED'
                );
            }
            return result;
        },

        async resetPasswordForEmail(email: string, options?: Record<string, unknown>) {
            return postAuthAction('resetPasswordForEmail', { email, options });
        },

        async signInWithOtp(params: Record<string, unknown>) {
            return postAuthAction('signInWithOtp', { params });
        },

        async verifyOtp(params: { email: string; token: string; type: 'signup' | 'magiclink' | 'recovery' | 'email_change' | 'email' }) {
            const result = await postAuthAction<{ session: Session | null; user: User | null }>('verifyOtp', { params });
            if (!result.error && result.data?.session) {
                applySession(result.data.session, 'SIGNED_IN');
            }
            return result;
        },

        onAuthStateChange(callback: AuthListener) {
            authListeners.add(callback);
            void this.getSession().then((res) => {
                callback('INITIAL_SESSION', res.data?.session ?? null);
            });
            return {
                data: {
                    subscription: {
                        unsubscribe() {
                            authListeners.delete(callback);
                        },
                    },
                },
            };
        },
    },

    from(table: string) {
        return createQueryProxy(table);
    },

    rpc(fn: string, args?: Record<string, unknown>) {
        return fetchJson('/api/supabase/proxy', {
            method: 'POST',
            body: JSON.stringify({
                kind: 'rpc',
                fn,
                args: args || {},
            }),
        }).then((res) => res.result);
    },

    // Realtime channel 桩（proxy 模式下不支持，保留接口兼容）
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    channel(name: string): any {
        console.warn(`[supabase-proxy] channel("${name}") is not supported in proxy mode`);
        const noop = () => channelObj;
        const channelObj = { on: noop, subscribe: noop, unsubscribe: noop };
        return channelObj;
    },

    removeChannel(channel?: unknown) {
        void channel;
        // no-op in proxy mode
    },

    // Storage 桩（proxy 模式下通过后端 API 代理）
    storage: {
        from(bucket: string) {
            return {
                async upload(path: string, file: File | Blob, options?: { upsert?: boolean }) {
                    const formData = new FormData();
                    formData.append('file', file);
                    formData.append('bucket', bucket);
                    formData.append('path', path);
                    if (options?.upsert) formData.append('upsert', 'true');
                    try {
                        const res = await fetch('/api/supabase/storage', {
                            method: 'POST',
                            credentials: 'include',
                            body: formData,
                        });
                        const json = await res.json();
                        return { data: json.data ?? null, error: normalizeError(json.error) };
                    } catch (err) {
                        return { data: null, error: normalizeError(err) || { message: 'Upload failed' } };
                    }
                },
                getPublicUrl(path: string) {
                    const qs = new URLSearchParams({ bucket, path });
                    return {
                        data: { publicUrl: `/api/supabase/storage?${qs.toString()}` },
                    };
                },
            };
        },
    },
};

// 类型定义
export type Database = {
    public: {
        Tables: {
            users: {
                Row: {
                    id: string;
                    nickname: string | null;
                    avatar_url: string | null;
                    membership: 'free' | 'plus' | 'pro';
                    membership_expires_at: string | null;
                    ai_chat_count: number;
                    is_admin: boolean;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id: string;
                    nickname?: string | null;
                    avatar_url?: string | null;
                    membership?: 'free' | 'plus' | 'pro';
                    membership_expires_at?: string | null;
                    ai_chat_count?: number;
                    is_admin?: boolean;
                };
                Update: {
                    nickname?: string | null;
                    avatar_url?: string | null;
                    membership?: 'free' | 'plus' | 'pro';
                    membership_expires_at?: string | null;
                    ai_chat_count?: number;
                    is_admin?: boolean;
                };
            };
            bazi_charts: {
                Row: {
                    id: string;
                    user_id: string | null;
                    name: string;
                    gender: 'male' | 'female' | null;
                    birth_date: string;
                    birth_time: string | null;
                    birth_place: string | null;
                    calendar_type: string | null;
                    is_leap_month: boolean | null;
                    chart_data: Record<string, unknown> | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    user_id?: string | null;
                    name: string;
                    gender?: 'male' | 'female' | null;
                    birth_date: string;
                    birth_time?: string | null;
                    birth_place?: string | null;
                    calendar_type?: string | null;
                    is_leap_month?: boolean | null;
                    chart_data?: Record<string, unknown> | null;
                };
                Update: {
                    name?: string;
                    gender?: 'male' | 'female' | null;
                    birth_date?: string;
                    birth_time?: string | null;
                    birth_place?: string | null;
                    calendar_type?: string | null;
                    is_leap_month?: boolean | null;
                    chart_data?: Record<string, unknown> | null;
                };
            };
            ziwei_charts: {
                Row: {
                    id: string;
                    user_id: string | null;
                    name: string;
                    gender: 'male' | 'female' | null;
                    birth_date: string;
                    birth_time: string | null;
                    birth_place: string | null;
                    calendar_type: string | null;
                    is_leap_month: boolean | null;
                    chart_data: Record<string, unknown> | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    user_id?: string | null;
                    name: string;
                    gender?: 'male' | 'female' | null;
                    birth_date: string;
                    birth_time?: string | null;
                    birth_place?: string | null;
                    calendar_type?: string | null;
                    is_leap_month?: boolean | null;
                    chart_data?: Record<string, unknown> | null;
                };
                Update: {
                    name?: string;
                    gender?: 'male' | 'female' | null;
                    birth_date?: string;
                    birth_time?: string | null;
                    birth_place?: string | null;
                    calendar_type?: string | null;
                    is_leap_month?: boolean | null;
                    chart_data?: Record<string, unknown> | null;
                };
            };
            conversations: {
                Row: {
                    id: string;
                    user_id: string | null;
                    bazi_chart_id: string | null;
                    ziwei_chart_id: string | null;
                    personality: string | null;
                    title: string | null;
                    messages: Record<string, unknown>[] | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    user_id?: string | null;
                    bazi_chart_id?: string | null;
                    ziwei_chart_id?: string | null;
                    personality?: string | null;
                    title?: string | null;
                    messages?: Record<string, unknown>[] | null;
                };
                Update: {
                    bazi_chart_id?: string | null;
                    ziwei_chart_id?: string | null;
                    personality?: string | null;
                    title?: string | null;
                    messages?: Record<string, unknown>[] | null;
                    updated_at?: string;
                };
            };
            orders: {
                Row: {
                    id: string;
                    user_id: string | null;
                    product_type: 'plus' | 'pro' | 'pay_per_use';
                    amount: number;
                    status: 'pending' | 'paid' | 'cancelled' | 'refunded';
                    payment_method: string | null;
                    created_at: string;
                    paid_at: string | null;
                };
                Insert: {
                    id?: string;
                    user_id?: string | null;
                    product_type: 'plus' | 'pro' | 'pay_per_use';
                    amount: number;
                    status?: 'pending' | 'paid' | 'cancelled' | 'refunded';
                    payment_method?: string | null;
                };
                Update: {
                    status?: 'pending' | 'paid' | 'cancelled' | 'refunded';
                    payment_method?: string | null;
                    paid_at?: string | null;
                };
            };
        };
    };
};

// 导出 User 类型供组件使用
export type { User } from '@supabase/supabase-js';
