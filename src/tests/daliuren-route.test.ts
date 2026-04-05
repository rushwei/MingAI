import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { ensureRouteTestEnv } from './helpers/route-mock';
import { createMockUIMessageResult } from './helpers/ui-message-result';

ensureRouteTestEnv();

test('daliuren route persists analysis after streaming completes', async (t) => {
    const { calculateDaliurenData } = require('@mingai/core/daliuren-core') as typeof import('@mingai/core/daliuren-core');
    const credits = require('../lib/user/credits') as any;
    const aiModule = require('../lib/ai/ai') as any;
    const aiAnalysisModule = require('../lib/ai/ai-analysis') as any;
    const supabaseModule = require('../lib/auth') as any;
    const supabaseServerModule = require('../lib/supabase-server') as any;

    const originalGetUserAuthInfo = credits.getUserAuthInfo;
    const originalUseCredit = credits.useCredit;
    const originalCallAIUIMessageResult = aiModule.callAIUIMessageResult;
    const originalCreateConversation = aiAnalysisModule.createAIAnalysisConversation;
    const originalGetUser = supabaseModule.supabase.auth.getUser;
    const originalGetServiceClient = supabaseServerModule.getSystemAdminClient;

    const resultData = calculateDaliurenData({
        date: '2025-01-15',
        hour: 10,
        minute: 30,
        timezone: 'Asia/Shanghai',
        question: '测试问题',
    });

    let createArgs: Record<string, unknown> | null = null;
    let updated: Record<string, unknown> | null = null;

    credits.getUserAuthInfo = async () => ({ credits: 10, effectiveMembership: 'pro', hasCredits: true });
    credits.useCredit = async () => 1;
    aiModule.callAIUIMessageResult = async () => createMockUIMessageResult();
    aiAnalysisModule.createAIAnalysisConversation = async (params: Record<string, unknown>) => {
        createArgs = params;
        return 'conv-1';
    };
    supabaseModule.supabase.auth.getUser = async () => ({
        data: { user: { id: 'user-1' } },
        error: null,
    });
    supabaseServerModule.getSystemAdminClient = () => ({
        from: (table: string) => {
            if (table === 'users') {
                return {
                    select: () => ({
                        eq: () => ({
                            single: async () => ({
                                data: { ai_chat_count: 10, membership: 'pro', last_credit_restore_at: null, membership_expires_at: null },
                                error: null,
                            }),
                            maybeSingle: async () => ({
                                data: { membership: 'pro', membership_expires_at: null },
                                error: null,
                            }),
                        }),
                    }),
                };
            }
            if (table === 'daliuren_divinations') {
                return {
                    update: (payload: Record<string, unknown>) => {
                        updated = payload;
                        return {
                            eq: () => ({
                                eq: async () => ({ error: null }),
                            }),
                        };
                    },
                    insert: async () => ({ error: null }),
                };
            }
            return {
                insert: async () => ({ error: null }),
            };
        },
    });

    t.after(() => {
        credits.getUserAuthInfo = originalGetUserAuthInfo;
        credits.useCredit = originalUseCredit;
        aiModule.callAIUIMessageResult = originalCallAIUIMessageResult;
        aiAnalysisModule.createAIAnalysisConversation = originalCreateConversation;
        supabaseModule.supabase.auth.getUser = originalGetUser;
        supabaseServerModule.getSystemAdminClient = originalGetServiceClient;
    });

    const { POST } = await import('../app/api/daliuren/route');
    const request = new NextRequest('http://localhost/api/daliuren', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({
            action: 'interpret',
            stream: true,
            divinationId: 'divination-1',
            question: '测试问题',
            resultData,
        }),
    });

    const response = await POST(request);
    await response.text();
    await new Promise((resolve) => setTimeout(resolve, 0));

    assert.equal(response.headers.get('x-vercel-ai-ui-message-stream'), 'v1');
    assert.ok(createArgs);
    assert.equal((createArgs as Record<string, unknown>).sourceType, 'daliuren');
    assert.equal((updated as Record<string, unknown> | null)?.conversation_id, 'conv-1');
});

test('daliuren route surfaces SSE error when stream persistence fails after content generation', async (t) => {
    const { calculateDaliurenData } = require('@mingai/core/daliuren-core') as typeof import('@mingai/core/daliuren-core');
    const credits = require('../lib/user/credits') as any;
    const aiModule = require('../lib/ai/ai') as any;
    const aiAnalysisModule = require('../lib/ai/ai-analysis') as any;
    const supabaseModule = require('../lib/auth') as any;
    const originalGetUserAuthInfo = credits.getUserAuthInfo;
    const originalUseCredit = credits.useCredit;
    const originalCallAIUIMessageResult = aiModule.callAIUIMessageResult;
    const originalCreateConversation = aiAnalysisModule.createAIAnalysisConversation;
    const originalGetUser = supabaseModule.supabase.auth.getUser;
    const originalConsoleError = console.error;

    const resultData = calculateDaliurenData({
        date: '2025-01-15',
        hour: 10,
        minute: 30,
        timezone: 'Asia/Shanghai',
        question: '测试问题',
    });

    credits.getUserAuthInfo = async () => ({ credits: 10, effectiveMembership: 'pro', hasCredits: true });
    credits.useCredit = async () => 1;
    aiModule.callAIUIMessageResult = async () => createMockUIMessageResult();
    aiAnalysisModule.createAIAnalysisConversation = async () => {
        throw new Error('persist failed');
    };
    supabaseModule.supabase.auth.getUser = async () => ({
        data: { user: { id: 'user-1' } },
        error: null,
    });
    console.error = () => {};

    t.after(() => {
        credits.getUserAuthInfo = originalGetUserAuthInfo;
        credits.useCredit = originalUseCredit;
        aiModule.callAIUIMessageResult = originalCallAIUIMessageResult;
        aiAnalysisModule.createAIAnalysisConversation = originalCreateConversation;
        supabaseModule.supabase.auth.getUser = originalGetUser;
        console.error = originalConsoleError;
    });

    const { POST } = await import('../app/api/daliuren/route');
    const request = new NextRequest('http://localhost/api/daliuren', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({
            action: 'interpret',
            stream: true,
            divinationId: 'divination-1',
            question: '测试问题',
            resultData,
        }),
    });

    const response = await POST(request);
    const body = await response.text();

    assert.equal(response.status, 200);
    assert.equal(response.headers.get('x-vercel-ai-ui-message-stream'), 'v1');
    assert.match(body, /"type":"text-delta","id":"text-1","delta":"analysis"/u);
    assert.match(body, /"type":"error","errorText":"保存结果失败，请稍后重试"/u);
});
