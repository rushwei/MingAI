/**
 * 浏览器侧统一认证入口
 *
 * - 对外只暴露一个模块，避免 auth/auth-client 双入口
 * - 仅保留 auth/storage 能力，不再暴露通用表查询与 RPC
 * - 业务语义（资料、登录保护、错误文案）也统一放在这里
 */

import type { AuthChangeEvent, Session, User as SupabaseUser } from '@supabase/supabase-js';

export type { AuthChangeEvent, Session, User as SupabaseUser } from '@supabase/supabase-js';
export type User = SupabaseUser;

export type AuthError = {
    message: string;
    code?: string;
};

type AuthPayload<T = unknown> = {
    data: T | null;
    error: AuthError | null;
    count?: number | null;
    status?: number;
    statusText?: string;
};

export type AuthResult = {
    success: boolean;
    error?: AuthError;
};

type AuthListener = (event: AuthChangeEvent, session: Session | null) => void;

type UserProfile = {
    id: string;
    nickname: string | null;
    avatar_url: string | null;
    is_admin: boolean;
    membership: string | null;
    membership_expires_at: string | null;
    ai_chat_count: number | null;
    last_credit_restore_at: string | null;
};

type UserSettings = {
    community_anonymous_name?: string | null;
};

type UserProfileBundle = {
    profile: UserProfile | null;
    settings: UserSettings | null;
};

type OtpType = 'signup' | 'magiclink' | 'recovery' | 'email_change' | 'email';

const authListeners = new Set<AuthListener>();
let cachedSession: Session | null = null;

function normalizeError(raw: unknown): AuthError | null {
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
            console.error('[auth] auth listener error:', error);
        }
    }
}

function applySession(session: Session | null, event?: AuthChangeEvent) {
    cachedSession = session;
    if (event) {
        emitAuthEvent(event, session);
    }
}

async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<{
    ok: boolean;
    status: number;
    result: AuthPayload<T>;
}> {
    try {
        const response = await fetch(input, {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
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

async function requestJson<T>(url: string, init?: RequestInit): Promise<AuthPayload<T>> {
    const { result } = await fetchJson<T>(url, init);
    return result;
}

async function postAuthAction<T>(action: string, payload: Record<string, unknown> = {}): Promise<AuthPayload<T>> {
    return requestJson<T>('/api/auth', {
        method: 'POST',
        body: JSON.stringify({
            action,
            ...payload,
        }),
    });
}

async function loadSessionFromServer(): Promise<AuthPayload<{ session: Session | null; user: SupabaseUser | null }>> {
    const result = await requestJson<{ session: Session | null; user: SupabaseUser | null }>('/api/auth', {
        method: 'GET',
    });
    if (!result.error) {
        applySession(result.data?.session ?? null);
    }
    return result;
}

async function loadCurrentUserProfile(): Promise<UserProfileBundle | null> {
    const result = await requestJson<UserProfileBundle>('/api/user/profile', {
        method: 'GET',
    });

    if (result.error) {
        console.error('[auth] failed to load user profile:', result.error.message);
        return null;
    }

    return result.data ?? null;
}

export const supabase = {
    auth: {
        async signInWithPassword(credentials: { email: string; password: string }) {
            const result = await postAuthAction<{ session: Session | null; user: SupabaseUser | null }>('signInWithPassword', credentials);
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
            const result = await postAuthAction<{ session: Session | null; user: SupabaseUser | null }>('signUp', params);
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

        async getSession(): Promise<{ data: { session: Session | null }; error: AuthError | null }> {
            const result = await loadSessionFromServer();
            return {
                data: { session: result.data?.session ?? null },
                error: result.error,
            };
        },

        async getUser(token?: string): Promise<{ data: { user: SupabaseUser | null }; error: AuthError | null }> {
            if (token) {
                const result = await postAuthAction<{ user: SupabaseUser | null }>('getUser', { token });
                return { data: { user: result.data?.user ?? null }, error: result.error };
            }
            const sessionResult = await loadSessionFromServer();
            return { data: { user: sessionResult.data?.user ?? null }, error: sessionResult.error };
        },

        async updateUser(attributes: Record<string, unknown>) {
            const result = await postAuthAction<{ user: SupabaseUser | null }>('updateUser', { attributes });
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

        async verifyOtp(params: { email: string; token: string; type: OtpType }) {
            const result = await postAuthAction<{ session: Session | null; user: SupabaseUser | null }>('verifyOtp', { params });
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

    // Realtime channel 桩（auth-only 模式下不支持，保留接口兼容）
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    channel(name: string): any {
        console.warn(`[auth] channel("${name}") is not supported in auth-only mode`);
        const noop = () => channelObj;
        const channelObj = { on: noop, subscribe: noop, unsubscribe: noop };
        return channelObj;
    },

    removeChannel(channel?: unknown) {
        void channel;
    },

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

export const authClient = supabase;

export async function signInWithEmail(email: string, password: string): Promise<AuthResult> {
    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        return {
            success: false,
            error: {
                message: getErrorMessage(error.message),
                code: error.code || error.message,
            },
        };
    }

    return { success: true };
}

export async function signUpWithEmail(
    email: string,
    password: string,
    nickname?: string
): Promise<AuthResult> {
    const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                nickname: nickname || '命理爱好者',
            },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
    });

    if (error) {
        return {
            success: false,
            error: {
                message: getErrorMessage(error.message),
                code: error.code || error.message,
            },
        };
    }

    return { success: true };
}

export async function signOut(): Promise<AuthResult> {
    const { error } = await supabase.auth.signOut();

    if (error) {
        return {
            success: false,
            error: {
                message: '登出失败，请重试',
                code: error.code || error.message,
            },
        };
    }

    return { success: true };
}

export async function getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}

export async function getSession() {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
}

export async function getUserProfile(userId?: string) {
    const bundle = await loadCurrentUserProfile();
    const profile = bundle?.profile ?? null;

    if (!profile) {
        return null;
    }
    if (userId && profile.id !== userId) {
        return null;
    }

    return profile;
}

export async function getCurrentUserProfileBundle() {
    return loadCurrentUserProfile();
}

export async function ensureUserRecord(user: SupabaseUser) {
    void user;
    const result = await requestJson<{ success: boolean }>('/api/user/profile', {
        method: 'POST',
        body: JSON.stringify({ action: 'ensure' }),
    });

    if (result.error) {
        console.error('[auth] failed to ensure user profile:', result.error.message);
    }
}

export async function updateNickname(userId: string, nickname: string): Promise<AuthResult> {
    void userId;

    const result = await requestJson<UserProfileBundle>('/api/user/profile', {
        method: 'PATCH',
        body: JSON.stringify({ nickname }),
    });

    if (result.error) {
        return {
            success: false,
            error: {
                message: '更新失败，请重试',
                code: result.error.code || result.error.message,
            },
        };
    }

    const { error: authError } = await supabase.auth.updateUser({
        data: { nickname },
    });

    if (authError) {
        console.warn('[auth] failed to sync auth nickname:', authError.message);
    }

    return { success: true };
}

export async function resetPassword(email: string): Promise<AuthResult> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error) {
        return {
            success: false,
            error: {
                message: getErrorMessage(error.message),
                code: error.code || error.message,
            },
        };
    }

    return { success: true };
}

export async function sendOTP(
    email: string,
    type: 'signup' | 'magiclink' | 'recovery' | 'email_change' = 'signup',
    newEmail?: string
): Promise<AuthResult> {
    try {
        if (type === 'signup') {
            const { error } = await supabase.auth.signInWithOtp({
                email,
                options: {
                    shouldCreateUser: true,
                    emailRedirectTo: `${window.location.origin}/auth/callback`,
                },
            });

            if (error) {
                return {
                    success: false,
                    error: {
                        message: getErrorMessage(error.message),
                        code: error.code || error.message,
                    },
                };
            }
        } else if (type === 'magiclink') {
            const { error } = await supabase.auth.signInWithOtp({
                email,
                options: {
                    shouldCreateUser: false,
                },
            });

            if (error) {
                return {
                    success: false,
                    error: {
                        message: getErrorMessage(error.message),
                        code: error.code || error.message,
                    },
                };
            }
        } else if (type === 'recovery') {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/auth/reset-password`,
            });

            if (error) {
                return {
                    success: false,
                    error: {
                        message: getErrorMessage(error.message),
                        code: error.code || error.message,
                    },
                };
            }
        } else if (type === 'email_change') {
            if (!newEmail) {
                return {
                    success: false,
                    error: {
                        message: '请提供新邮箱地址',
                        code: 'MISSING_NEW_EMAIL',
                    },
                };
            }

            const { error } = await supabase.auth.updateUser({
                email: newEmail,
            });

            if (error) {
                return {
                    success: false,
                    error: {
                        message: getErrorMessage(error.message),
                        code: error.code || error.message,
                    },
                };
            }
        }

        return { success: true };
    } catch (err) {
        console.error('[auth] sendOTP failed:', err);
        return {
            success: false,
            error: {
                message: '发送失败，请重试',
                code: 'SEND_FAILED',
            },
        };
    }
}

export async function verifyOTP(
    email: string,
    token: string,
    type: OtpType = 'email'
): Promise<AuthResult> {
    const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type,
    });

    if (error) {
        return {
            success: false,
            error: {
                message: getErrorMessage(error.message),
                code: error.code || error.message,
            },
        };
    }

    return { success: true };
}

export async function resetPasswordWithOTP(
    email: string,
    token: string,
    newPassword: string
): Promise<AuthResult> {
    const result = await postAuthAction<{ success: boolean }>('resetPasswordWithOtp', {
        email,
        token,
        newPassword,
    });

    if (result.error) {
        return {
            success: false,
            error: {
                message: getErrorMessage(result.error.message),
                code: result.error.code || result.error.message,
            },
        };
    }

    return { success: true };
}

export async function checkLoginAttempts(email: string): Promise<{ blocked: boolean; remainingAttempts: number }> {
    const maxAttempts = 5;
    const result = await postAuthAction<{ blocked: boolean; remainingAttempts: number }>('checkLoginAttempts', { email });

    if (result.error || !result.data) {
        console.error('[auth] failed to check login attempts:', result.error?.message);
        return { blocked: false, remainingAttempts: maxAttempts };
    }

    return result.data;
}

export async function recordLoginAttempt(email: string, success: boolean): Promise<void> {
    const result = await postAuthAction<{ success: boolean }>('recordLoginAttempt', { email, success });

    if (result.error) {
        console.error('[auth] failed to record login attempt:', result.error.message);
    }
}

export async function signInWithEmailProtected(email: string, password: string): Promise<AuthResult> {
    const { blocked, remainingAttempts } = await checkLoginAttempts(email);

    if (blocked) {
        return {
            success: false,
            error: {
                message: '登录失败次数过多，请15分钟后再试',
                code: 'too_many_attempts',
            },
        };
    }

    const result = await signInWithEmail(email, password);
    await recordLoginAttempt(email, result.success);

    if (!result.success && remainingAttempts <= 1) {
        return {
            success: false,
            error: {
                message: `邮箱或密码错误，剩余尝试次数：${remainingAttempts - 1}`,
                code: result.error?.code,
            },
        };
    }

    return result;
}

function getErrorMessage(code: string): string {
    const errorMessages: Record<string, string> = {
        'Invalid login credentials': '邮箱或密码错误',
        'Email not confirmed': '请先验证邮箱',
        'User already registered': '该邮箱已注册',
        'Password should be at least 6 characters': '密码至少6个字符',
        'Unable to validate email address: invalid format': '邮箱格式不正确',
        'Email rate limit exceeded': '请求过于频繁，请稍后再试',
        'Token has expired or is invalid': '验证码已过期或无效',
        'Signups not allowed for otp': '该邮箱尚未注册，请先注册',
    };

    return errorMessages[code] || code;
}
