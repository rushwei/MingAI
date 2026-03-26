import test from 'node:test';
import assert from 'node:assert/strict';

type FetchLike = typeof global.fetch;

process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-anon';

test('loadInitialMessages should request paginated messages from conversation detail API', async () => {
  const originalFetch = global.fetch;
  const requests: string[] = [];

  global.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    requests.push(url);

    if (url.includes('/api/conversations/conv-1?messageLimit=20&messageOffset=0')) {
      return new Response(JSON.stringify({
        conversation: {
          id: 'conv-1',
          user_id: 'user-1',
          personality: 'general',
          title: 'Test',
          created_at: '2026-03-16T00:00:00.000Z',
          updated_at: '2026-03-16T00:00:00.000Z',
          messages: [
            { id: 'm-1', role: 'user', content: 'hello', createdAt: '2026-03-16T00:00:00.000Z' },
            { id: 'm-2', role: 'assistant', content: 'world', createdAt: '2026-03-16T00:00:01.000Z' },
          ],
        },
        pagination: {
          total: 2,
          hasMore: false,
        },
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    throw new Error(`Unexpected fetch: ${url}`);
  }) as FetchLike;

  try {
    const conversationModule = await import('../lib/chat/conversation');
    const result = await conversationModule.loadInitialMessages('conv-1');

    assert.equal(result?.total, 2);
    assert.equal(result?.messages.length, 2);
    assert.equal(result?.messages[1].content, 'world');
    assert.deepEqual(requests, ['/api/conversations/conv-1?messageLimit=20&messageOffset=0']);
  } finally {
    global.fetch = originalFetch;
  }
});

test('loadConversations should request a single paginated page by default', async () => {
  const originalFetch = global.fetch;
  const requests: string[] = [];

  global.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    requests.push(url);

    if (url.includes('/api/conversations?limit=20&offset=0')) {
      return new Response(JSON.stringify({
        conversations: [
          {
            id: 'conv-1',
            user_id: 'user-1',
            personality: 'general',
            title: '第一条',
            created_at: '2026-03-17T00:00:00.000Z',
            updated_at: '2026-03-17T00:00:00.000Z',
            messages: [],
          },
        ],
        pagination: {
          hasMore: true,
          nextOffset: 20,
        },
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    throw new Error(`Unexpected fetch: ${url}`);
  }) as FetchLike;

  try {
    const conversationModule = await import('../lib/chat/conversation');
    const result = await conversationModule.loadConversations('user-1');

    assert.deepEqual(result?.conversations.map((conversation) => conversation.id), ['conv-1']);
    assert.equal(result?.pagination.hasMore, true);
    assert.equal(result?.pagination.nextOffset, 20);
    assert.deepEqual(requests, ['/api/conversations?limit=20&offset=0']);
  } finally {
    global.fetch = originalFetch;
  }
});

test('loadAllConversations should keep fetching pages until the conversation list is exhausted', async () => {
  const originalFetch = global.fetch;
  const requests: string[] = [];

  global.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    requests.push(url);

    if (url.includes('/api/conversations?limit=20&offset=0')) {
      return new Response(JSON.stringify({
        conversations: [
          {
            id: 'conv-1',
            user_id: 'user-1',
            personality: 'general',
            title: '第一条',
            created_at: '2026-03-17T00:00:00.000Z',
            updated_at: '2026-03-17T00:00:00.000Z',
            messages: [],
          },
        ],
        pagination: {
          hasMore: true,
          nextOffset: 20,
        },
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (url.includes('/api/conversations?limit=20&offset=20')) {
      return new Response(JSON.stringify({
        conversations: [
          {
            id: 'conv-2',
            user_id: 'user-1',
            personality: 'general',
            title: '第二条',
            created_at: '2026-03-16T00:00:00.000Z',
            updated_at: '2026-03-16T00:00:00.000Z',
            messages: [],
          },
        ],
        pagination: {
          hasMore: false,
          nextOffset: null,
        },
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    throw new Error(`Unexpected fetch: ${url}`);
  }) as FetchLike;

  try {
    const conversationModule = await import('../lib/chat/conversation');
    const result = await conversationModule.loadAllConversations('user-1');

    assert.deepEqual(result.map((conversation) => conversation.id), ['conv-1', 'conv-2']);
    assert.deepEqual(requests, [
      '/api/conversations?limit=20&offset=0',
      '/api/conversations?limit=20&offset=20',
    ]);
  } finally {
    global.fetch = originalFetch;
  }
});

test('loadConversationWindow should preserve the already loaded conversation window size on refresh', async () => {
  const originalFetch = global.fetch;
  const requests: string[] = [];

  global.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    requests.push(url);

    if (url.includes('/api/conversations?limit=20&offset=0')) {
      return new Response(JSON.stringify({
        conversations: Array.from({ length: 20 }, (_, index) => ({
          id: `conv-${index + 1}`,
          user_id: 'user-1',
          personality: 'general',
          title: `对话 ${index + 1}`,
          created_at: '2026-03-17T00:00:00.000Z',
          updated_at: '2026-03-17T00:00:00.000Z',
          messages: [],
        })),
        pagination: {
          hasMore: true,
          nextOffset: 20,
        },
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (url.includes('/api/conversations?limit=20&offset=20')) {
      return new Response(JSON.stringify({
        conversations: Array.from({ length: 20 }, (_, index) => ({
          id: `conv-${index + 21}`,
          user_id: 'user-1',
          personality: 'general',
          title: `对话 ${index + 21}`,
          created_at: '2026-03-16T00:00:00.000Z',
          updated_at: '2026-03-16T00:00:00.000Z',
          messages: [],
        })),
        pagination: {
          hasMore: true,
          nextOffset: 40,
        },
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    throw new Error(`Unexpected fetch: ${url}`);
  }) as FetchLike;

  try {
    const conversationModule = await import('../lib/chat/conversation');
    const result = await conversationModule.loadConversationWindow('user-1', {
      targetCount: 40,
    });

    assert.equal(result?.conversations.length, 40);
    assert.equal(result?.pagination.hasMore, true);
    assert.equal(result?.pagination.nextOffset, 40);
    assert.deepEqual(requests, [
      '/api/conversations?limit=20&offset=0',
      '/api/conversations?limit=20&offset=20',
    ]);
  } finally {
    global.fetch = originalFetch;
  }
});

test('loadConversationWindow should keep fetching until previously loaded conversation ids are preserved', async () => {
  const originalFetch = global.fetch;
  const requests: string[] = [];

  global.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    requests.push(url);

    if (url.includes('/api/conversations?limit=20&offset=0')) {
      return new Response(JSON.stringify({
        conversations: Array.from({ length: 20 }, (_, index) => ({
          id: `new-${index + 1}`,
          user_id: 'user-1',
          personality: 'general',
          title: `新对话 ${index + 1}`,
          created_at: '2026-03-18T00:00:00.000Z',
          updated_at: '2026-03-18T00:00:00.000Z',
          messages: [],
        })),
        pagination: {
          hasMore: true,
          nextOffset: 20,
        },
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (url.includes('/api/conversations?limit=20&offset=20')) {
      return new Response(JSON.stringify({
        conversations: Array.from({ length: 20 }, (_, index) => ({
          id: `conv-${index + 1}`,
          user_id: 'user-1',
          personality: 'general',
          title: `旧对话 ${index + 1}`,
          created_at: '2026-03-17T00:00:00.000Z',
          updated_at: '2026-03-17T00:00:00.000Z',
          messages: [],
        })),
        pagination: {
          hasMore: true,
          nextOffset: 40,
        },
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (url.includes('/api/conversations?limit=20&offset=40')) {
      return new Response(JSON.stringify({
        conversations: Array.from({ length: 20 }, (_, index) => ({
          id: `conv-${index + 21}`,
          user_id: 'user-1',
          personality: 'general',
          title: `旧对话 ${index + 21}`,
          created_at: '2026-03-16T00:00:00.000Z',
          updated_at: '2026-03-16T00:00:00.000Z',
          messages: [],
        })),
        pagination: {
          hasMore: false,
          nextOffset: null,
        },
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    throw new Error(`Unexpected fetch: ${url}`);
  }) as FetchLike;

  try {
    const conversationModule = await import('../lib/chat/conversation');
    const result = await conversationModule.loadConversationWindow('user-1', {
      targetCount: 40,
      preserveIds: Array.from({ length: 40 }, (_, index) => `conv-${index + 1}`),
    });

    assert.equal(result?.conversations.length, 60);
    assert.equal(result?.pagination.hasMore, false);
    assert.equal(result?.pagination.nextOffset, null);
    assert.ok(result?.conversations.some((conversation) => conversation.id === 'conv-40'));
    assert.deepEqual(requests, [
      '/api/conversations?limit=20&offset=0',
      '/api/conversations?limit=20&offset=20',
      '/api/conversations?limit=20&offset=40',
    ]);
  } finally {
    global.fetch = originalFetch;
  }
});
