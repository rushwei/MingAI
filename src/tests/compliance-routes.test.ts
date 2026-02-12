import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';

process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon';

test('notifications launch returns admin-context auth error', async (t) => {
    const apiUtils = require('../lib/api-utils') as any;
    const originalRequireAdminContext = apiUtils.requireAdminContext;

    apiUtils.requireAdminContext = async () => ({
        error: { message: '无权限操作', status: 403 },
    });

    t.after(() => {
        apiUtils.requireAdminContext = originalRequireAdminContext;
    });

    const { POST } = await import('../app/api/notifications/launch/route');
    const request = new NextRequest('http://localhost/api/notifications/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            featureKey: 'fortune-hub',
            featureUrl: '/fortune-hub',
        }),
    });

    const response = await POST(request);
    const payload = await response.json();

    assert.equal(response.status, 403);
    assert.equal(payload.error, '无权限操作');
});

test('dream-context uses requireUserContext auth error', async (t) => {
    const apiUtils = require('../lib/api-utils') as any;
    const originalRequireUserContext = apiUtils.requireUserContext;

    apiUtils.requireUserContext = async () => ({
        error: { message: '请先登录', status: 401 },
    });

    t.after(() => {
        apiUtils.requireUserContext = originalRequireUserContext;
    });

    const { GET } = await import('../app/api/dream-context/route');
    const request = new NextRequest('http://localhost/api/dream-context');
    const response = await GET(request);
    const payload = await response.json();

    assert.equal(response.status, 401);
    assert.equal(payload.error, '请先登录');
});

test('payment-status post returns admin auth error from helper', async (t) => {
    const apiUtils = require('../lib/api-utils') as any;
    const originalRequireAdminUser = apiUtils.requireAdminUser;

    apiUtils.requireAdminUser = async () => ({
        error: { message: '无权限操作', status: 403 },
    });

    t.after(() => {
        apiUtils.requireAdminUser = originalRequireAdminUser;
    });

    const { POST } = await import('../app/api/payment-status/route');
    const request = new NextRequest('http://localhost/api/payment-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paused: true }),
    });

    const response = await POST(request);
    const payload = await response.json();

    assert.equal(response.status, 403);
    assert.equal(payload.error, '无权限操作');
});

test('activation-keys get returns standardized auth error', async (t) => {
    const apiUtils = require('../lib/api-utils') as any;
    const originalRequireAdminUser = apiUtils.requireAdminUser;

    apiUtils.requireAdminUser = async () => ({
        error: { message: '请先登录', status: 401 },
    });

    t.after(() => {
        apiUtils.requireAdminUser = originalRequireAdminUser;
    });

    const { GET } = await import('../app/api/activation-keys/route');
    const request = new NextRequest('http://localhost/api/activation-keys');
    const response = await GET(request);
    const payload = await response.json();

    assert.equal(response.status, 401);
    assert.equal(payload.error, '请先登录');
    assert.equal('success' in payload, false);
});

test('activation-keys activate rejects non-string keyCode with 400', async (t) => {
    const apiUtils = require('../lib/api-utils') as any;
    const originalRequireBearerUser = apiUtils.requireBearerUser;

    apiUtils.requireBearerUser = async () => ({
        user: { id: 'user-1' },
        profile: null,
    });

    t.after(() => {
        apiUtils.requireBearerUser = originalRequireBearerUser;
    });

    const { POST } = await import('../app/api/activation-keys/route');
    const request = new NextRequest('http://localhost/api/activation-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'activate', keyCode: 123 }),
    });

    const response = await POST(request);
    const payload = await response.json();

    assert.equal(response.status, 400);
    assert.equal(payload.error, '请输入激活码');
});

test('chat route returns requireUserContext auth error for non-internal requests', async (t) => {
    const apiUtils = require('../lib/api-utils') as any;
    const originalRequireUserContext = apiUtils.requireUserContext;

    apiUtils.requireUserContext = async () => ({
        error: { message: '请先登录', status: 401 },
    });

    t.after(() => {
        apiUtils.requireUserContext = originalRequireUserContext;
    });

    const { POST } = await import('../app/api/chat/route');
    const request = new NextRequest('http://localhost/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            stream: false,
            messages: [
                {
                    id: 'm1',
                    role: 'user',
                    content: '你好',
                    createdAt: new Date().toISOString(),
                },
            ],
        }),
    });

    const response = await POST(request);
    const payload = await response.json();

    assert.equal(response.status, 401);
    assert.equal(payload.error, '请先登录');
});

test('data-sources route uses requireUserContext auth error', async (t) => {
    const apiUtils = require('../lib/api-utils') as any;
    const originalRequireUserContext = apiUtils.requireUserContext;

    apiUtils.requireUserContext = async () => ({
        error: { message: 'AUTH_FROM_HELPER', status: 401 },
    });

    t.after(() => {
        apiUtils.requireUserContext = originalRequireUserContext;
    });

    const { GET } = await import('../app/api/data-sources/route');
    const request = new NextRequest('http://localhost/api/data-sources');
    const response = await GET(request);
    const payload = await response.json();

    assert.equal(response.status, 401);
    assert.equal(payload.error, 'AUTH_FROM_HELPER');
});

test('data-source detail route uses requireUserContext auth error', async (t) => {
    const apiUtils = require('../lib/api-utils') as any;
    const originalRequireUserContext = apiUtils.requireUserContext;

    apiUtils.requireUserContext = async () => ({
        error: { message: 'AUTH_FROM_HELPER', status: 401 },
    });

    t.after(() => {
        apiUtils.requireUserContext = originalRequireUserContext;
    });

    const { GET } = await import('../app/api/data-sources/[type]/[id]/route');
    const request = new NextRequest('http://localhost/api/data-sources/bazi/1');
    const response = await GET(request, { params: Promise.resolve({ type: 'bazi', id: '1' }) });
    const payload = await response.json();

    assert.equal(response.status, 401);
    assert.equal(payload.error, 'AUTH_FROM_HELPER');
});

test('knowledge-base search route uses requireUserContext auth error', async (t) => {
    const apiUtils = require('../lib/api-utils') as any;
    const originalRequireUserContext = apiUtils.requireUserContext;

    apiUtils.requireUserContext = async () => ({
        error: { message: 'AUTH_FROM_HELPER', status: 401 },
    });

    t.after(() => {
        apiUtils.requireUserContext = originalRequireUserContext;
    });

    const { POST } = await import('../app/api/knowledge-base/search/route');
    const request = new NextRequest('http://localhost/api/knowledge-base/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'test' }),
    });

    const response = await POST(request);
    const payload = await response.json();

    assert.equal(response.status, 401);
    assert.equal(payload.error, 'AUTH_FROM_HELPER');
});

test('knowledge-base search rejects non-string query with 400', async (t) => {
    const apiUtils = require('../lib/api-utils') as any;
    const searchModule = require('../lib/knowledge-base/search') as any;
    const originalRequireUserContext = apiUtils.requireUserContext;
    const originalGetAccessToken = apiUtils.getAccessToken;
    const originalSearchKnowledge = searchModule.searchKnowledge;
    let called = false;

    apiUtils.requireUserContext = async () => ({
        user: { id: 'user-1' },
        profile: null,
    });
    apiUtils.getAccessToken = async () => null;
    searchModule.searchKnowledge = async () => {
        called = true;
        return [];
    };

    t.after(() => {
        apiUtils.requireUserContext = originalRequireUserContext;
        apiUtils.getAccessToken = originalGetAccessToken;
        searchModule.searchKnowledge = originalSearchKnowledge;
    });

    const { POST } = await import('../app/api/knowledge-base/search/route');
    const request = new NextRequest('http://localhost/api/knowledge-base/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 123 }),
    });

    const response = await POST(request);
    const payload = await response.json();

    assert.equal(response.status, 400);
    assert.equal(payload.error, 'query 不能为空');
    assert.equal(called, false);
});
