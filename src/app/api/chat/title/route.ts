/**
 * 生成对话标题的 API 路由
 * 
 * 这是一个服务端专用路由，不消耗用户积分
 * 使用 Supabase 实现分布式速率限制
 */

import { NextRequest, NextResponse } from 'next/server';
import { callAI } from '@/lib/ai/ai';
import { DEFAULT_MODEL_ID } from '@/lib/ai/ai-config';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';
import { sanitizePlainTitle } from '@/lib/title-utils';
import type { ChatMessage } from '@/types';

// 速率限制配置：每分钟每 IP 最多 10 次
const RATE_LIMIT_CONFIG = {
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 分钟
};

const TITLE_SYSTEM_PROMPT = `你是一个对话标题生成器。

要求：
- 只输出标题本身，不要解释、不要换行
- 禁止输出 Markdown（不要 #、**、列表、代码块等）
- 不要加任何引号/书名号
- 6个字以内，尽量精确
- 无法概括则输出：新对话`;

export async function POST(request: NextRequest) {
    try {
        // 分布式速率限制检查
        const clientIP = getClientIP(request);
        const rateLimit = await checkRateLimit(clientIP, '/api/chat/title', RATE_LIMIT_CONFIG);

        if (!rateLimit.allowed) {
            return NextResponse.json(
                {
                    title: '新对话',
                    error: '请求过于频繁，请稍后再试',
                    retryAfter: Math.ceil((rateLimit.resetAt.getTime() - Date.now()) / 1000),
                },
                {
                    status: 429,
                    headers: {
                        'X-RateLimit-Limit': String(RATE_LIMIT_CONFIG.maxRequests),
                        'X-RateLimit-Remaining': '0',
                        'X-RateLimit-Reset': String(Math.floor(rateLimit.resetAt.getTime() / 1000)),
                        'Retry-After': String(Math.ceil((rateLimit.resetAt.getTime() - Date.now()) / 1000)),
                    }
                }
            );
        }

        const body = await request.json();
        const { messages } = body as { messages: ChatMessage[] };

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return NextResponse.json({ title: '新对话' });
        }

        const firstUserMessage = messages.find(m => m.role === 'user');
        if (!firstUserMessage) {
            return NextResponse.json({ title: '新对话' });
        }

        const titleMessage: ChatMessage = {
            id: 'title-gen',
            role: 'user',
            content: firstUserMessage.content,
            createdAt: new Date().toISOString(),
        };

        // 调用 AI 生成标题（不检查积分）
        const content = await callAI([titleMessage], 'general', DEFAULT_MODEL_ID, '', {
            systemPromptOverride: TITLE_SYSTEM_PROMPT,
            temperature: 0.2,
            maxTokens: 64,
        });

        const sanitized = sanitizePlainTitle(content || '');
        const title = sanitized.slice(0, 20) || firstUserMessage.content.slice(0, 15);

        return NextResponse.json(
            { title },
            {
                headers: {
                    'X-RateLimit-Limit': String(RATE_LIMIT_CONFIG.maxRequests),
                    'X-RateLimit-Remaining': String(rateLimit.remaining),
                    'X-RateLimit-Reset': String(Math.floor(rateLimit.resetAt.getTime() / 1000)),
                }
            }
        );
    } catch (error) {
        console.error('Title generation error:', error);
        return NextResponse.json({ title: '新对话' });
    }
}
