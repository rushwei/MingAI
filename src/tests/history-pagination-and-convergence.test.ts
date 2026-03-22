import test from 'node:test';
import assert from 'node:assert/strict';

type FetchLike = typeof global.fetch;

process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-anon';

test('loadHistorySummaries should keep fetching pages until hasMore is false', async () => {
  const originalFetch = global.fetch;
  const requests: string[] = [];

  global.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    requests.push(url);

    if (url.includes('/api/history-summaries?type=tarot&limit=100&offset=0')) {
      return new Response(JSON.stringify({
        items: [{ id: 't-1', title: '单牌', createdAt: '2026-03-17T00:00:00.000Z' }],
        pagination: { hasMore: true, nextOffset: 100 },
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (url.includes('/api/history-summaries?type=tarot&limit=100&offset=100')) {
      return new Response(JSON.stringify({
        items: [{ id: 't-2', title: '三牌阵', createdAt: '2026-03-16T00:00:00.000Z' }],
        pagination: { hasMore: false, nextOffset: null },
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    throw new Error(`Unexpected fetch: ${url}`);
  }) as FetchLike;

  try {
    const historyClient = await import('../lib/history/client');
    const items = await historyClient.loadHistorySummaries('tarot');

    assert.deepEqual(items.map((item) => item.id), ['t-1', 't-2']);
    assert.deepEqual(requests, [
      '/api/history-summaries?type=tarot&limit=100&offset=0',
      '/api/history-summaries?type=tarot&limit=100&offset=100',
    ]);
  } finally {
    global.fetch = originalFetch;
  }
});
