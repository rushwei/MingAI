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

test('liuyao route returns error when credit deduction fails', async (t) => {
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
        from: (table: string) => {
            if (table === 'users') {
                return {
                    select: () => ({
                        eq: () => ({
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
        credits.hasCredits = originalHasCredits;
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
    const credits = require('../lib/credits') as any;
    const supabaseModule = require('../lib/supabase') as any;
    const supabaseServerModule = require('../lib/supabase-server') as any;
    const aiModule = require('../lib/ai') as any;
    const liuyaoModule = require('../lib/liuyao') as any;

    const originalHasCredits = credits.hasCredits;
    const originalUseCredit = credits.useCredit;
    const originalGetUser = supabaseModule.supabase.auth.getUser;
    const originalGetServiceClient = supabaseServerModule.getServiceClient;
    const originalCallAIWithReasoning = aiModule.callAIWithReasoning;
    const originalPerformFullAnalysis = liuyaoModule.performFullAnalysis;

    const createdAt = new Date('2024-01-02T03:04:05.000Z');
    let capturedDate: Date | undefined;

    credits.hasCredits = async () => true;
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
        credits.hasCredits = originalHasCredits;
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
