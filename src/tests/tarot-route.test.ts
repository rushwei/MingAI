import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { captureConsoleErrors, ensureRouteTestEnv } from './helpers/route-mock';

ensureRouteTestEnv();

test('tarot route uses schema column names when inserting history', async (t) => {
    const credits = require('../lib/user/credits') as any;
    const supabaseModule = require('../lib/supabase') as any;
    const supabaseServerModule = require('../lib/supabase-server') as any;
    const consoleCapture = captureConsoleErrors();

    const originalGetUserAuthInfo = credits.getUserAuthInfo;
    const originalUseCredit = credits.useCredit;
    const originalFetch = global.fetch;
    const originalGetUser = supabaseModule.supabase.auth.getUser;
    const originalGetServiceClient = supabaseServerModule.getSystemAdminClient;

    let inserted: Record<string, unknown> | null = null;
    const fakeClient = {
        from: (table: string) => {
            if (table === 'users') {
                return {
                    select: () => ({
                        eq: () => ({
                            single: async () => ({
                                data: { ai_chat_count: 10, membership: 'free', last_credit_restore_at: null, membership_expires_at: null },
                                error: null,
                            }),
                            maybeSingle: async () => ({ data: null, error: null }),
                        }),
                    }),
                };
            }
            return {
                insert: (payload: Record<string, unknown>) => {
                    if (table === 'tarot_readings') {
                        inserted = payload;
                        return { error: null };
                    }
                    if (table === 'conversations') {
                        return {
                            select: () => ({
                                single: async () => ({ data: { id: 'conv-1' }, error: null }),
                            }),
                        };
                    }
                    return { error: null };
                },
            };
        },
        rpc: async () => ({ error: null }),
    };

    credits.getUserAuthInfo = async () => ({ credits: 10, effectiveMembership: 'free', hasCredits: true });
    credits.useCredit = async () => 1;
    supabaseModule.supabase.auth.getUser = async () => ({
        data: { user: { id: 'user-1' } },
        error: null,
    });
    supabaseServerModule.getSystemAdminClient = () => fakeClient;
    global.fetch = async () => ({
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'analysis' } }] }),
    } as any);

    t.after(() => {
        consoleCapture.restore();
        credits.getUserAuthInfo = originalGetUserAuthInfo;
        credits.useCredit = originalUseCredit;
        supabaseModule.supabase.auth.getUser = originalGetUser;
        supabaseServerModule.getSystemAdminClient = originalGetServiceClient;
        global.fetch = originalFetch;
    });

    const { POST } = await import('../app/api/tarot/route');

    const request = new NextRequest('http://localhost/api/tarot', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({
            action: 'interpret',
            spreadId: 'single',
            cards: [
                {
                    card: {
                        nameChinese: '测试牌',
                        keywords: ['关键词'],
                        uprightMeaning: '正位',
                        reversedMeaning: '逆位',
                    },
                    orientation: 'upright',
                },
            ],
        }),
    });

    const response = await POST(request);
    const data = await response.json();

    const hasMembershipWarning = consoleCapture.errors.some((line) =>
        line.includes('[membership] Failed') ||
        line.includes('[supabase-server] Missing Supabase service configuration')
    );
    assert.equal(hasMembershipWarning, false);
    assert.equal(response.status, 200);
    assert.equal(data.success, true);
    assert.ok(inserted);
    assert.equal((inserted as Record<string, unknown>)?.spread_id, 'single');
    // Note: interpretation is now stored in conversations table, not tarot_readings
    assert.equal('interpretation' in (inserted || {}), false);
    assert.equal('spread_type' in (inserted || {}), false);
    assert.equal('ai_interpretation' in (inserted || {}), false);
});

test('tarot route returns error when credit deduction fails', async (t) => {
    const credits = require('../lib/user/credits') as any;
    const supabaseModule = require('../lib/supabase') as any;
    const supabaseServerModule = require('../lib/supabase-server') as any;
    const consoleCapture = captureConsoleErrors();

    const originalGetUserAuthInfo = credits.getUserAuthInfo;
    const originalUseCredit = credits.useCredit;
    const originalFetch = global.fetch;
    const originalGetUser = supabaseModule.supabase.auth.getUser;
    const originalGetServiceClient = supabaseServerModule.getSystemAdminClient;

    credits.getUserAuthInfo = async () => ({ credits: 10, effectiveMembership: 'free', hasCredits: true });
    credits.useCredit = async () => null;
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
                                data: { ai_chat_count: 10, membership: 'free', last_credit_restore_at: null, membership_expires_at: null },
                                error: null,
                            }),
                            maybeSingle: async () => ({ data: null, error: null }),
                        }),
                    }),
                };
            }
            return {
                insert: async () => ({ error: null }),
            };
        },
    });
    global.fetch = async () => ({
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'analysis' } }] }),
    } as any);

    t.after(() => {
        consoleCapture.restore();
        credits.getUserAuthInfo = originalGetUserAuthInfo;
        credits.useCredit = originalUseCredit;
        supabaseModule.supabase.auth.getUser = originalGetUser;
        supabaseServerModule.getSystemAdminClient = originalGetServiceClient;
        global.fetch = originalFetch;
    });

    const { POST } = await import('../app/api/tarot/route');

    const request = new NextRequest('http://localhost/api/tarot', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({
            action: 'interpret',
            cards: [
                {
                    card: {
                        nameChinese: '测试牌',
                        keywords: ['关键词'],
                        uprightMeaning: '正位',
                        reversedMeaning: '逆位',
                    },
                    orientation: 'upright',
                },
            ],
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

test('tarot route persists analysis after streaming completes', async (t) => {
    const credits = require('../lib/user/credits') as any;
    const aiModule = require('../lib/ai/ai') as any;
    const aiAnalysisModule = require('../lib/ai/ai-analysis') as any;
    const supabaseModule = require('../lib/supabase') as any;
    const supabaseServerModule = require('../lib/supabase-server') as any;

    const originalGetUserAuthInfo = credits.getUserAuthInfo;
    const originalUseCredit = credits.useCredit;
    const originalCallAIStream = aiModule.callAIStream;
    const originalCreateConversation = aiAnalysisModule.createAIAnalysisConversation;
    const originalGetUser = supabaseModule.supabase.auth.getUser;
    const originalGetServiceClient = supabaseServerModule.getSystemAdminClient;

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

    credits.getUserAuthInfo = async () => ({ credits: 10, effectiveMembership: 'pro', hasCredits: true });
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
            if (table === 'tarot_readings') {
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
        aiModule.callAIStream = originalCallAIStream;
        aiAnalysisModule.createAIAnalysisConversation = originalCreateConversation;
        supabaseModule.supabase.auth.getUser = originalGetUser;
        supabaseServerModule.getSystemAdminClient = originalGetServiceClient;
    });

    const { POST } = await import('../app/api/tarot/route');

    const request = new NextRequest('http://localhost/api/tarot', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({
            action: 'interpret',
            stream: true,
            readingId: 'reading-1',
            cards: [
                {
                    card: {
                        nameChinese: '测试牌',
                        keywords: ['关键词'],
                        uprightMeaning: '正位',
                        reversedMeaning: '逆位',
                    },
                    orientation: 'upright',
                },
            ],
        }),
    });

    const response = await POST(request);
    await response.text();
    await new Promise((resolve) => setTimeout(resolve, 0));

    assert.ok(createArgs);
    assert.equal((createArgs as Record<string, unknown>).sourceType, 'tarot');
    assert.equal((updated as Record<string, unknown> | null)?.conversation_id, 'conv-1');
});

test('tarot route returns 400 for invalid timezone on GET daily requests', async () => {
    const { GET } = await import('../app/api/tarot/route');

    const request = new NextRequest('http://localhost/api/tarot?action=daily&timezone=Bad/Timezone');
    const response = await GET(request);
    const data = await response.json();

    assert.equal(response.status, 400);
    assert.equal(data.success, false);
    assert.equal(data.error, 'timezone 无效');
});
