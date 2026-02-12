import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';

process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon';

test('community posts rejects when user context missing', async (t) => {
    const apiUtils = require('../lib/api-utils') as any;
    const originalRequireUserContext = apiUtils.requireUserContext;

    apiUtils.requireUserContext = async () => ({
        error: { message: '请先登录', status: 401 },
    });

    t.after(() => {
        apiUtils.requireUserContext = originalRequireUserContext;
    });

    const { POST } = await import('../app/api/community/posts/route');
    const request = new NextRequest('http://localhost/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 't', content: 'c' }),
    });

    const response = await POST(request);
    const payload = await response.json();

    assert.equal(response.status, 401);
    assert.equal(payload.error, '请先登录');
});

test('community votes rejects when user context missing', async (t) => {
    const apiUtils = require('../lib/api-utils') as any;
    const originalRequireUserContext = apiUtils.requireUserContext;

    apiUtils.requireUserContext = async () => ({
        error: { message: '请先登录', status: 401 },
    });

    t.after(() => {
        apiUtils.requireUserContext = originalRequireUserContext;
    });

    const { POST } = await import('../app/api/community/votes/route');
    const request = new NextRequest('http://localhost/api/community/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetType: 'post', targetId: '1', voteType: 'up' }),
    });

    const response = await POST(request);
    const payload = await response.json();

    assert.equal(response.status, 401);
    assert.equal(payload.error, '请先登录');
});
