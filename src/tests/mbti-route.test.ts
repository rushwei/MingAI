import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';

process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon';
process.env.DEEPSEEK_API_KEY = 'test-key';

test('mbti route returns error when credit deduction fails', async (t) => {
    const credits = require('../lib/credits') as any;
    const supabaseModule = require('../lib/supabase') as any;

    const originalHasCredits = credits.hasCredits;
    const originalUseCredit = credits.useCredit;
    const originalFetch = global.fetch;
    const originalGetUser = supabaseModule.supabase.auth.getUser;

    credits.hasCredits = async () => true;
    credits.useCredit = async () => null;
    supabaseModule.supabase.auth.getUser = async () => ({
        data: { user: { id: 'user-1' } },
        error: null,
    });
    global.fetch = async () => ({
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'analysis' } }] }),
    } as any);

    t.after(() => {
        credits.hasCredits = originalHasCredits;
        credits.useCredit = originalUseCredit;
        supabaseModule.supabase.auth.getUser = originalGetUser;
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

    assert.equal(response.status, 500);
    assert.equal(data.error, '积分扣减失败，请稍后重试');
});
