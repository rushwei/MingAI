import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { ensureRouteTestEnv } from './helpers/route-mock';

ensureRouteTestEnv();

test('liuyao route uses divination created_at for analysis date', async (t) => {
    const credits = require('../lib/user/credits') as any;
    const supabaseModule = require('../lib/auth') as any;
    const supabaseServerModule = require('../lib/supabase-server') as any;
    const aiModule = require('../lib/ai/ai') as any;
    const liuyaoModule = require('../lib/divination/liuyao') as any;

    const originalGetUserAuthInfo = credits.getUserAuthInfo;
    const originalUseCredit = credits.useCredit;
    const originalGetUser = supabaseModule.supabase.auth.getUser;
    const originalGetServiceClient = supabaseServerModule.getSystemAdminClient;
    const originalCallAIWithReasoning = aiModule.callAIWithReasoning;
    const originalCalculateLiuyaoBundle = liuyaoModule.calculateLiuyaoBundle;

    const createdAt = new Date('2024-01-02T03:04:05.000Z');
    let capturedDate: Date | undefined;

    credits.getUserAuthInfo = async () => ({ credits: 10, effectiveMembership: 'pro', hasCredits: true });
    credits.useCredit = async () => 5;
    supabaseModule.supabase.auth.getUser = async () => ({
        data: { user: { id: 'user-1' } },
        error: null,
    });
    aiModule.callAIWithReasoning = async () => ({ content: 'analysis' });
    liuyaoModule.calculateLiuyaoBundle = (input: { date: Date }) => {
        capturedDate = input.date;
        return originalCalculateLiuyaoBundle(input);
    };

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
            if (table === 'liuyao_divinations') {
                return {
                    select: () => ({
                        eq: () => ({
                            eq: () => ({
                                maybeSingle: async () => ({
                                    data: { created_at: createdAt.toISOString() },
                                    error: null,
                                }),
                            }),
                        }),
                    }),
                    update: () => ({
                        eq: () => ({
                            eq: async () => ({ error: null }),
                        }),
                    }),
                    insert: async () => ({ error: null }),
                };
            }
            if (table === 'conversations') {
                return {
                    insert: () => ({
                        select: () => ({
                            single: async () => ({ data: { id: 'conv-1' }, error: null }),
                        }),
                    }),
                };
            }
            return {
                insert: async () => ({ error: null }),
            };
        },
        rpc: async (fn: string) => {
            if (fn === 'replace_conversation_messages') {
                return { data: null, error: null };
            }
            if (fn === 'increment_ai_chat_count') {
                return { data: 6, error: null };
            }
            return { data: 5, error: null };
        },
    });

    t.after(() => {
        credits.getUserAuthInfo = originalGetUserAuthInfo;
        credits.useCredit = originalUseCredit;
        supabaseModule.supabase.auth.getUser = originalGetUser;
        supabaseServerModule.getSystemAdminClient = originalGetServiceClient;
        aiModule.callAIWithReasoning = originalCallAIWithReasoning;
        liuyaoModule.calculateLiuyaoBundle = originalCalculateLiuyaoBundle;
    });

    const { POST } = await import('../app/api/liuyao/route');

    const request = new NextRequest('http://localhost/api/liuyao', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({
            action: 'interpret',
            divinationId: 'divination-1',
            question: '测试问题',
            yongShenTargets: ['官鬼'],
            hexagram: {
                name: '乾为天',
                code: '111111',
                upperTrigram: '乾',
                lowerTrigram: '乾',
                element: '金',
                nature: '刚健',
            },
            yaos: [
                { type: 1, change: 'stable', position: 1 },
                { type: 1, change: 'stable', position: 2 },
                { type: 1, change: 'stable', position: 3 },
                { type: 1, change: 'stable', position: 4 },
                { type: 1, change: 'stable', position: 5 },
                { type: 1, change: 'stable', position: 6 },
            ],
            changedLines: [],
        }),
    });

    const response = await POST(request);

    assert.equal(response.status, 200);
    assert.ok(capturedDate);
    assert.equal(capturedDate?.toISOString(), createdAt.toISOString());
});

test('liuyao route only marks 用神 when position and liuqin both match', async (t) => {
    const credits = require('../lib/user/credits') as any;
    const supabaseModule = require('../lib/auth') as any;
    const supabaseServerModule = require('../lib/supabase-server') as any;
    const aiModule = require('../lib/ai/ai') as any;
    const aiAnalysisModule = require('../lib/ai/ai-analysis') as any;
    const liuyaoModule = require('../lib/divination/liuyao') as any;

    const originalGetUserAuthInfo = credits.getUserAuthInfo;
    const originalUseCredit = credits.useCredit;
    const originalGetUser = supabaseModule.supabase.auth.getUser;
    const originalGetServiceClient = supabaseServerModule.getSystemAdminClient;
    const originalCallAIWithReasoning = aiModule.callAIWithReasoning;
    const originalCreateConversation = aiAnalysisModule.createAIAnalysisConversation;
    const originalGenerateTitle = aiAnalysisModule.generateLiuyaoTitle;
    const originalPerformFullAnalysis = liuyaoModule.performFullAnalysis;

    let capturedPrompt = '';

    credits.getUserAuthInfo = async () => ({ credits: 10, effectiveMembership: 'pro', hasCredits: true });
    credits.useCredit = async () => 1;
    supabaseModule.supabase.auth.getUser = async () => ({
        data: { user: { id: 'user-1' } },
        error: null,
    });
    aiModule.callAIWithReasoning = async (messages: Array<{ role: string; content: string }>) => {
        capturedPrompt = messages[0]?.content ?? '';
        return { content: 'analysis', reasoning: null };
    };
    aiAnalysisModule.createAIAnalysisConversation = async () => 'conv-1';
    aiAnalysisModule.generateLiuyaoTitle = () => 'title';
    liuyaoModule.performFullAnalysis = (...args: unknown[]) => {
        const result = originalPerformFullAnalysis(...args);
        const firstYaoLiuQin = result.fullYaos?.[0]?.liuQin;
        const fallbackLiuQin = firstYaoLiuQin === '父母' ? '官鬼' : '父母';
        if (result.yongShen?.length > 0) {
            const firstGroup = result.yongShen[0];
            result.yongShen = [{
                ...firstGroup,
                targetLiuQin: fallbackLiuQin,
                selected: {
                    ...firstGroup.selected,
                    position: 1,
                    liuQin: fallbackLiuQin,
                },
            }];
        }
        return result;
    };
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
            if (table === 'liuyao_divinations') {
                return {
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
        supabaseModule.supabase.auth.getUser = originalGetUser;
        supabaseServerModule.getSystemAdminClient = originalGetServiceClient;
        aiModule.callAIWithReasoning = originalCallAIWithReasoning;
        aiAnalysisModule.createAIAnalysisConversation = originalCreateConversation;
        aiAnalysisModule.generateLiuyaoTitle = originalGenerateTitle;
        liuyaoModule.performFullAnalysis = originalPerformFullAnalysis;
    });

    const { POST } = await import('../app/api/liuyao/route');
    const request = new NextRequest('http://localhost/api/liuyao', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({
            action: 'interpret',
            question: '测试问题',
            yongShenTargets: ['父母'],
            hexagram: {
                name: '乾为天',
                code: '111111',
                upperTrigram: '乾',
                lowerTrigram: '乾',
                element: '金',
                nature: '刚健',
            },
            yaos: [
                { type: 1, change: 'stable', position: 1 },
                { type: 1, change: 'stable', position: 2 },
                { type: 1, change: 'stable', position: 3 },
                { type: 1, change: 'stable', position: 4 },
                { type: 1, change: 'stable', position: 5 },
                { type: 1, change: 'stable', position: 6 },
            ],
            changedLines: [],
        }),
    });

    const response = await POST(request);
    assert.equal(response.status, 200);

    const firstLine = capturedPrompt.match(/\| 初[九六] \|[^\n]*/u)?.[0] ?? '';
    assert.ok(firstLine.length > 0, 'should include first yao row in prompt');
    assert.equal(capturedPrompt.includes('【用神】'), false, 'fallback liuqin mismatch should not mark 用神');
});

test('liuyao route persists analysis after streaming completes', async (t) => {
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

    let createArgs: Record<string, unknown> | null = null;
    let updated: Record<string, unknown> | null = null;

    credits.getUserAuthInfo = async () => ({ credits: 10, effectiveMembership: 'pro', hasCredits: true });
    credits.useCredit = async () => 1;
    aiModule.callAIUIMessageResult = async () => ({
        toUIMessageStream(options?: {
            onFinish?: (event: {
                responseMessage: { parts: Array<Record<string, unknown>> };
                finishReason?: string;
                isAborted: boolean;
                isContinuation: boolean;
                messages: Array<{ parts: Array<Record<string, unknown>> }>;
            }) => PromiseLike<void> | void;
        }) {
            const stream = new ReadableStream<Record<string, unknown>>({
                start(controller) {
                    controller.enqueue({ type: 'reasoning-start', id: 'reasoning-1' });
                    controller.enqueue({ type: 'reasoning-delta', id: 'reasoning-1', delta: 'reason' });
                    controller.enqueue({ type: 'reasoning-end', id: 'reasoning-1' });
                    controller.enqueue({ type: 'text-start', id: 'text-1' });
                    controller.enqueue({ type: 'text-delta', id: 'text-1', delta: 'analysis' });
                    controller.enqueue({ type: 'text-end', id: 'text-1' });
                    controller.close();
                },
            });
            queueMicrotask(() => {
                void options?.onFinish?.({
                    responseMessage: {
                        parts: [
                            { type: 'reasoning', text: 'reason', state: 'done' },
                            { type: 'text', text: 'analysis', state: 'done' },
                        ],
                    },
                    finishReason: 'stop',
                    isAborted: false,
                    isContinuation: false,
                    messages: [],
                });
            });
            return stream;
        },
    });
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
            if (table === 'liuyao_divinations') {
                return {
                    select: () => ({
                        eq: () => ({
                            eq: () => ({
                                maybeSingle: async () => ({
                                    data: { created_at: new Date().toISOString() },
                                    error: null,
                                }),
                            }),
                        }),
                    }),
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

    const { POST } = await import('../app/api/liuyao/route');

    const request = new NextRequest('http://localhost/api/liuyao', {
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
            yongShenTargets: ['官鬼'],
            hexagram: {
                name: '乾为天',
                code: '111111',
                upperTrigram: '乾',
                lowerTrigram: '乾',
                element: '金',
                nature: '刚健',
            },
            yaos: [
                { type: 1, change: 'stable', position: 1 },
                { type: 1, change: 'stable', position: 2 },
                { type: 1, change: 'stable', position: 3 },
                { type: 1, change: 'stable', position: 4 },
                { type: 1, change: 'stable', position: 5 },
                { type: 1, change: 'stable', position: 6 },
            ],
            changedLines: [],
        }),
    });

    const response = await POST(request);
    await response.text();
    await new Promise((resolve) => setTimeout(resolve, 0));

    assert.ok(createArgs);
    assert.equal((createArgs as Record<string, unknown>).sourceType, 'liuyao');
    assert.equal((updated as Record<string, unknown> | null)?.conversation_id, 'conv-1');
});

test('liuyao route surfaces SSE error when stream persistence fails after content generation', async (t) => {
    const credits = require('../lib/user/credits') as any;
    const aiModule = require('../lib/ai/ai') as any;
    const aiAnalysisModule = require('../lib/ai/ai-analysis') as any;
    const supabaseModule = require('../lib/auth') as any;
    const supabaseServerModule = require('../lib/supabase-server') as any;

    const originalGetUserAuthInfo = credits.getUserAuthInfo;
    const originalUseCredit = credits.useCredit;
    const originalAddCredits = credits.addCredits;
    const originalCallAIUIMessageResult = aiModule.callAIUIMessageResult;
    const originalCreateConversation = aiAnalysisModule.createAIAnalysisConversation;
    const originalGetUser = supabaseModule.supabase.auth.getUser;
    const originalGetServiceClient = supabaseServerModule.getSystemAdminClient;
    const originalConsoleError = console.error;

    let refundCalls = 0;

    credits.getUserAuthInfo = async () => ({ credits: 10, effectiveMembership: 'pro', hasCredits: true });
    credits.useCredit = async () => 1;
    credits.addCredits = async () => { refundCalls += 1; };
    aiModule.callAIUIMessageResult = async () => ({
        toUIMessageStream(options?: {
            onFinish?: (event: {
                responseMessage: { parts: Array<Record<string, unknown>> };
                finishReason?: string;
                isAborted: boolean;
                isContinuation: boolean;
                messages: Array<{ parts: Array<Record<string, unknown>> }>;
            }) => PromiseLike<void> | void;
        }) {
            const stream = new ReadableStream<Record<string, unknown>>({
                start(controller) {
                    controller.enqueue({ type: 'reasoning-start', id: 'reasoning-1' });
                    controller.enqueue({ type: 'reasoning-delta', id: 'reasoning-1', delta: 'reason' });
                    controller.enqueue({ type: 'reasoning-end', id: 'reasoning-1' });
                    controller.enqueue({ type: 'text-start', id: 'text-1' });
                    controller.enqueue({ type: 'text-delta', id: 'text-1', delta: 'analysis' });
                    controller.enqueue({ type: 'text-end', id: 'text-1' });
                    controller.close();
                },
            });
            queueMicrotask(() => {
                void options?.onFinish?.({
                    responseMessage: {
                        parts: [
                            { type: 'reasoning', text: 'reason', state: 'done' },
                            { type: 'text', text: 'analysis', state: 'done' },
                        ],
                    },
                    finishReason: 'stop',
                    isAborted: false,
                    isContinuation: false,
                    messages: [],
                });
            });
            return stream;
        },
    });
    aiAnalysisModule.createAIAnalysisConversation = async () => {
        throw new Error('persist failed');
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
            if (table === 'liuyao_divinations') {
                return {
                    select: () => ({
                        eq: () => ({
                            eq: () => ({
                                maybeSingle: async () => ({
                                    data: { created_at: new Date().toISOString() },
                                    error: null,
                                }),
                            }),
                        }),
                    }),
                    update: () => ({
                        eq: () => ({
                            eq: async () => ({ error: null }),
                        }),
                    }),
                    insert: async () => ({ error: null }),
                };
            }
            return {
                insert: async () => ({ error: null }),
            };
        },
    });
    console.error = () => {};

    t.after(() => {
        credits.getUserAuthInfo = originalGetUserAuthInfo;
        credits.useCredit = originalUseCredit;
        credits.addCredits = originalAddCredits;
        aiModule.callAIUIMessageResult = originalCallAIUIMessageResult;
        aiAnalysisModule.createAIAnalysisConversation = originalCreateConversation;
        supabaseModule.supabase.auth.getUser = originalGetUser;
        supabaseServerModule.getSystemAdminClient = originalGetServiceClient;
        console.error = originalConsoleError;
    });

    const { POST } = await import('../app/api/liuyao/route');

    const request = new NextRequest('http://localhost/api/liuyao', {
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
            yongShenTargets: ['官鬼'],
            hexagram: {
                name: '乾为天',
                code: '111111',
                upperTrigram: '乾',
                lowerTrigram: '乾',
                element: '金',
                nature: '刚健',
            },
            yaos: [
                { type: 1, change: 'stable', position: 1 },
                { type: 1, change: 'stable', position: 2 },
                { type: 1, change: 'stable', position: 3 },
                { type: 1, change: 'stable', position: 4 },
                { type: 1, change: 'stable', position: 5 },
                { type: 1, change: 'stable', position: 6 },
            ],
            changedLines: [],
        }),
    });

    const response = await POST(request);
    const body = await response.text();

    assert.equal(response.status, 200);
    assert.equal(response.headers.get('x-vercel-ai-ui-message-stream'), 'v1');
    assert.match(body, /"type":"text-delta","id":"text-1","delta":"analysis"/u);
    assert.match(body, /"type":"error","errorText":"保存结果失败，请稍后重试"/u);
    assert.match(body, /\[DONE\]/u);
    assert.equal(refundCalls, 0);
});

test('liuyao route save returns 400 when question is provided but yongShenTargets is missing', async (t) => {
    const supabaseModule = require('../lib/auth') as any;
    const originalGetUser = supabaseModule.supabase.auth.getUser;

    supabaseModule.supabase.auth.getUser = async () => ({
        data: { user: { id: 'user-1' } },
        error: null,
    });

    t.after(() => {
        supabaseModule.supabase.auth.getUser = originalGetUser;
    });

    const { POST } = await import('../app/api/liuyao/route');
    const request = new NextRequest('http://localhost/api/liuyao', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({
            action: 'save',
            question: '测试问题',
            yaos: [
                { type: 1, change: 'stable', position: 1 },
                { type: 1, change: 'stable', position: 2 },
                { type: 1, change: 'stable', position: 3 },
                { type: 1, change: 'stable', position: 4 },
                { type: 1, change: 'stable', position: 5 },
                { type: 1, change: 'stable', position: 6 },
            ],
            changedLines: [],
        }),
    });

    const response = await POST(request);
    const data = await response.json();

    assert.equal(response.status, 400);
    assert.equal(data.error, '请至少选择一个分析目标');
});

test('liuyao route save returns 400 when question is not string', async () => {
    const { POST } = await import('../app/api/liuyao/route');
    const request = new NextRequest('http://localhost/api/liuyao', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({
            action: 'save',
            question: 123,
            yongShenTargets: [],
            yaos: [
                { type: 1, change: 'stable', position: 1 },
                { type: 1, change: 'stable', position: 2 },
                { type: 1, change: 'stable', position: 3 },
                { type: 1, change: 'stable', position: 4 },
                { type: 1, change: 'stable', position: 5 },
                { type: 1, change: 'stable', position: 6 },
            ],
            changedLines: [],
        }),
    });

    const response = await POST(request);
    const data = await response.json();

    assert.equal(response.status, 400);
    assert.equal(data.error, '问题格式错误');
});

test('liuyao route interpret returns 400 when question is provided but yongShenTargets is missing', async (t) => {
    const supabaseModule = require('../lib/auth') as any;
    const originalGetUser = supabaseModule.supabase.auth.getUser;

    supabaseModule.supabase.auth.getUser = async () => ({
        data: { user: { id: 'user-1' } },
        error: null,
    });

    t.after(() => {
        supabaseModule.supabase.auth.getUser = originalGetUser;
    });

    const { POST } = await import('../app/api/liuyao/route');
    const request = new NextRequest('http://localhost/api/liuyao', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({
            action: 'interpret',
            question: '测试问题',
            hexagram: {
                name: '乾为天',
                code: '111111',
                upperTrigram: '乾',
                lowerTrigram: '乾',
                element: '金',
                nature: '刚健',
            },
            yaos: [
                { type: 1, change: 'stable', position: 1 },
                { type: 1, change: 'stable', position: 2 },
                { type: 1, change: 'stable', position: 3 },
                { type: 1, change: 'stable', position: 4 },
                { type: 1, change: 'stable', position: 5 },
                { type: 1, change: 'stable', position: 6 },
            ],
            changedLines: [],
        }),
    });

    const response = await POST(request);
    const data = await response.json();

    assert.equal(response.status, 400);
    assert.equal(data.error, '请至少选择一个分析目标');
});

test('liuyao route interpret enforces targets when persisted question exists but request question is empty', async (t) => {
    const credits = require('../lib/user/credits') as any;
    const supabaseModule = require('../lib/auth') as any;
    const supabaseServerModule = require('../lib/supabase-server') as any;
    const originalGetUserAuthInfo = credits.getUserAuthInfo;
    const originalGetUser = supabaseModule.supabase.auth.getUser;
    const originalGetServiceClient = supabaseServerModule.getSystemAdminClient;

    credits.getUserAuthInfo = async () => ({ credits: 0, effectiveMembership: 'pro', hasCredits: false });
    supabaseModule.supabase.auth.getUser = async () => ({
        data: { user: { id: 'user-1' } },
        error: null,
    });
    supabaseServerModule.getSystemAdminClient = () => ({
        from: (table: string) => {
            if (table === 'liuyao_divinations') {
                return {
                    select: () => ({
                        eq: () => ({
                            eq: () => ({
                                maybeSingle: async () => ({
                                    data: {
                                        created_at: new Date().toISOString(),
                                        question: '这次考试是否顺利',
                                        yongshen_targets: null,
                                    },
                                    error: null,
                                }),
                            }),
                        }),
                    }),
                };
            }
            return {
                select: () => ({
                    eq: () => ({
                        single: async () => ({
                            data: { ai_chat_count: 0, membership: 'pro', last_credit_restore_at: null, membership_expires_at: null },
                            error: null,
                        }),
                        maybeSingle: async () => ({
                            data: { membership: 'pro', membership_expires_at: null },
                            error: null,
                        }),
                    }),
                }),
            };
        },
    });

    t.after(() => {
        credits.getUserAuthInfo = originalGetUserAuthInfo;
        supabaseModule.supabase.auth.getUser = originalGetUser;
        supabaseServerModule.getSystemAdminClient = originalGetServiceClient;
    });

    const { POST } = await import('../app/api/liuyao/route');
    const request = new NextRequest('http://localhost/api/liuyao', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({
            action: 'interpret',
            divinationId: 'divination-1',
            question: '',
            hexagram: {
                name: '乾为天',
                code: '111111',
                upperTrigram: '乾',
                lowerTrigram: '乾',
                element: '金',
                nature: '刚健',
            },
            yaos: [
                { type: 1, change: 'stable', position: 1 },
                { type: 1, change: 'stable', position: 2 },
                { type: 1, change: 'stable', position: 3 },
                { type: 1, change: 'stable', position: 4 },
                { type: 1, change: 'stable', position: 5 },
                { type: 1, change: 'stable', position: 6 },
            ],
            changedLines: [],
        }),
    });

    const response = await POST(request);
    const data = await response.json();

    assert.equal(response.status, 400);
    assert.equal(data.error, '请至少选择一个分析目标');
});

test('liuyao route save allows missing yongShenTargets when question is empty', async (t) => {
    const supabaseModule = require('../lib/auth') as any;
    const supabaseServerModule = require('../lib/supabase-server') as any;
    const originalGetUser = supabaseModule.supabase.auth.getUser;
    const originalGetServiceClient = supabaseServerModule.getSystemAdminClient;

    supabaseModule.supabase.auth.getUser = async () => ({
        data: { user: { id: 'user-1' } },
        error: null,
    });
    supabaseServerModule.getSystemAdminClient = () => ({
        from: () => ({
            insert: () => ({
                select: () => ({
                    single: async () => ({ data: { id: 'divination-1' }, error: null }),
                }),
            }),
        }),
    });

    t.after(() => {
        supabaseModule.supabase.auth.getUser = originalGetUser;
        supabaseServerModule.getSystemAdminClient = originalGetServiceClient;
    });

    const { POST } = await import('../app/api/liuyao/route');
    const request = new NextRequest('http://localhost/api/liuyao', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({
            action: 'save',
            question: '',
            yaos: [
                { type: 1, change: 'stable', position: 1 },
                { type: 1, change: 'stable', position: 2 },
                { type: 1, change: 'stable', position: 3 },
                { type: 1, change: 'stable', position: 4 },
                { type: 1, change: 'stable', position: 5 },
                { type: 1, change: 'stable', position: 6 },
            ],
            changedLines: [],
        }),
    });

    const response = await POST(request);
    const data = await response.json();

    assert.equal(response.status, 200);
    assert.equal(data.success, true);
});

test('liuyao route rejects interpret when question is empty and persisted question is missing', async (t) => {
    const credits = require('../lib/user/credits') as any;
    const aiModule = require('../lib/ai/ai') as any;
    const aiAnalysisModule = require('../lib/ai/ai-analysis') as any;
    const supabaseModule = require('../lib/auth') as any;
    const supabaseServerModule = require('../lib/supabase-server') as any;

    const originalGetUserAuthInfo = credits.getUserAuthInfo;
    const originalUseCredit = credits.useCredit;
    const originalCallAIWithReasoning = aiModule.callAIWithReasoning;
    const originalCreateConversation = aiAnalysisModule.createAIAnalysisConversation;
    const originalGetUser = supabaseModule.supabase.auth.getUser;
    const originalGetServiceClient = supabaseServerModule.getSystemAdminClient;

    let updated: Record<string, unknown> | null = null;

    credits.getUserAuthInfo = async () => ({ credits: 10, effectiveMembership: 'pro', hasCredits: true });
    credits.useCredit = async () => 1;
    aiModule.callAIWithReasoning = async () => ({ content: 'analysis', reasoning: null });
    aiAnalysisModule.createAIAnalysisConversation = async () => 'conv-1';
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
            if (table === 'liuyao_divinations') {
                return {
                    select: () => ({
                        eq: () => ({
                            eq: () => ({
                                maybeSingle: async () => ({
                                    data: { created_at: new Date().toISOString() },
                                    error: null,
                                }),
                            }),
                        }),
                    }),
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
        aiModule.callAIWithReasoning = originalCallAIWithReasoning;
        aiAnalysisModule.createAIAnalysisConversation = originalCreateConversation;
        supabaseModule.supabase.auth.getUser = originalGetUser;
        supabaseServerModule.getSystemAdminClient = originalGetServiceClient;
    });

    const { POST } = await import('../app/api/liuyao/route');
    const request = new NextRequest('http://localhost/api/liuyao', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({
            action: 'interpret',
            question: '',
            divinationId: 'divination-1',
            hexagram: {
                name: '乾为天',
                code: '111111',
                upperTrigram: '乾',
                lowerTrigram: '乾',
                element: '金',
                nature: '刚健',
            },
            yaos: [
                { type: 1, change: 'stable', position: 1 },
                { type: 1, change: 'stable', position: 2 },
                { type: 1, change: 'stable', position: 3 },
                { type: 1, change: 'stable', position: 4 },
                { type: 1, change: 'stable', position: 5 },
                { type: 1, change: 'stable', position: 6 },
            ],
            changedLines: [],
        }),
    });

    const response = await POST(request);
    const data = await response.json();
    assert.equal(response.status, 400);
    assert.equal(data.error, '请先明确问题后再解卦');
    assert.equal(updated, null);
});

test('liuyao route update returns 404 when no record is updated', async (t) => {
    const supabaseModule = require('../lib/auth') as any;
    const supabaseServerModule = require('../lib/supabase-server') as any;
    const originalGetUser = supabaseModule.supabase.auth.getUser;
    const originalGetServiceClient = supabaseServerModule.getSystemAdminClient;

    supabaseModule.supabase.auth.getUser = async () => ({
        data: { user: { id: 'user-1' } },
        error: null,
    });

    supabaseServerModule.getSystemAdminClient = () => ({
        from: () => {
            const builder: Record<string, unknown> = {};
            builder.eq = () => builder;
            builder.select = async () => ({ data: [], error: null });
            builder.update = () => builder;
            return builder;
        },
    });

    t.after(() => {
        supabaseModule.supabase.auth.getUser = originalGetUser;
        supabaseServerModule.getSystemAdminClient = originalGetServiceClient;
    });

    const { POST } = await import('../app/api/liuyao/route');
    const request = new NextRequest('http://localhost/api/liuyao', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({
            action: 'update',
            divinationId: 'missing-id',
            yongShenTargets: ['官鬼'],
        }),
    });

    const response = await POST(request);
    assert.equal(response.status, 404);
});
