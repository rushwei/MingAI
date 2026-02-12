import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ChatMessage } from '../types';

process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-anon';

const { ChatStreamManager } = require('../lib/chat/chat-stream-manager') as typeof import('../lib/chat/chat-stream-manager');

function createUserMessage(): ChatMessage {
    return {
        id: 'user-1',
        role: 'user',
        content: '你好',
        createdAt: new Date().toISOString(),
    };
}

function createAssistantMessage(id: string): ChatMessage {
    return {
        id,
        role: 'assistant',
        content: '',
        createdAt: new Date().toISOString(),
        model: 'deepseek-chat',
    };
}

function waitFor(predicate: () => boolean, timeoutMs = 1200): Promise<void> {
    const start = Date.now();
    return new Promise((resolve, reject) => {
        const tick = () => {
            if (predicate()) {
                resolve();
                return;
            }
            if (Date.now() - start > timeoutMs) {
                reject(new Error('waitFor timeout'));
                return;
            }
            setTimeout(tick, 20);
        };
        tick();
    });
}

function createInfiniteContentResponse(signal?: AbortSignal): Response {
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
        start(controller) {
            controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"A"}}]}\n\n'));
            const onAbort = () => {
                controller.error(new DOMException('aborted', 'AbortError'));
            };
            signal?.addEventListener('abort', onAbort, { once: true });
        },
    });
    return new Response(stream, {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
    });
}

test('chat stream manager allows concurrent tasks across different conversations', async () => {
    const manager = new ChatStreamManager({
        fetcher: async (_input, init) => createInfiniteContentResponse(init?.signal as AbortSignal | undefined),
        saveConversation: async () => true,
    });

    const baseMessages = [createUserMessage()];
    const start1 = await manager.startTask({
        conversationId: 'conv-1',
        requestHeaders: { 'Content-Type': 'application/json' },
        requestBody: { messages: baseMessages, stream: true },
        baseMessages,
        assistantMessage: createAssistantMessage('assistant-1'),
    });
    const start2 = await manager.startTask({
        conversationId: 'conv-2',
        requestHeaders: { 'Content-Type': 'application/json' },
        requestBody: { messages: baseMessages, stream: true },
        baseMessages,
        assistantMessage: createAssistantMessage('assistant-2'),
    });

    assert.equal(start1.ok, true);
    assert.equal(start2.ok, true);
    assert.equal(manager.isConversationRunning('conv-1'), true);
    assert.equal(manager.isConversationRunning('conv-2'), true);

    manager.stopTask('conv-1');
    await waitFor(() => !manager.isConversationRunning('conv-1'));
    assert.equal(manager.isConversationRunning('conv-2'), true);

    manager.stopTask('conv-2');
    await waitFor(() => !manager.isConversationRunning('conv-2'));
});

test('chat stream manager blocks parallel tasks in the same conversation', async () => {
    const manager = new ChatStreamManager({
        fetcher: async (_input, init) => createInfiniteContentResponse(init?.signal as AbortSignal | undefined),
        saveConversation: async () => true,
    });

    const baseMessages = [createUserMessage()];
    const start1 = await manager.startTask({
        conversationId: 'conv-1',
        requestHeaders: { 'Content-Type': 'application/json' },
        requestBody: { messages: baseMessages, stream: true },
        baseMessages,
        assistantMessage: createAssistantMessage('assistant-1'),
    });

    const start2 = await manager.startTask({
        conversationId: 'conv-1',
        requestHeaders: { 'Content-Type': 'application/json' },
        requestBody: { messages: baseMessages, stream: true },
        baseMessages,
        assistantMessage: createAssistantMessage('assistant-2'),
    });

    assert.equal(start1.ok, true);
    assert.equal(start2.ok, false);
    assert.equal(start2.code, 'CONVERSATION_BUSY');

    manager.stopTask('conv-1');
    await waitFor(() => !manager.isConversationRunning('conv-1'));
});

test('chat stream manager saves partial output when stopped manually', async () => {
    const saved: Array<{ conversationId: string; messages: ChatMessage[] }> = [];
    const manager = new ChatStreamManager({
        fetcher: async (_input, init) => createInfiniteContentResponse(init?.signal as AbortSignal | undefined),
        saveConversation: async (conversationId, messages) => {
            saved.push({ conversationId, messages: messages as ChatMessage[] });
            return true;
        },
    });

    const baseMessages = [createUserMessage()];
    const started = await manager.startTask({
        conversationId: 'conv-stop',
        requestHeaders: { 'Content-Type': 'application/json' },
        requestBody: { messages: baseMessages, stream: true },
        baseMessages,
        assistantMessage: createAssistantMessage('assistant-stop'),
    });

    assert.equal(started.ok, true);
    await waitFor(() => {
        const snapshot = manager.getTaskSnapshot('conv-stop');
        return Boolean(snapshot?.content && snapshot.content.length > 0);
    });

    manager.stopTask('conv-stop');
    await waitFor(() => !manager.isConversationRunning('conv-stop'));

    assert.equal(saved.length > 0, true);
    const latest = saved[saved.length - 1];
    assert.equal(latest.conversationId, 'conv-stop');
    const assistant = latest.messages[latest.messages.length - 1];
    assert.equal(assistant.role, 'assistant');
    assert.equal(assistant.content.includes('A'), true);
});

test('chat stream manager maps HTTP 402 to insufficient credits even without JSON payload', async () => {
    const manager = new ChatStreamManager({
        fetcher: async () => new Response('payment required', { status: 402 }),
        saveConversation: async () => true,
    });

    const baseMessages = [createUserMessage()];
    const events: Array<{ type: string; errorCode?: string }> = [];
    const unsubscribe = manager.subscribe((event) => {
        events.push({ type: event.type, errorCode: event.errorCode });
    });

    const started = await manager.startTask({
        conversationId: 'conv-credits',
        requestHeaders: { 'Content-Type': 'application/json' },
        requestBody: { messages: baseMessages, stream: true },
        baseMessages,
        assistantMessage: createAssistantMessage('assistant-credits'),
    });
    assert.equal(started.ok, true);

    await waitFor(() => events.some(e => e.type === 'task_failed'));
    const failedEvent = events.find(e => e.type === 'task_failed');
    assert.equal(failedEvent?.errorCode, 'INSUFFICIENT_CREDITS');

    unsubscribe();
});

test('chat stream manager maps HTTP 401 to auth required with server error message', async () => {
    const manager = new ChatStreamManager({
        fetcher: async () => new Response(
            JSON.stringify({ error: '请先登录后再使用 AI 对话' }),
            {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            }
        ),
        saveConversation: async () => true,
    });

    const baseMessages = [createUserMessage()];
    const events: Array<{ type: string; errorCode?: string; errorMessage?: string }> = [];
    const unsubscribe = manager.subscribe((event) => {
        events.push({
            type: event.type,
            errorCode: event.errorCode,
            errorMessage: event.errorMessage,
        });
    });

    const started = await manager.startTask({
        conversationId: 'conv-auth',
        requestHeaders: { 'Content-Type': 'application/json' },
        requestBody: { messages: baseMessages, stream: true },
        baseMessages,
        assistantMessage: createAssistantMessage('assistant-auth'),
    });
    assert.equal(started.ok, true);

    await waitFor(() => events.some(e => e.type === 'task_failed'));
    const failedEvent = events.find(e => e.type === 'task_failed');
    assert.equal(failedEvent?.errorCode, 'AUTH_REQUIRED');
    assert.equal(failedEvent?.errorMessage, '请先登录后再使用 AI 对话');

    unsubscribe();
});

test('chat stream manager serializes circular request bodies without throwing', async () => {
    let capturedBody = '';
    const manager = new ChatStreamManager({
        fetcher: async (_input, init) => {
            capturedBody = String(init?.body ?? '');
            return new Response('payment required', { status: 402 });
        },
        saveConversation: async () => true,
    });

    const baseMessages = [createUserMessage()];
    const circularMessage: Record<string, unknown> = {
        id: 'circular-msg',
        role: 'user',
        content: '循环消息',
    };
    circularMessage.self = circularMessage;

    const started = await manager.startTask({
        conversationId: 'conv-circular',
        requestHeaders: { 'Content-Type': 'application/json' },
        requestBody: {
            messages: [circularMessage],
            stream: true,
        },
        baseMessages,
        assistantMessage: createAssistantMessage('assistant-circular'),
    });
    assert.equal(started.ok, true);

    await waitFor(() => !manager.isConversationRunning('conv-circular'));
    assert.equal(capturedBody.includes('"messages"'), true);
    assert.equal(capturedBody.includes('"循环消息"'), true);
});

test('chat stream manager serializes bigint values to avoid request-time crashes', async () => {
    let capturedBody = '';
    const manager = new ChatStreamManager({
        fetcher: async (_input, init) => {
            capturedBody = String(init?.body ?? '');
            return new Response('payment required', { status: 402 });
        },
        saveConversation: async () => true,
    });

    const baseMessages = [createUserMessage()];
    const started = await manager.startTask({
        conversationId: 'conv-bigint',
        requestHeaders: { 'Content-Type': 'application/json' },
        requestBody: {
            messages: [{
                id: 'bigint-msg',
                role: 'user',
                content: 'bigint',
                tokens: BigInt(1),
            }],
            stream: true,
        },
        baseMessages,
        assistantMessage: createAssistantMessage('assistant-bigint'),
    });
    assert.equal(started.ok, true);

    await waitFor(() => !manager.isConversationRunning('conv-bigint'));
    assert.equal(capturedBody.includes('"tokens":"1"'), true);
});

test('chat stream manager invokes fetch with global this binding to avoid illegal invocation', async () => {
    const originalFetch = globalThis.fetch;
    try {
        globalThis.fetch = function (
            this: typeof globalThis,
            input: RequestInfo | URL,
            init?: RequestInit
        ): Promise<Response> {
            void input;
            void init;
            if (this !== globalThis) {
                throw new TypeError("Failed to execute 'fetch' on 'Window': Illegal invocation");
            }
            return Promise.resolve(new Response('payment required', { status: 402 }));
        } as typeof fetch;

        const manager = new ChatStreamManager({
            saveConversation: async () => true,
        });
        const baseMessages = [createUserMessage()];
        const events: Array<{ type: string; errorCode?: string }> = [];
        const unsubscribe = manager.subscribe((event) => {
            events.push({ type: event.type, errorCode: event.errorCode });
        });

        const started = await manager.startTask({
            conversationId: 'conv-bound-fetch',
            requestHeaders: { 'Content-Type': 'application/json' },
            requestBody: { messages: baseMessages, stream: true },
            baseMessages,
            assistantMessage: createAssistantMessage('assistant-bound-fetch'),
        });
        assert.equal(started.ok, true);

        await waitFor(() => events.some(e => e.type === 'task_failed'));
        const failedEvent = events.find(e => e.type === 'task_failed');
        assert.equal(failedEvent?.errorCode, 'INSUFFICIENT_CREDITS');

        unsubscribe();
    } finally {
        globalThis.fetch = originalFetch;
    }
});
