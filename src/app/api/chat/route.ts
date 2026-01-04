/**
 * AI 对话 API 路由
 * 
 * 服务端组件说明：
 * - API 路由始终在服务端运行
 * - 保护 AI API 密钥不暴露给客户端
 */

import { NextRequest, NextResponse } from 'next/server';
import { callAI } from '@/lib/ai';
import type { ChatMessage, AIPersonality } from '@/types';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { messages, personality } = body as {
            messages: ChatMessage[];
            personality: AIPersonality;
        };

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json(
                { error: '无效的消息格式' },
                { status: 400 }
            );
        }

        // 调用 AI
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
