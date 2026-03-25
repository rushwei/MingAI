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
    aiUiCalls: number;
}

function createUIChunkStream(chunks: Array<Record<string, unknown>>): ReadableStream<Record<string, unknown>> {
    return new ReadableStream<Record<string, unknown>>({
        start(controller) {
            for (const chunk of chunks) {
                controller.enqueue(chunk);
            }
            controller.close();
        },
    });
}

function createMockUIMessageResult(
    chunks: Array<Record<string, unknown>>,
    responseMessage: { parts: Array<Record<string, unknown>> },
    finishReason: string = 'stop',
) {
    return {
        toUIMessageStreamResponse(options?: {
            headers?: Record<string, string>;
            messageMetadata?: (input: { part: { type: string } }) => unknown;
            onFinish?: (event: {
                responseMessage: { parts: Array<Record<string, unknown>> };
                finishReason?: string;
                isAborted: boolean;
                isContinuation: boolean;
                messages: Array<{ parts: Array<Record<string, unknown>> }>;
            }) => PromiseLike<void> | void;
        }) {
            const encoder = new TextEncoder();
            const stream = new ReadableStream<Uint8Array>({
                async start(controller) {
                    const metadata = options?.messageMetadata?.({ part: { type: 'start' } });
                    if (metadata) {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'start', messageMetadata: metadata })}\n\n`));
                    }
                    for (const chunk of chunks) {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
                    }
                    await options?.onFinish?.({
                        responseMessage,
                        finishReason,
                        isAborted: false,
                        isContinuation: false,
                        messages: [responseMessage],
                    });
                    controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                    controller.close();
                },
            });
            return new Response(stream, {
                headers: {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache, no-transform',
                    'Connection': 'keep-alive',
                    'X-Accel-Buffering': 'no',
                    'x-vercel-ai-ui-message-stream': 'v1',
                    ...(options?.headers || {}),
                },
            });
        },
    };
}

function setupRouteMocks(
    t: { after: (fn: () => void) => void },
    streamBody: ReadableStream<unknown>
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
    const originalCallAIUIMessageResult = aiModule.callAIUIMessageResult;
    const originalHasCredits = creditsModule.hasCredits;
    const originalUseCredit = creditsModule.useCredit;
    const originalAddCredits = creditsModule.addCredits;
    const originalGetModelConfigAsync = aiConfigServerModule.getModelConfigAsync;
    const originalGetDefaultModelConfigAsync = aiConfigServerModule.getDefaultModelConfigAsync;
    const originalIsModelAllowedForMembership = aiAccessModule.isModelAllowedForMembership;
    const originalIsReasoningAllowedForMembership = aiAccessModule.isReasoningAllowedForMembership;
    const originalGetEffectiveMembershipType = membershipServerModule.getEffectiveMembershipType;
    const originalBuildPromptWithSources = promptBuilderModule.buildPromptWithSources;
    const originalGetPromptBudget = promptBuilderModule.calculatePromptBudget;
    const originalResolvePersonalities = promptBuilderModule.resolvePersonalities;
    const originalGetServiceClient = supabaseServerModule.getSystemAdminClient;
    const originalRequireUserContext = apiUtilsModule.requireUserContext;

    const state: MockState = {
        useCreditCalls: 0,
        addCreditCalls: 0,
        aiUiCalls: 0,
    };

    aiModule.callAIStream = async () => createUIChunkStream([]);
    aiModule.callAIUIMessageResult = async () => {
        state.aiUiCalls += 1;
        const chunks: Array<Record<string, unknown>> = [];
        const reader = streamBody.getReader();
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value as Record<string, unknown>);
        }
        reader.releaseLock();

        const text = chunks
            .filter((chunk) => chunk.type === 'text-delta' && typeof chunk.delta === 'string')
            .map((chunk) => String(chunk.delta))
            .join('');
        const reasoning = chunks
            .filter((chunk) => chunk.type === 'reasoning-delta' && typeof chunk.delta === 'string')
            .map((chunk) => String(chunk.delta))
            .join('');
        const responseParts: Array<Record<string, unknown>> = [];
        if (text) {
            responseParts.push({ type: 'text', text, state: 'done' });
        }
        if (reasoning) {
            responseParts.push({ type: 'reasoning', text: reasoning, state: 'done' });
        }

        return createMockUIMessageResult(chunks, { parts: responseParts });
    };
    creditsModule.hasCredits = async () => true;
    creditsModule.useCredit = async () => {
        state.useCreditCalls += 1;
        return 0;
    };
    creditsModule.addCredits = async () => {
        state.addCreditCalls += 1;
        return 1;
    };

    const mockModelConfig = {
        id: 'deepseek-chat',
        modelKey: 'deepseek-chat',
        vendor: 'deepseek',
        supportsReasoning: true,
        supportsVision: false,
        requiredTier: 'free',
    };
    aiConfigServerModule.getModelConfigAsync = async () => mockModelConfig;
    aiConfigServerModule.getDefaultModelConfigAsync = async () => mockModelConfig;
    aiAccessModule.isModelAllowedForMembership = () => true;
    aiAccessModule.isReasoningAllowedForMembership = () => true;
    membershipServerModule.getEffectiveMembershipType = async () => 'free';

    promptBuilderModule.calculatePromptBudget = async () => 1024;
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
        aiModule.callAIUIMessageResult = originalCallAIUIMessageResult;
        creditsModule.hasCredits = originalHasCredits;
        creditsModule.useCredit = originalUseCredit;
        creditsModule.addCredits = originalAddCredits;
        aiConfigServerModule.getModelConfigAsync = originalGetModelConfigAsync;
        aiConfigServerModule.getDefaultModelConfigAsync = originalGetDefaultModelConfigAsync;
        aiAccessModule.isModelAllowedForMembership = originalIsModelAllowedForMembership;
        aiAccessModule.isReasoningAllowedForMembership = originalIsReasoningAllowedForMembership;
        membershipServerModule.getEffectiveMembershipType = originalGetEffectiveMembershipType;
        promptBuilderModule.buildPromptWithSources = originalBuildPromptWithSources;
        promptBuilderModule.calculatePromptBudget = originalGetPromptBudget;
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
    const streamBody = createUIChunkStream([
        { type: 'reasoning-delta', id: 'r1', delta: 'thinking' },
    ]);
    const state = setupRouteMocks(t, streamBody);
    const { POST } = await import('../app/api/chat/route');

    const response = await POST(createChatRequest());
    await response.text();
    await waitForMicrotask();

    assert.equal(state.useCreditCalls, 1);
    assert.equal(state.addCreditCalls, 1);
});

test('chat route rejects streamed requests when upfront credit deduction fails', async (t) => {
    const streamBody = createUIChunkStream([
        { type: 'text-delta', id: 't1', delta: '你好' },
    ]);
    const state = setupRouteMocks(t, streamBody);
    const creditsModule = require('../lib/user/credits') as any;
    creditsModule.useCredit = async () => {
        state.useCreditCalls += 1;
        return null;
    };

    const { POST } = await import('../app/api/chat/route');

    const response = await POST(createChatRequest());
    const payload = await response.json();

    assert.equal(response.status, 500);
    assert.equal(payload.code, 'CREDIT_DEDUCTION_FAILED');
    assert.equal(state.useCreditCalls, 1);
    assert.equal(state.aiUiCalls, 0);
});

test('chat route keeps upfront charge when stream produces visible content', async (t) => {
    const streamBody = createUIChunkStream([
        { type: 'reasoning-delta', id: 'r1', delta: 'thinking' },
        { type: 'text-delta', id: 't1', delta: '你' },
        { type: 'text-delta', id: 't1', delta: '好' },
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
    const failingStream = createUIChunkStream([
        { type: 'text-delta', id: 't1', delta: 'partial' },
        { type: 'error', errorText: 'stream read failed' },
    ]);

    const state = setupRouteMocks(t, failingStream);
    const { POST } = await import('../app/api/chat/route');

    const response = await POST(createChatRequest());
    await response.text().catch(() => undefined);
    await waitForMicrotask();

    assert.equal(state.useCreditCalls, 1);
    assert.equal(state.addCreditCalls, 0);
});
