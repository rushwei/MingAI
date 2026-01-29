import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';

process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service';
process.env.DEEPSEEK_API_KEY = 'test-key';
process.env.DEEPSEEK_MODEL_ID = process.env.DEEPSEEK_MODEL_ID || 'deepseek-chat';

const captureConsoleErrors = () => {
    const original = console.error;
    const errors: string[] = [];
    console.error = (...args: unknown[]) => {
        errors.push(args.map(String).join(' '));
    };
    return {
        errors,
        restore: () => {
            console.error = original;
        },
    };
};

test('mbti route returns error when credit deduction fails', async (t) => {
    const credits = require('../lib/credits') as any;
    const supabaseModule = require('../lib/supabase') as any;
    const supabaseServerModule = require('../lib/supabase-server') as any;
    const consoleCapture = captureConsoleErrors();

    const originalHasCredits = credits.hasCredits;
    const originalUseCredit = credits.useCredit;
    const originalFetch = global.fetch;
    const originalGetUser = supabaseModule.supabase.auth.getUser;
    const originalGetServiceClient = supabaseServerModule.getServiceClient;

    credits.hasCredits = async () => true;
    credits.useCredit = async () => null;
    supabaseModule.supabase.auth.getUser = async () => ({
        data: { user: { id: 'user-1' } },
        error: null,
    });
    supabaseServerModule.getServiceClient = () => ({
        from: () => ({
            select: () => ({
                eq: () => ({
                    maybeSingle: async () => ({ data: null, error: null }),
                }),
            }),
        }),
    });
    global.fetch = async () => ({
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'analysis' } }] }),
    } as any);

    t.after(() => {
        consoleCapture.restore();
        credits.hasCredits = originalHasCredits;
        credits.useCredit = originalUseCredit;
        supabaseModule.supabase.auth.getUser = originalGetUser;
        supabaseServerModule.getServiceClient = originalGetServiceClient;
        global.fetch = originalFetch;
    });

    const { POST } = await import('../app/api/mbti/route');

    const request = new NextRequest('http://localhost/api/mbti', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({
            action: 'analyze',
            type: 'INTJ',
            scores: { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 },
            percentages: {
                EI: { E: 50, I: 50 },
                SN: { S: 50, N: 50 },
                TF: { T: 50, F: 50 },
                JP: { J: 50, P: 50 },
            },
        }),
    });

    const response = await POST(request);
    const data = await response.json();

    const hasMembershipWarning = consoleCapture.errors.some((line) =>
        line.includes('[membership] Failed') ||
        line.includes('[supabase-server] Missing Supabase service configuration')
    );
    assert.equal(hasMembershipWarning, false);
    assert.equal(response.status, 500);
    assert.equal(data.error, '积分扣减失败，请稍后重试');
});

test('mbti route persists analysis after streaming completes', async (t) => {
    const credits = require('../lib/credits') as any;
    const aiModule = require('../lib/ai') as any;
    const aiAnalysisModule = require('../lib/ai-analysis') as any;
    const supabaseModule = require('../lib/supabase') as any;
    const supabaseServerModule = require('../lib/supabase-server') as any;

    const originalHasCredits = credits.hasCredits;
    const originalUseCredit = credits.useCredit;
    const originalCallAIStream = aiModule.callAIStream;
    const originalCreateConversation = aiAnalysisModule.createAIAnalysisConversation;
    const originalGetUser = supabaseModule.supabase.auth.getUser;
    const originalGetServiceClient = supabaseServerModule.getServiceClient;

    let createArgs: Record<string, unknown> | null = null;
    let updated: Record<string, unknown> | null = null;

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
        start(controller) {
            controller.enqueue(
                encoder.encode('data: {"choices":[{"delta":{"content":"analysis","reasoning_content":"reason"}}]}\n\n')
            );
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
        },
    });

    credits.hasCredits = async () => true;
    credits.useCredit = async () => 1;
    aiModule.callAIStream = async () => stream;
    aiAnalysisModule.createAIAnalysisConversation = async (params: Record<string, unknown>) => {
        createArgs = params;
        return 'conv-1';
    };
    supabaseModule.supabase.auth.getUser = async () => ({
        data: { user: { id: 'user-1' } },
        error: null,
    });
    supabaseServerModule.getServiceClient = () => ({
        from: (table: string) => {
            if (table === 'users') {
                return {
                    select: () => ({
                        eq: () => ({
                            maybeSingle: async () => ({
                                data: { membership: 'pro', membership_expires_at: null },
                                error: null,
                            }),
                        }),
                    }),
                };
            }
            if (table === 'mbti_readings') {
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
        credits.hasCredits = originalHasCredits;
        credits.useCredit = originalUseCredit;
        aiModule.callAIStream = originalCallAIStream;
        aiAnalysisModule.createAIAnalysisConversation = originalCreateConversation;
        supabaseModule.supabase.auth.getUser = originalGetUser;
        supabaseServerModule.getServiceClient = originalGetServiceClient;
    });

    const { POST } = await import('../app/api/mbti/route');

    const request = new NextRequest('http://localhost/api/mbti', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({
            action: 'analyze',
            stream: true,
            readingId: 'reading-1',
            type: 'INTJ',
            scores: { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 },
            percentages: {
                EI: { E: 50, I: 50 },
                SN: { S: 50, N: 50 },
                TF: { T: 50, F: 50 },
                JP: { J: 50, P: 50 },
            },
        }),
    });

    const response = await POST(request);
    await response.text();
    await new Promise((resolve) => setTimeout(resolve, 0));

    assert.ok(createArgs);
    assert.equal((createArgs as Record<string, unknown>).sourceType, 'mbti');
    assert.equal((updated as Record<string, unknown> | null)?.conversation_id, 'conv-1');
});
