/**
 * AI 对话 API 路由
 * 
 * 服务端组件说明：
 * - API 路由始终在服务端运行
 * - 保护 AI API 密钥不暴露给客户端
 * - 检查用户积分，积分不足时返回错误
 * - 支持流式输出 (stream=true)
 */

import { NextRequest, NextResponse } from 'next/server';
import { callAI, callAIStream } from '@/lib/ai';
import { hasCredits, useCredit } from '@/lib/credits';
import { createClient } from '@supabase/supabase-js';
import type { ChatMessage, AIPersonality } from '@/types';

// 服务端 Supabase 客户端
const getSupabase = () => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// 服务端内部密钥（必须通过环境变量设置，无 fallback）
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET;

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { messages, personality, skipCreditCheck, internalSecret, stream } = body as {
            messages: ChatMessage[];
            personality: AIPersonality;
            skipCreditCheck?: boolean;
            internalSecret?: string;
            stream?: boolean;
        };

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json(
                { error: '无效的消息格式' },
                { status: 400 }
            );
        }

        // 安全检查：必须设置 INTERNAL_API_SECRET 环境变量才能跳过积分检查
        // 如果未设置环境变量，禁止任何跳过请求
        const canSkipCredit = INTERNAL_SECRET && skipCreditCheck && internalSecret === INTERNAL_SECRET;

        // 获取用户信息
        const supabase = getSupabase();
        let userId: string | null = null;

        const authHeader = request.headers.get('authorization');
        if (authHeader) {
            const token = authHeader.replace('Bearer ', '');
            const { data: { user } } = await supabase.auth.getUser(token);
            userId = user?.id || null;
        }

        if (!userId) {
            const accessToken = request.cookies.get('sb-access-token')?.value;
            if (accessToken) {
                const { data: { user } } = await supabase.auth.getUser(accessToken);
                userId = user?.id || null;
            }
        }

        if (!userId && !canSkipCredit) {
            return NextResponse.json(
                { error: '请先登录后再使用 AI 对话' },
                { status: 401 }
            );
        }

        // 检查积分
        if (userId && !canSkipCredit) {
            const hasEnough = await hasCredits(userId);
            if (!hasEnough) {
                return NextResponse.json(
                    {
                        error: '积分不足，请充值后继续使用',
                        code: 'INSUFFICIENT_CREDITS',
                        needRecharge: true
                    },
                    { status: 402 }
                );
            }

            const remaining = await useCredit(userId);
            if (remaining === null) {
                return NextResponse.json(
                    {
                        error: '积分扣减失败，请重试',
                        code: 'CREDIT_DEDUCTION_FAILED'
                    },
                    { status: 500 }
                );
            }
        }

        // 流式响应
        if (stream) {
            const streamBody = await callAIStream(messages, personality || 'master');
            return new Response(streamBody, {
                headers: {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                },
            });
        }

        // 非流式响应
        const content = await callAI(messages, personality || 'master');
        return NextResponse.json({ content });
    } catch (error) {
        console.error('AI API 错误:', error);
        return NextResponse.json(
            { error: '服务暂时不可用' },
            { status: 500 }
        );
    }
}

