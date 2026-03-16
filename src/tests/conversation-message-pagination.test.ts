import test from 'node:test';
import assert from 'node:assert/strict';

type FetchLike = typeof global.fetch;

test('conversation message loader should request paginated messages from API instead of slicing full conversations', async () => {
  const originalFetch = global.fetch;
  const urls: string[] = [];

  global.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    urls.push(url);

    if (url.includes('/api/conversations/conv-1?messageLimit=2&messageOffset=1')) {
      return new Response(JSON.stringify({
        conversation: {
          id: 'conv-1',
          user_id: 'user-1',
          title: '测试对话',
          personality: 'general',
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
          source_type: 'chat',
          source_data: null,
          messages: [
            { id: 'm2', role: 'assistant', content: '第二条', createdAt: '2024-01-01T00:01:00.000Z' },
            { id: 'm3', role: 'user', content: '第三条', createdAt: '2024-01-01T00:02:00.000Z' },
          ],
        },
        messagePage: {
          total: 3,
          hasMore: true,
          offset: 1,
          limit: 2,
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
    const page = await conversationModule.loadConversationMessages('conv-1', {
      limit: 2,
      offset: 1,
    });

    assert.equal(page?.total, 3);
    assert.equal(page?.hasMore, true);
    assert.deepEqual(
      page?.messages.map((message) => message.id),
      ['m2', 'm3'],
    );
    assert.equal(
      urls.some((url) => url.includes('messageLimit=2') && url.includes('messageOffset=1')),
      true,
    );
  } finally {
    global.fetch = originalFetch;
  }
});
