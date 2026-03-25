import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { ensureRouteTestEnv } from './helpers/route-mock';

ensureRouteTestEnv();

test('chat title route surfaces AI errors instead of returning fallback title', async (t) => {
    const apiUtils = require('../lib/api-utils') as any;
    const aiModule = require('../lib/ai/ai') as any;
    const rateLimitModule = require('../lib/rate-limit') as any;

    const originalRequireBearerUser = apiUtils.requireBearerUser;
    const originalCallAI = aiModule.callAI;
    const originalCheckRateLimit = rateLimitModule.checkRateLimit;
    const originalGetClientIP = rateLimitModule.getClientIP;

    apiUtils.requireBearerUser = async () => ({ user: { id: 'user-1' } });
    aiModule.callAI = async () => {
        throw new Error('upstream exploded');
    };
    rateLimitModule.checkRateLimit = async () => ({ allowed: true });
    rateLimitModule.getClientIP = () => '127.0.0.1';

    t.after(() => {
        apiUtils.requireBearerUser = originalRequireBearerUser;
        aiModule.callAI = originalCallAI;
        rateLimitModule.checkRateLimit = originalCheckRateLimit;
        rateLimitModule.getClientIP = originalGetClientIP;
    });

    const { POST } = await import('../app/api/chat/title/route');
    const request = new NextRequest('http://localhost/api/chat/title', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token',
        },
        body: JSON.stringify({
            messages: [{
                id: 'msg-1',
                role: 'user',
                content: '帮我起一个标题',
                createdAt: new Date().toISOString(),
            }],
        }),
    });

    const response = await POST(request);
    const payload = await response.json();

    assert.equal(response.status, 500);
    assert.equal(payload.success, false);
    assert.equal(payload.error, '标题生成失败，请稍后重试');
});
