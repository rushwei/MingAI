import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';

process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon';
process.env.INTERNAL_API_SECRET = 'internal-secret';

const waitForMicrotask = () => new Promise((resolve) => setTimeout(resolve, 0));

interface MockState {
    useCreditCalls: number;
    addCreditCalls: number;
}

function createSseStream(events: string[]): ReadableStream<Uint8Array> {
    const encoder = new TextEncoder();
    return new ReadableStream<Uint8Array>({
        start(controller) {
            for (const event of events) {
                controller.enqueue(encoder.encode(event));
            }
            controller.close();
        },
    });
}

function setupRouteMocks(
    t: { after: (fn: () => void) => void },
    streamBody: ReadableStream<Uint8Array>
): MockState {
    const aiModule = require('../lib/ai/ai') as any;
    const creditsModule = require('../lib/user/credits') as any;
    const aiConfigServerModule = require('../lib/server/ai-config') as any;
    const aiAccessModule = require('../lib/ai/ai-access') as any;
    const membershipServerModule = require('../lib/user/membership-server') as any;
    const promptBuilderModule = require('../lib/ai/prompt-builder') as any;
    const supabaseServerModule = require('../lib/supabase-server') as any;
    const apiUtilsModule = require('../lib/api-utils') as any;

    const originalCallAIStream = aiModule.callAIStream;
    const originalHasCredits = creditsModule.hasCredits;
    const originalUseCredit = creditsModule.useCredit;
    const originalAddCredits = creditsModule.addCredits;
    const originalGetModelConfigAsync = aiConfigServerModule.getModelConfigAsync;
    const originalIsModelAllowedForMembership = aiAccessModule.isModelAllowedForMembership;
    const originalIsReasoningAllowedForMembership = aiAccessModule.isReasoningAllowedForMembership;
    const originalGetEffectiveMembershipType = membershipServerModule.getEffectiveMembershipType;
    const originalBuildPromptWithSources = promptBuilderModule.buildPromptWithSources;
    const originalGetPromptBudget = promptBuilderModule.getPromptBudget;
    const originalResolvePersonalities = promptBuilderModule.resolvePersonalities;
    const originalGetServiceClient = supabaseServerModule.getSystemAdminClient;
    const originalRequireUserContext = apiUtilsModule.requireUserContext;

    const state: MockState = {
        useCreditCalls: 0,
        addCreditCalls: 0,
    };

    aiModule.callAIStream = async () => streamBody;
    creditsModule.hasCredits = async () => true;
    creditsModule.useCredit = async () => {
        state.useCreditCalls += 1;
        return 0;
    };
    creditsModule.addCredits = async () => {
        state.addCreditCalls += 1;
        return 1;
    };

    aiConfigServerModule.getModelConfigAsync = async () => ({
        id: 'deepseek-chat',
        modelKey: 'deepseek-chat',
        vendor: 'deepseek',
        supportsReasoning: true,
        supportsVision: false,
        requiredTier: 'free',
    });
    aiAccessModule.isModelAllowedForMembership = () => true;
    aiAccessModule.isReasoningAllowedForMembership = () => true;
    membershipServerModule.getEffectiveMembershipType = async () => 'free';

    promptBuilderModule.getPromptBudget = async () => 1024;
    promptBuilderModule.resolvePersonalities = () => ({ personalities: ['general'] });
    promptBuilderModule.buildPromptWithSources = async () => ({
        userMessagePrefix: '',
        sources: [],
        diagnostics: [],
        totalTokens: 0,
        budgetTotal: 0,
        userMessageTokens: 0,
        systemPrompt: '',
    });
    apiUtilsModule.requireUserContext = async () => ({
        user: { id: 'user-1' },
        supabase: {
            auth: {
                getSession: async () => ({ data: { session: null } }),
            },
        },
    });

    supabaseServerModule.getSystemAdminClient = () => ({
        auth: {
            getUser: async () => ({ data: { user: { id: 'user-1' } }, error: null }),
        },
        from: (table: string) => {
            if (table === 'user_settings') {
                return {
                    select: () => ({
                        eq: () => ({
                            maybeSingle: async () => ({ data: null, error: null }),
                        }),
                    }),
                };
            }
            if (table === 'knowledge_bases') {
                return {
                    select: () => ({
                        eq: () => ({
                            in: async () => ({ data: [], error: null }),
                        }),
                    }),
                };
            }
            return {
                select: () => ({
                    eq: () => ({
                        maybeSingle: async () => ({ data: null, error: null }),
                    }),
                }),
            };
        },
    });

    t.after(() => {
        aiModule.callAIStream = originalCallAIStream;
        creditsModule.hasCredits = originalHasCredits;
        creditsModule.useCredit = originalUseCredit;
        creditsModule.addCredits = originalAddCredits;
        aiConfigServerModule.getModelConfigAsync = originalGetModelConfigAsync;
        aiAccessModule.isModelAllowedForMembership = originalIsModelAllowedForMembership;
        aiAccessModule.isReasoningAllowedForMembership = originalIsReasoningAllowedForMembership;
        membershipServerModule.getEffectiveMembershipType = originalGetEffectiveMembershipType;
        promptBuilderModule.buildPromptWithSources = originalBuildPromptWithSources;
        promptBuilderModule.getPromptBudget = originalGetPromptBudget;
        promptBuilderModule.resolvePersonalities = originalResolvePersonalities;
        supabaseServerModule.getSystemAdminClient = originalGetServiceClient;
        apiUtilsModule.requireUserContext = originalRequireUserContext;
    });

    return state;
}

function createChatRequest() {
    return new NextRequest('http://localhost/api/chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token',
        },
        body: JSON.stringify({
            stream: true,
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
}

test('chat route does not charge when stream ends before visible content', async (t) => {
    const streamBody = createSseStream([
        'data: {"choices":[{"delta":{"reasoning_content":"thinking"}}]}\n\n',
        'data: [DONE]\n\n',
    ]);
    const state = setupRouteMocks(t, streamBody);
    const { POST } = await import('../app/api/chat/route');

    const response = await POST(createChatRequest());
    await response.text();
    await waitForMicrotask();

    assert.equal(state.useCreditCalls, 0);
    assert.equal(state.addCreditCalls, 0);
});

test('chat route charges exactly once after first visible content appears', async (t) => {
    const streamBody = createSseStream([
        'data: {"choices":[{"delta":{"reasoning_content":"thinking"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":"你"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":"好"}}]}\n\n',
        'data: [DONE]\n\n',
    ]);
    const state = setupRouteMocks(t, streamBody);
    const { POST } = await import('../app/api/chat/route');

    const response = await POST(createChatRequest());
    await response.text();
    await waitForMicrotask();

    assert.equal(state.useCreditCalls, 1);
    assert.equal(state.addCreditCalls, 0);
});

test('chat route keeps charge and does not refund when stream fails after visible content', async (t) => {
    const encoder = new TextEncoder();
    const failingStream = new ReadableStream<Uint8Array>({
        start(controller) {
            controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"partial"}}]}\n\n'));
        },
        pull() {
            throw new Error('stream read failed');
        },
    });

    const state = setupRouteMocks(t, failingStream);
    const { POST } = await import('../app/api/chat/route');

    const response = await POST(createChatRequest());
    await response.text().catch(() => undefined);
    await waitForMicrotask();

    assert.equal(state.useCreditCalls, 1);
    assert.equal(state.addCreditCalls, 0);
});
