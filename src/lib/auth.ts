/**
 * 认证逻辑封装
 * 
 * 提供邮箱登录、注册、登出等功能
 */

import { supabase } from './supabase';

export type AuthError = {
    message: string;
    code?: string;
};

export type AuthResult = {
    success: boolean;
    error?: AuthError;
};

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
        .select('*')
        .eq('id', userId)
        .single();

    if (error) {
        console.error('Error fetching user profile:', error);
        return null;
    }

    return data;
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
    };

    return errorMessages[code] || code;
}
