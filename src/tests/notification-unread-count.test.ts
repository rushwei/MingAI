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

test('getUnreadCount should not log the generic notifications route placeholder error', async () => {
  const originalFetch = global.fetch;
  const originalConsoleError = console.error;
  const errors: string[] = [];

  global.fetch = async () => new Response(JSON.stringify({ error: '获取通知失败' }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' },
  }) as Response;
  console.error = (...args: unknown[]) => {
    errors.push(args.map(String).join(' '));
  };

  try {
    const { getUnreadCount } = await import('../lib/notification');
    const count = await getUnreadCount('user-1', { bypassCache: true });
    assert.equal(count, 0);
    assert.equal(errors.length, 0);
  } finally {
    global.fetch = originalFetch;
    console.error = originalConsoleError;
  }
});

test('unread query should not rely on a cold bootstrap zero as fresh initial data', async () => {
  const originalFetch = global.fetch;
  let fetchCount = 0;

  global.fetch = async () => {
    fetchCount += 1;
    return new Response(JSON.stringify({ count: 3 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }) as Response;
  };

  try {
    const { getUnreadCount } = await import('../lib/notification');
    const count = await getUnreadCount('user-1');
    assert.equal(count, 3);
    assert.equal(fetchCount, 1);
  } finally {
    global.fetch = originalFetch;
  }
});
