import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { captureConsoleErrors, ensureRouteTestEnv } from './helpers/route-mock';
import { createMockUIMessageResult } from './helpers/ui-message-result';

ensureRouteTestEnv();

test('tarot route uses schema column names when inserting history', async (t) => {
    const credits = require('../lib/user/credits') as any;
    const aiAccessModule = require('../lib/ai/ai-access') as any;
    const aiModule = require('../lib/ai/ai') as any;
    const aiAnalysisModule = require('../lib/ai/ai-analysis') as any;
    const supabaseModule = require('../lib/auth') as any;
    const consoleCapture = captureConsoleErrors();

    const originalGetUserAuthInfo = credits.getUserAuthInfo;
    const originalUseCredit = credits.useCredit;
    const originalResolveModelAccessAsync = aiAccessModule.resolveModelAccessAsync;
    const originalCallAIWithReasoning = aiModule.callAIWithReasoning;
    const originalCreateConversation = aiAnalysisModule.createAIAnalysisConversation;
    const originalFetch = global.fetch;
    const originalGetUser = supabaseModule.supabase.auth.getUser;

    let createArgs: Record<string, unknown> | null = null;

    credits.getUserAuthInfo = async () => ({ credits: 10, effectiveMembership: 'free', hasCredits: true });
    credits.useCredit = async () => 1;
    aiAccessModule.resolveModelAccessAsync = async () => ({
        modelId: 'test-model',
        modelConfig: { id: 'test-model' },
        reasoningEnabled: false,
    });
    aiModule.callAIWithReasoning = async () => ({
        content: 'analysis',
        reasoning: null,
    });
    aiAnalysisModule.createAIAnalysisConversation = async (params: Record<string, unknown>) => {
        createArgs = params;
        return 'conv-1';
    };
    supabaseModule.supabase.auth.getUser = async () => ({
        data: { user: { id: 'user-1' } },
        error: null,
    });
    global.fetch = async () => Response.json({
        choices: [{ index: 0, message: { content: 'analysis' } }],
    });

    t.after(() => {
        consoleCapture.restore();
        credits.getUserAuthInfo = originalGetUserAuthInfo;
        credits.useCredit = originalUseCredit;
        aiAccessModule.resolveModelAccessAsync = originalResolveModelAccessAsync;
        aiModule.callAIWithReasoning = originalCallAIWithReasoning;
        aiAnalysisModule.createAIAnalysisConversation = originalCreateConversation;
        supabaseModule.supabase.auth.getUser = originalGetUser;
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
    assert.ok(createArgs);
    assert.equal((createArgs as Record<string, unknown>).sourceType, 'tarot');
    assert.equal((createArgs as Record<string, unknown>).historyBinding?.type, 'tarot');
    assert.equal((createArgs as Record<string, unknown>).historyBinding?.payload?.spread_id, 'single');
    assert.equal('interpretation' in (((createArgs as Record<string, unknown>).historyBinding?.payload as Record<string, unknown>) || {}), false);
    assert.equal('spread_type' in (((createArgs as Record<string, unknown>).historyBinding?.payload as Record<string, unknown>) || {}), false);
    assert.equal('ai_interpretation' in (((createArgs as Record<string, unknown>).historyBinding?.payload as Record<string, unknown>) || {}), false);
});

test('tarot route persists analysis after streaming completes', async (t) => {
    const credits = require('../lib/user/credits') as any;
    const aiModule = require('../lib/ai/ai') as any;
    const aiAnalysisModule = require('../lib/ai/ai-analysis') as any;
    const supabaseModule = require('../lib/auth') as any;
    const originalGetUserAuthInfo = credits.getUserAuthInfo;
    const originalUseCredit = credits.useCredit;
    const originalCallAIUIMessageResult = aiModule.callAIUIMessageResult;
    const originalCreateConversation = aiAnalysisModule.createAIAnalysisConversation;
    const originalGetUser = supabaseModule.supabase.auth.getUser;

    let createArgs: Record<string, unknown> | null = null;

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

    t.after(() => {
        credits.getUserAuthInfo = originalGetUserAuthInfo;
        credits.useCredit = originalUseCredit;
        aiModule.callAIUIMessageResult = originalCallAIUIMessageResult;
        aiAnalysisModule.createAIAnalysisConversation = originalCreateConversation;
        supabaseModule.supabase.auth.getUser = originalGetUser;
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

    assert.equal(response.headers.get('x-vercel-ai-ui-message-stream'), 'v1');
    assert.ok(createArgs);
    assert.equal((createArgs as Record<string, unknown>).sourceType, 'tarot');
    assert.equal((createArgs as Record<string, unknown>).historyBinding?.type, 'tarot');
    assert.equal((createArgs as Record<string, unknown>).historyBinding?.payload?.reading_id, 'reading-1');
});

test('tarot route surfaces SSE error when stream persistence fails after content generation', async (t) => {
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
    const body = await response.text();

    assert.equal(response.status, 200);
    assert.equal(response.headers.get('x-vercel-ai-ui-message-stream'), 'v1');
    assert.match(body, /"type":"text-delta","id":"text-1","delta":"analysis"/u);
    assert.match(body, /"type":"error","errorText":"保存结果失败，请稍后重试"/u);
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

test('tarot route returns numerology on draw-only and persists birth metadata on save', async (t) => {
    const apiUtilsModule = require('../lib/api-utils') as typeof import('../lib/api-utils');
    const originalGetAuthContext = apiUtilsModule.getAuthContext;
    const originalRequireBearerUser = apiUtilsModule.requireBearerUser;
    const originalGetSystemAdminClient = apiUtilsModule.getSystemAdminClient;

    let inserted: Record<string, unknown> | null = null;

    apiUtilsModule.getAuthContext = async () => ({
        user: null,
        session: null,
    }) as unknown as Awaited<ReturnType<typeof import('../lib/api-utils').getAuthContext>>;

    apiUtilsModule.requireBearerUser = async () => ({
        user: { id: 'user-1' } as Awaited<ReturnType<typeof import('../lib/api-utils').getAuthContext>>['user'],
        session: null,
    }) as Awaited<ReturnType<typeof import('../lib/api-utils').requireBearerUser>>;

    apiUtilsModule.getSystemAdminClient = () => ({
        from(table: string) {
            assert.equal(table, 'tarot_readings');
            return {
                insert(payload: Record<string, unknown>) {
                    inserted = payload;
                    return {
                        select() {
                            return {
                                single: async () => ({
                                    data: { id: 'reading-1' },
                                    error: null,
                                }),
                            };
                        },
                    };
                },
            };
        },
    }) as unknown as ReturnType<typeof import('../lib/api-utils').getSystemAdminClient>;

    t.after(() => {
        apiUtilsModule.getAuthContext = originalGetAuthContext;
        apiUtilsModule.requireBearerUser = originalRequireBearerUser;
        apiUtilsModule.getSystemAdminClient = originalGetSystemAdminClient;
    });

    const { POST } = await import('../app/api/tarot/route');

    const drawOnlyResponse = await POST(new NextRequest('http://localhost/api/tarot', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            action: 'draw-only',
            spreadId: 'single',
            birthDate: '1990-01-01',
        }),
    }));
    const drawOnlyPayload = await drawOnlyResponse.json();

    assert.equal(drawOnlyResponse.status, 200);
    assert.equal(drawOnlyPayload.success, true);
    assert.ok(drawOnlyPayload.data?.numerology);
    assert.equal(typeof drawOnlyPayload.data?.numerology?.personalityCard?.nameChinese, 'string');

    const saveResponse = await POST(new NextRequest('http://localhost/api/tarot', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({
            action: 'save',
            spreadId: 'single',
            question: '今天如何',
            birthDate: '1990-01-01',
            numerology: drawOnlyPayload.data?.numerology,
            cards: drawOnlyPayload.data?.cards,
        }),
    }));
    const savePayload = await saveResponse.json();

    assert.equal(saveResponse.status, 200);
    assert.equal(savePayload.success, true);
    assert.ok(inserted);
    assert.deepEqual((inserted as Record<string, unknown>).metadata, {
        birthDate: '1990-01-01',
        numerology: drawOnlyPayload.data?.numerology,
    });
});

test('tarot save should fail fast when metadata column is missing', async (t) => {
    const apiUtilsModule = require('../lib/api-utils') as typeof import('../lib/api-utils');
    const originalRequireBearerUser = apiUtilsModule.requireBearerUser;
    const originalGetSystemAdminClient = apiUtilsModule.getSystemAdminClient;

    const inserted: Record<string, unknown>[] = [];
    let insertAttempts = 0;

    apiUtilsModule.requireBearerUser = async () => ({
        user: { id: 'user-1' } as Awaited<ReturnType<typeof import('../lib/api-utils').getAuthContext>>['user'],
        session: null,
    }) as Awaited<ReturnType<typeof import('../lib/api-utils').requireBearerUser>>;

    apiUtilsModule.getSystemAdminClient = () => ({
        from(table: string) {
            assert.equal(table, 'tarot_readings');
            return {
                insert(payload: Record<string, unknown>) {
                    insertAttempts += 1;
                    inserted.push(payload);
                    return {
                        select() {
                            return {
                                single: async () => ({
                                    data: 'metadata' in payload ? null : { id: 'reading-2' },
                                    error: 'metadata' in payload
                                        ? {
                                            message: 'column \"metadata\" of relation \"tarot_readings\" does not exist',
                                            code: 'PGRST204',
                                        }
                                        : null,
                                }),
                            };
                        },
                    };
                },
            };
        },
    }) as unknown as ReturnType<typeof import('../lib/api-utils').getSystemAdminClient>;

    t.after(() => {
        apiUtilsModule.requireBearerUser = originalRequireBearerUser;
        apiUtilsModule.getSystemAdminClient = originalGetSystemAdminClient;
    });

    const { POST } = await import('../app/api/tarot/route');

    const response = await POST(new NextRequest('http://localhost/api/tarot', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({
            action: 'save',
            spreadId: 'single',
            question: '今天如何',
            birthDate: '1990-01-01',
            numerology: {
                personalityCard: { number: 1, name: 'The Magician', nameChinese: '魔术师' },
                soulCard: { number: 2, name: 'The High Priestess', nameChinese: '女祭司' },
                yearlyCard: { number: 19, name: 'The Sun', nameChinese: '太阳', year: 2026 },
            },
            cards: [
                {
                    card: { nameChinese: '测试牌', keywords: ['关键词'], uprightMeaning: '正位', reversedMeaning: '逆位' },
                    orientation: 'upright',
                },
            ],
        }),
    }));

    const payload = await response.json();

    assert.equal(response.status, 500);
    assert.equal(payload.success, false);
    assert.equal(payload.error, '保存记录失败');
    assert.equal(insertAttempts, 1);
    assert.ok('metadata' in inserted[0]);
});
