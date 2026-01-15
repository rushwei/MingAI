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

test('tarot route uses schema column names when inserting history', async (t) => {
    const credits = require('../lib/credits') as any;
    const supabaseModule = require('../lib/supabase') as any;
    const supabaseServerModule = require('../lib/supabase-server') as any;
    const consoleCapture = captureConsoleErrors();

    const originalHasCredits = credits.hasCredits;
    const originalUseCredit = credits.useCredit;
    const originalFetch = global.fetch;
    const originalGetUser = supabaseModule.supabase.auth.getUser;
    const originalGetServiceClient = supabaseServerModule.getServiceClient;

    let inserted: Record<string, unknown> | null = null;
    const fakeClient = {
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
    };

    credits.hasCredits = async () => true;
    credits.useCredit = async () => 1;
    supabaseModule.supabase.auth.getUser = async () => ({
        data: { user: { id: 'user-1' } },
        error: null,
    });
    supabaseServerModule.getServiceClient = () => fakeClient;
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
