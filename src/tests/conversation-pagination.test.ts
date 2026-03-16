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
