import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { ensureRouteTestEnv } from './helpers/route-mock';
import { createMockUIMessageResult } from './helpers/ui-message-result';

ensureRouteTestEnv();

type RouteBindingSpec = {
    name: string;
    routeModulePath: string;
    url: string;
    buildBody: () => Record<string, unknown>;
    assertCreateArgs: (createArgs: Record<string, unknown>) => void;
};

async function runRouteHistoryBindingTest(t: TestContext, spec: RouteBindingSpec) {
    const credits = require('../lib/user/credits') as any;
    const aiModule = require('../lib/ai/ai') as any;
    const aiAnalysisModule = require('../lib/ai/ai-analysis') as any;
    const supabaseModule = require('../lib/auth') as any;

    const originalGetUserAuthInfo = credits.getUserAuthInfo;
    const originalUseCredit = credits.useCredit;
    const originalCallAIUIMessageResult = aiModule.callAIUIMessageResult;
    const originalCreateConversation = aiAnalysisModule.createAIAnalysisConversation;
    const originalGetUser = supabaseModule.supabase.auth.getUser;
    const routePath = require.resolve(spec.routeModulePath);

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
    delete require.cache[routePath];

    t.after(() => {
        credits.getUserAuthInfo = originalGetUserAuthInfo;
        credits.useCredit = originalUseCredit;
        aiModule.callAIUIMessageResult = originalCallAIUIMessageResult;
        aiAnalysisModule.createAIAnalysisConversation = originalCreateConversation;
        supabaseModule.supabase.auth.getUser = originalGetUser;
        delete require.cache[routePath];
    });

    const { POST } = require(spec.routeModulePath) as { POST: (request: NextRequest) => Promise<Response> };
    const response = await POST(new NextRequest(spec.url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify(spec.buildBody()),
    }));

    await response.text();
    await new Promise((resolve) => setTimeout(resolve, 0));

    assert.equal(response.headers.get('x-vercel-ai-ui-message-stream'), 'v1');
    assert.ok(createArgs, `${spec.name} route should create a conversation`);
    spec.assertCreateArgs(createArgs as Record<string, unknown>);
}

const routeSpecs: RouteBindingSpec[] = [
    {
        name: 'mbti',
        routeModulePath: '../app/api/mbti/route',
        url: 'http://localhost/api/mbti',
        buildBody: () => ({
            action: 'analyze',
            stream: true,
            readingId: 'reading-1',
            type: 'INTJ',
            scores: { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 },
            percentages: {
                EI: { E: 50, I: 50 },
                SN: { S: 50, N: 50 },
                TF: { T: 50, F: 50 },
                JP: { J: 50, P: 50 },
            },
        }),
        assertCreateArgs: (createArgs) => {
            const historyBinding = createArgs.historyBinding as { type?: string; payload?: Record<string, unknown> } | undefined;
            assert.equal(createArgs.sourceType, 'mbti');
            assert.equal(historyBinding?.type, 'mbti');
            assert.equal(historyBinding?.payload?.reading_id, 'reading-1');
        },
    },
    {
        name: 'hepan',
        routeModulePath: '../app/api/hepan/route',
        url: 'http://localhost/api/hepan',
        buildBody: () => ({
            action: 'analyze',
            stream: true,
            chartId: 'chart-1',
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
        assertCreateArgs: (createArgs) => {
            const historyBinding = createArgs.historyBinding as { type?: string; payload?: Record<string, unknown> } | undefined;
            assert.equal(createArgs.sourceType, 'hepan');
            assert.equal(historyBinding?.type, 'hepan');
            assert.equal(historyBinding?.payload?.chart_id, 'chart-1');
        },
    },
    {
        name: 'daliuren',
        routeModulePath: '../app/api/daliuren/route',
        url: 'http://localhost/api/daliuren',
        buildBody: () => {
            const { calculateDaliuren } = require('@mingai/core') as typeof import('@mingai/core');
            return {
                action: 'interpret',
                stream: true,
                divinationId: 'divination-1',
                question: '测试问题',
                resultData: calculateDaliuren({
                    date: '2025-01-15',
                    hour: 10,
                    minute: 30,
                    timezone: 'Asia/Shanghai',
                    question: '测试问题',
                }),
            };
        },
        assertCreateArgs: (createArgs) => {
            const historyBinding = createArgs.historyBinding as { type?: string; payload?: Record<string, unknown> } | undefined;
            assert.equal(createArgs.sourceType, 'daliuren');
            assert.equal(historyBinding?.type, 'daliuren');
            assert.equal(historyBinding?.payload?.divination_id, 'divination-1');
        },
    },
];

for (const spec of routeSpecs) {
    test(`${spec.name} route persists analysis after streaming completes`, async (t) => {
        await runRouteHistoryBindingTest(t, spec);
    });
}
