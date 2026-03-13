import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';

process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon';
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

test('liuyao route returns error when credit deduction fails', async (t) => {
    const credits = require('../lib/user/credits') as any;
    const supabaseModule = require('../lib/supabase') as any;
    const supabaseServerModule = require('../lib/supabase-server') as any;
    const consoleCapture = captureConsoleErrors();

    const originalGetUserAuthInfo = credits.getUserAuthInfo;
    const originalUseCredit = credits.useCredit;
    const originalFetch = global.fetch;
    const originalGetUser = supabaseModule.supabase.auth.getUser;
    const originalGetServiceClient = supabaseServerModule.getServiceClient;

    credits.getUserAuthInfo = async () => ({ credits: 10, effectiveMembership: 'free', hasCredits: true });
    credits.useCredit = async () => null;
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
        supabaseServerModule.getServiceClient = originalGetServiceClient;
        global.fetch = originalFetch;
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
    const data = await response.json();

    const hasMembershipWarning = consoleCapture.errors.some((line) =>
        line.includes('[membership] Failed') ||
        line.includes('[supabase-server] Missing Supabase service configuration')
    );
    assert.equal(hasMembershipWarning, false);
    assert.equal(response.status, 500);
    assert.equal(data.error, '积分扣减失败，请稍后重试');
});

test('liuyao route uses divination created_at for analysis date', async (t) => {
    const credits = require('../lib/user/credits') as any;
    const supabaseModule = require('../lib/supabase') as any;
    const supabaseServerModule = require('../lib/supabase-server') as any;
    const aiModule = require('../lib/ai/ai') as any;
    const liuyaoModule = require('../lib/divination/liuyao') as any;

    const originalGetUserAuthInfo = credits.getUserAuthInfo;
    const originalUseCredit = credits.useCredit;
    const originalGetUser = supabaseModule.supabase.auth.getUser;
    const originalGetServiceClient = supabaseServerModule.getServiceClient;
    const originalCallAIWithReasoning = aiModule.callAIWithReasoning;
    const originalPerformFullAnalysis = liuyaoModule.performFullAnalysis;

    const createdAt = new Date('2024-01-02T03:04:05.000Z');
    let capturedDate: Date | undefined;

    credits.getUserAuthInfo = async () => ({ credits: 10, effectiveMembership: 'pro', hasCredits: true });
    credits.useCredit = async () => 5;
    supabaseModule.supabase.auth.getUser = async () => ({
        data: { user: { id: 'user-1' } },
        error: null,
    });
    aiModule.callAIWithReasoning = async () => ({ content: 'analysis' });
    liuyaoModule.performFullAnalysis = (...args: unknown[]) => {
        capturedDate = args[4] as Date;
        return originalPerformFullAnalysis(...args);
    };

    supabaseServerModule.getServiceClient = () => ({
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
    });

    t.after(() => {
        credits.getUserAuthInfo = originalGetUserAuthInfo;
        credits.useCredit = originalUseCredit;
        supabaseModule.supabase.auth.getUser = originalGetUser;
        supabaseServerModule.getServiceClient = originalGetServiceClient;
        aiModule.callAIWithReasoning = originalCallAIWithReasoning;
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
    const supabaseModule = require('../lib/supabase') as any;
    const supabaseServerModule = require('../lib/supabase-server') as any;
    const aiModule = require('../lib/ai/ai') as any;
    const aiAnalysisModule = require('../lib/ai/ai-analysis') as any;
    const liuyaoModule = require('../lib/divination/liuyao') as any;

    const originalGetUserAuthInfo = credits.getUserAuthInfo;
    const originalUseCredit = credits.useCredit;
    const originalGetUser = supabaseModule.supabase.auth.getUser;
    const originalGetServiceClient = supabaseServerModule.getServiceClient;
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
    supabaseServerModule.getServiceClient = () => ({
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
        supabaseServerModule.getServiceClient = originalGetServiceClient;
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

    const firstLine = capturedPrompt.match(/初[九六]：[^\n]*/)?.[0] ?? '';
    assert.ok(firstLine.length > 0, 'should include first yao line in prompt');
    assert.equal(firstLine.includes('【用神】'), false, 'fallback liuqin mismatch should not mark 用神');
});

test('liuyao route persists analysis after streaming completes', async (t) => {
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
    supabaseServerModule.getServiceClient = () => ({
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
        aiModule.callAIStream = originalCallAIStream;
        aiAnalysisModule.createAIAnalysisConversation = originalCreateConversation;
        supabaseModule.supabase.auth.getUser = originalGetUser;
        supabaseServerModule.getServiceClient = originalGetServiceClient;
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

test('liuyao route save returns 400 when question is provided but yongShenTargets is missing', async (t) => {
    const supabaseModule = require('../lib/supabase') as any;
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
    const supabaseModule = require('../lib/supabase') as any;
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
    const supabaseModule = require('../lib/supabase') as any;
    const supabaseServerModule = require('../lib/supabase-server') as any;
    const originalGetUserAuthInfo = credits.getUserAuthInfo;
    const originalGetUser = supabaseModule.supabase.auth.getUser;
    const originalGetServiceClient = supabaseServerModule.getServiceClient;

    credits.getUserAuthInfo = async () => ({ credits: 0, effectiveMembership: 'pro', hasCredits: false });
    supabaseModule.supabase.auth.getUser = async () => ({
        data: { user: { id: 'user-1' } },
        error: null,
    });
    supabaseServerModule.getServiceClient = () => ({
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
        supabaseServerModule.getServiceClient = originalGetServiceClient;
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
    const supabaseModule = require('../lib/supabase') as any;
    const supabaseServerModule = require('../lib/supabase-server') as any;
    const originalGetUser = supabaseModule.supabase.auth.getUser;
    const originalGetServiceClient = supabaseServerModule.getServiceClient;

    supabaseModule.supabase.auth.getUser = async () => ({
        data: { user: { id: 'user-1' } },
        error: null,
    });
    supabaseServerModule.getServiceClient = () => ({
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
        supabaseServerModule.getServiceClient = originalGetServiceClient;
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
    const supabaseModule = require('../lib/supabase') as any;
    const supabaseServerModule = require('../lib/supabase-server') as any;

    const originalGetUserAuthInfo = credits.getUserAuthInfo;
    const originalUseCredit = credits.useCredit;
    const originalCallAIWithReasoning = aiModule.callAIWithReasoning;
    const originalCreateConversation = aiAnalysisModule.createAIAnalysisConversation;
    const originalGetUser = supabaseModule.supabase.auth.getUser;
    const originalGetServiceClient = supabaseServerModule.getServiceClient;

    let updated: Record<string, unknown> | null = null;

    credits.getUserAuthInfo = async () => ({ credits: 10, effectiveMembership: 'pro', hasCredits: true });
    credits.useCredit = async () => 1;
    aiModule.callAIWithReasoning = async () => ({ content: 'analysis', reasoning: null });
    aiAnalysisModule.createAIAnalysisConversation = async () => 'conv-1';
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
        supabaseServerModule.getServiceClient = originalGetServiceClient;
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
    const supabaseModule = require('../lib/supabase') as any;
    const supabaseServerModule = require('../lib/supabase-server') as any;
    const originalGetUser = supabaseModule.supabase.auth.getUser;
    const originalGetServiceClient = supabaseServerModule.getServiceClient;

    supabaseModule.supabase.auth.getUser = async () => ({
        data: { user: { id: 'user-1' } },
        error: null,
    });

    supabaseServerModule.getServiceClient = () => ({
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
        supabaseServerModule.getServiceClient = originalGetServiceClient;
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
