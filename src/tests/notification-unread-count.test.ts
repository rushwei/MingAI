import test from 'node:test';
import assert from 'node:assert/strict';

test('getUnreadCount should read count from top-level response', async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => new Response(JSON.stringify({ count: 7 }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  }) as Response;

  try {
    const { getUnreadCount } = await import('../lib/notification');
    const count = await getUnreadCount('user-1', { bypassCache: true });
    assert.equal(count, 7);
  } finally {
    global.fetch = originalFetch;
  }
});
