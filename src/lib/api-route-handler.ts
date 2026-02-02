/**
 * API 路由处理器工具类
 *
 * 提供统一的认证、积分检查、错误处理等功能
 * 减少 API 路由中的重复代码
 */
import { NextRequest, NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { requireBearerUser, getServiceRoleClient } from './api-utils';
import { hasCredits, useCredit as consumeCredit, addCredits } from './credits';
import { getEffectiveMembershipType } from './membership-server';
import { resolveModelAccessAsync } from './ai-access';
import { DEFAULT_MODEL_ID } from './ai-config';

// 标准 API 响应类型
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
}

// 认证上下文
export interface AuthContext {
    user: User;
    membershipType: 'free' | 'plus' | 'pro';
}

// AI 模型访问上下文
export interface ModelAccessContext extends AuthContext {
    modelId: string;
    reasoningEnabled: boolean;
}

// 错误响应辅助函数
export function apiError(message: string, status: number = 400): NextResponse<ApiResponse> {
    return NextResponse.json({ success: false, error: message }, { status });
}

// 成功响应辅助函数
export function apiSuccess<T>(data: T): NextResponse<ApiResponse<T>> {
    return NextResponse.json({ success: true, data });
}

/**
 * 验证用户认证
 * 返回用户信息或错误响应
 */
export async function withAuth(
    request: NextRequest
): Promise<{ user: User } | NextResponse<ApiResponse>> {
    const authResult = await requireBearerUser(request);
    if ('error' in authResult) {
        return apiError(authResult.error.message, authResult.error.status);
    }
    return { user: authResult.user };
}

/**
 * 验证用户认证并获取会员类型
 */
export async function withAuthAndMembership(
    request: NextRequest
): Promise<AuthContext | NextResponse<ApiResponse>> {
    const authResult = await withAuth(request);
    if (authResult instanceof NextResponse) {
        return authResult;
    }

    const membershipType = await getEffectiveMembershipType(authResult.user.id);
    return {
        user: authResult.user,
        membershipType,
    };
}

/**
 * 验证用户认证、积分并获取模型访问权限
 * 用于需要消耗积分的 AI 功能
 */
export async function withAuthCreditsAndModel(
    request: NextRequest,
    options: {
        modelId?: string;
        reasoning?: boolean;
    } = {}
): Promise<ModelAccessContext | NextResponse<ApiResponse>> {
    // 1. 验证认证
    const authResult = await withAuth(request);
    if (authResult instanceof NextResponse) {
        return authResult;
    }
    const { user } = authResult;

    // 2. 检查积分
    const hasEnoughCredits = await hasCredits(user.id);
    if (!hasEnoughCredits) {
        return apiError('积分不足，请充值后使用', 403);
    }

    // 3. 获取会员类型和模型访问权限
    const membershipType = await getEffectiveMembershipType(user.id);
    const access = await resolveModelAccessAsync(
        options.modelId,
        DEFAULT_MODEL_ID,
        membershipType,
        options.reasoning
    );

    if ('error' in access) {
        return apiError(access.error, access.status);
    }

    return {
        user,
        membershipType,
        modelId: access.modelId,
        reasoningEnabled: access.reasoningEnabled,
    };
}

/**
 * 扣除积分
 * 返回剩余积分或错误响应
 */
export async function deductCredit(
    userId: string
): Promise<number | NextResponse<ApiResponse>> {
    const remainingCredits = await consumeCredit(userId);
    if (remainingCredits === null) {
        return apiError('积分扣减失败，请稍后重试', 500);
    }
    return remainingCredits;
}

/**
 * AI 调用失败时退还积分
 */
export async function refundCredit(userId: string, amount: number = 1): Promise<void> {
    await addCredits(userId, amount);
}

/**
 * 获取服务端数据库客户端
 * 用于绕过 RLS 进行数据操作
 */
export { getServiceRoleClient };

/**
 * 包装 AI 功能的完整流程
 * 包含认证、积分检查、扣除、执行、失败退还
 */
export async function withAIHandler<T>(
    request: NextRequest,
    options: {
        modelId?: string;
        reasoning?: boolean;
    },
    handler: (context: ModelAccessContext) => Promise<T>
): Promise<T | NextResponse<ApiResponse>> {
    // 获取认证和模型访问权限
    const context = await withAuthCreditsAndModel(request, options);
    if (context instanceof NextResponse) {
        return context;
    }

    // 扣除积分
    const creditResult = await deductCredit(context.user.id);
    if (creditResult instanceof NextResponse) {
        return creditResult;
    }

    try {
        // 执行 AI 处理
        return await handler(context);
    } catch (error) {
        // 失败时退还积分
        await refundCredit(context.user.id);
        throw error;
    }
}
