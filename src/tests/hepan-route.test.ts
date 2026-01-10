import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';

process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service';
process.env.DEEPSEEK_API_KEY = 'test-key';

test('hepan route returns error when credit deduction fails', async (t) => {
    const credits = require('../lib/credits') as any;
    const supabaseModule = require('../lib/supabase') as any;
    const supabaseServerModule = require('../lib/supabase-server') as any;

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
            insert: async () => ({ error: null }),
        }),
    });
    global.fetch = async () => ({
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'analysis' } }] }),
    } as any);

    t.after(() => {
        credits.hasCredits = originalHasCredits;
        credits.useCredit = originalUseCredit;
        supabaseModule.supabase.auth.getUser = originalGetUser;
        supabaseServerModule.getServiceClient = originalGetServiceClient;
        global.fetch = originalFetch;
    });

    const { POST } = await import('../app/api/hepan/route');

    const request = new NextRequest('http://localhost/api/hepan', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({
            action: 'analyze',
            result: {
                type: 'love',
                person1: { name: 'A', year: 1990, month: 1, day: 1, hour: 1 },
                person2: { name: 'B', year: 1991, month: 2, day: 2, hour: 2 },
                overallScore: 80,
                dimensions: [{ name: '测试', score: 80, description: 'ok' }],
                conflicts: [],
                createdAt: new Date(),
            },
        }),
    });

    const response = await POST(request);
    const data = await response.json();

    assert.equal(response.status, 500);
    assert.equal(data.error, '积分扣减失败，请稍后重试');
});
