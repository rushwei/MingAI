import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

type FetchLike = typeof global.fetch;

const qimenHistoryPagePath = resolve(process.cwd(), 'src/app/qimen/history/page.tsx');
const daliurenHistoryPagePath = resolve(process.cwd(), 'src/app/daliuren/history/page.tsx');

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

test('qimen and daliuren history pages should restore through the shared history client instead of dedicated route fetches', async () => {
  const [qimenSource, daliurenSource] = await Promise.all([
    readFile(qimenHistoryPagePath, 'utf-8'),
    readFile(daliurenHistoryPagePath, 'utf-8'),
  ]);

  assert.match(
    qimenSource,
    /loadHistorySummaries\('qimen'/u,
    'qimen history page should load list data through the shared history client',
  );
  assert.match(
    qimenSource,
    /deleteHistorySummary\('qimen'/u,
    'qimen history page should delete through the shared history delete contract',
  );
  assert.doesNotMatch(
    qimenSource,
    /fetch\('\/api\/qimen'/u,
    'qimen history page should not call the dedicated qimen history route directly',
  );

  assert.match(
    daliurenSource,
    /loadHistorySummaries\('daliuren'/u,
    'daliuren history page should load list data through the shared history client',
  );
  assert.match(
    daliurenSource,
    /deleteHistorySummary\('daliuren'/u,
    'daliuren history page should delete through the shared history delete contract',
  );
  assert.doesNotMatch(
    daliurenSource,
    /fetch\('\/api\/daliuren'/u,
    'daliuren history page should not call the dedicated daliuren history route directly',
  );
});
