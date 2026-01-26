/**
 * 认证逻辑封装
 * 
 * 提供邮箱登录、注册、登出等功能
 */

import { createClient } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';

export type AuthError = {
    message: string;
    code?: string;
};

export type AuthResult = {
    success: boolean;
    error?: AuthError;
};

// 使用非持久化客户端处理重置密码，避免 recovery 验证触发全局登录状态变化。
const resetPasswordClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false,
        },
    }
);

/**
 * 邮箱登录
 */
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
                code: error.message,
            },
        };
    }

    return { success: true };
}

/**
 * 邮箱注册
 */
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
                code: error.message,
            },
        };
    }

    return { success: true };
}

/**
 * 登出
 */
export async function signOut(): Promise<AuthResult> {
    const { error } = await supabase.auth.signOut();

    if (error) {
        return {
            success: false,
            error: {
                message: '登出失败，请重试',
                code: error.message,
            },
        };
    }

    return { success: true };
}

/**
 * 获取当前用户
 */
export async function getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}

/**
 * 获取当前会话
 */
export async function getSession() {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
}

/**
 * 获取用户扩展信息
 */
export async function getUserProfile(userId: string) {
    const { data, error } = await supabase
        .from('users')
        .select('id, nickname, avatar_url, is_admin, membership, membership_expires_at, ai_chat_count, last_credit_restore_at')
        .eq('id', userId)
        .maybeSingle();

    if (error) {
        console.error('Error fetching user profile:', error);
        return null;
    }

    return data;
}

/**
 * 确保用户扩展信息存在
 */
export async function ensureUserRecord(user: SupabaseUser) {
    const payload = {
        id: user.id,
        nickname: (user.user_metadata?.nickname as string | undefined) || '命理爱好者',
        avatar_url: (user.user_metadata?.avatar_url as string | undefined) || null,
        membership: 'free',
        ai_chat_count: 3,
    };

    const { error } = await supabase
        .from('users')
        .upsert(payload, {
            onConflict: 'id',
            ignoreDuplicates: true,
        });

    if (error) {
        console.error('Error ensuring user profile:', error);
    }
}

/**
 * 更新用户昵称
 */
export async function updateNickname(userId: string, nickname: string): Promise<AuthResult> {
    const { error } = await supabase
        .from('users')
        .update({ nickname, updated_at: new Date().toISOString() })
        .eq('id', userId);

    if (error) {
        return {
            success: false,
            error: {
                message: '更新失败，请重试',
                code: error.message,
            },
        };
    }

    const { error: authError } = await supabase.auth.updateUser({
        data: { nickname },
    });

    if (authError) {
        console.warn('Failed to sync auth nickname:', authError.message);
    }

    return { success: true };
}

/**
 * 发送密码重置邮件
 */
export async function resetPassword(email: string): Promise<AuthResult> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error) {
        return {
            success: false,
            error: {
                message: getErrorMessage(error.message),
                code: error.message,
            },
        };
    }

    return { success: true };
}

/**
 * 发送验证码
 * @param email 邮箱地址
 * @param type 验证码类型:
 *   - 'signup': 注册
 *   - 'magiclink': 登录
 *   - 'recovery': 重置密码
 *   - 'email_change': 修改邮箱（newEmail参数必填）
 * @param newEmail 新邮箱（仅email_change类型需要）
 */
export async function sendOTP(
    email: string,
    type: 'signup' | 'magiclink' | 'recovery' | 'email_change' = 'signup',
    newEmail?: string
): Promise<AuthResult> {
    try {
        if (type === 'signup') {
            // 注册时发送验证码
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
                        code: error.message,
                    },
                };
            }
        } else if (type === 'magiclink') {
            // 登录时发送验证码
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
                        code: error.message,
                    },
                };
            }
        } else if (type === 'recovery') {
            // 重置密码 - 使用resend发送recovery类型验证码
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/auth/reset-password`,
            });

            if (error) {
                return {
                    success: false,
                    error: {
                        message: getErrorMessage(error.message),
                        code: error.message,
                    },
                };
            }
        } else if (type === 'email_change') {
            // 修改邮箱
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
                        code: error.message,
                    },
                };
            }
        }

        return { success: true };
    } catch {
        return {
            success: false,
            error: {
                message: '发送失败，请重试',
                code: 'SEND_FAILED',
            },
        };
    }
}
/**
 * 使用验证码验证
 * @param email 邮箱地址
 * @param token 验证码
 * @param type 验证类型: 'email' | 'recovery' | 'email_change' | 'signup' | 'magiclink'
 */
export async function verifyOTP(
    email: string,
    token: string,
    type: Extract<Parameters<typeof supabase.auth.verifyOtp>[0], { email: string }>['type'] = 'email'
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
                code: error.message,
            },
        };
    }

    return { success: true };
}

/**
 * 重置密码：通过 recovery OTP 验证并更新密码（不写入全局会话）
 */
export async function resetPasswordWithOTP(
    email: string,
    token: string,
    newPassword: string
): Promise<AuthResult> {
    const { error: verifyError } = await resetPasswordClient.auth.verifyOtp({
        email,
        token,
        type: 'recovery',
    });

    if (verifyError) {
        return {
            success: false,
            error: {
                message: getErrorMessage(verifyError.message),
                code: verifyError.message,
            },
        };
    }

    const { error: updateError } = await resetPasswordClient.auth.updateUser({
        password: newPassword,
    });

    if (updateError) {
        return {
            success: false,
            error: {
                message: getErrorMessage(updateError.message),
                code: updateError.message,
            },
        };
    }

    await resetPasswordClient.auth.signOut();
    return { success: true };
}

/**
 * 检查登录尝试次数（最近15分钟内）
 * 使用 SECURITY DEFINER 函数安全绕过 RLS
 */
export async function checkLoginAttempts(email: string): Promise<{ blocked: boolean; remainingAttempts: number }> {
    const maxAttempts = 5;

    const { data, error } = await supabase.rpc('check_login_attempts', {
        p_email: email,
    });

    if (error) {
        console.error('Error checking login attempts:', error);
        return { blocked: false, remainingAttempts: maxAttempts };
    }

    const failedAttempts = data?.[0]?.failed_count || 0;

    return {
        blocked: failedAttempts >= maxAttempts,
        remainingAttempts: Math.max(0, maxAttempts - failedAttempts),
    };
}

/**
 * 记录登录尝试
 * 使用 SECURITY DEFINER 函数安全绕过 RLS
 */
export async function recordLoginAttempt(email: string, success: boolean): Promise<void> {
    const { error } = await supabase.rpc('record_login_attempt', {
        p_email: email,
        p_success: success,
    });

    if (error) {
        console.error('Error recording login attempt:', error);
    }
}

/**
 * 带登录限制的邮箱登录
 */
export async function signInWithEmailProtected(email: string, password: string): Promise<AuthResult> {
    // 检查是否被锁定
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

    // 记录登录尝试
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

/**
 * 错误信息中英文映射
 */
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
