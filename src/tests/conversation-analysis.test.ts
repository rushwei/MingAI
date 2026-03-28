import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ChatMessage } from '../types';

process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-anon';

const loadModule = () => require('../lib/ai/ai-analysis-query') as typeof import('../lib/ai/ai-analysis-query');

test('extractAnalysisFromConversation prefers message metadata then source_data', () => {
    const { extractAnalysisFromConversation } = loadModule();
    const messages: ChatMessage[] = [
        {
            id: '1',
            role: 'assistant',
            content: 'analysis',
            createdAt: '2024-01-01',
            model: 'deepseek-v3.2',
            reasoning: 'think',
        },
    ];
    const sourceData = { model_id: 'glm-4', reasoning_text: 'fallback' };
    const result = extractAnalysisFromConversation(messages, sourceData);
    assert.equal(result.analysis, 'analysis');
    assert.equal(result.modelId, 'deepseek-v3.2');
    assert.equal(result.reasoning, 'think');
});

test('extractAnalysisFromConversation falls back to source_data when message missing', () => {
    const { extractAnalysisFromConversation } = loadModule();
    const messages: ChatMessage[] = [
        {
            id: '1',
            role: 'assistant',
            content: 'analysis',
            createdAt: '2024-01-01',
        },
    ];
    const sourceData = { model_id: 'glm-4', reasoning_text: 'fallback' };
    const result = extractAnalysisFromConversation(messages, sourceData);
    assert.equal(result.modelId, 'glm-4');
    assert.equal(result.reasoning, 'fallback');
});

test('hydrateConversationMessages backfills model/reasoning when missing', () => {
    const { hydrateConversationMessages } = loadModule();
    const messages: ChatMessage[] = [
        {
            id: '1',
            role: 'assistant',
            content: 'analysis',
            createdAt: '2024-01-01',
        },
    ];
    const sourceData = { model_id: 'glm-4', reasoning_text: 'fallback' };
    const result = hydrateConversationMessages(messages, sourceData);
    assert.equal(result[0].model, 'glm-4');
    assert.equal(result[0].reasoning, 'fallback');
});

test('createAIAnalysisConversation stores model/reasoning in assistant message', async (t) => {
    const supabaseServerPath = require.resolve('../lib/supabase-server');
    const aiAnalysisPath = require.resolve('../lib/ai/ai-analysis');
    const supabaseServerModule = require('../lib/supabase-server');
    const originalGetServiceClient = supabaseServerModule.getSystemAdminClient;
    let capturedPayload: Record<string, unknown> | null = null;
    let capturedRpc: { fn: string; args: Record<string, unknown> } | null = null;

    supabaseServerModule.getSystemAdminClient = () => ({
        from: () => ({
            insert: (payload: Record<string, unknown>) => {
                capturedPayload = payload;
                return {
                    select: () => ({
                        single: async () => ({ data: { id: 'conv-1' }, error: null }),
                    }),
                };
            },
        }),
        rpc: async (fn: string, args: Record<string, unknown>) => {
            capturedRpc = { fn, args };
            return { data: null, error: null };
        },
    });

    t.after(() => {
        supabaseServerModule.getSystemAdminClient = originalGetServiceClient;
        delete require.cache[aiAnalysisPath];
        delete require.cache[supabaseServerPath];
    });

    delete require.cache[aiAnalysisPath];
    const { createAIAnalysisConversation } = require('../lib/ai/ai-analysis') as typeof import('../lib/ai/ai-analysis');

    await createAIAnalysisConversation({
        userId: 'user-1',
        sourceType: 'tarot',
        sourceData: {
            model_id: 'glm-4',
            reasoning_text: 'fallback',
        },
        title: 'Test',
        aiResponse: 'analysis',
    });

    assert.equal((capturedPayload as Record<string, unknown> | null)?.messages, undefined);
    const rpcCall = capturedRpc as { fn: string; args: Record<string, unknown> } | null;
    assert.ok(rpcCall);
    assert.equal(rpcCall.fn, 'replace_conversation_messages');
    assert.equal(rpcCall.args.p_conversation_id, 'conv-1');
    const rpcMessages = (rpcCall.args.p_messages as ChatMessage[]) || [];
    assert.equal(rpcMessages[0]?.model, 'glm-4');
    assert.equal(rpcMessages[0]?.reasoning, 'fallback');
});

test('replaceConversationMessages should no-op safely when rpc is unavailable', async () => {
    const { replaceConversationMessages } = require('../lib/server/conversation-messages') as typeof import('../lib/server/conversation-messages');
    const result = await replaceConversationMessages({} as never, 'conv-1', [
        {
            id: 'm-1',
            role: 'assistant',
            content: 'analysis',
            createdAt: '2024-01-01T00:00:00.000Z',
        },
    ]);

    assert.equal(result.error, null);
});

test('loadConversationAnalysisSnapshot reads lightweight snapshot payload', async (t) => {
    const originalFetch = global.fetch;
    const analysisModulePath = require.resolve('../lib/chat/conversation-analysis');

    global.fetch = (async (input: RequestInfo | URL) => {
        assert.equal(String(input), '/api/conversations/conv-1?snapshot=analysis');
        return new Response(JSON.stringify({
            snapshot: {
                analysis: 'saved analysis',
                reasoning: 'saved reasoning',
                modelId: 'glm-4',
                reasoningEnabled: true,
            },
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    }) as typeof global.fetch;

    t.after(() => {
        global.fetch = originalFetch;
        delete require.cache[analysisModulePath];
    });

    delete require.cache[analysisModulePath];
    const { loadConversationAnalysisSnapshot } = require('../lib/chat/conversation-analysis') as typeof import('../lib/chat/conversation-analysis');
    const snapshot = await loadConversationAnalysisSnapshot('conv-1');

    assert.deepEqual(snapshot, {
        analysis: 'saved analysis',
        reasoning: 'saved reasoning',
        modelId: 'glm-4',
        reasoningEnabled: true,
    });
});
