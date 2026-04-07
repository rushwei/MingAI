import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';

process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon';

test('conversations GET should forward chartId filter to source_data query', async (t) => {
  const apiUtils = require('../lib/api-utils') as {
    requireUserContext: typeof import('../lib/api-utils').requireUserContext;
  };
  const originalRequireUserContext = apiUtils.requireUserContext;
  const filters: Array<{ column: string; value: unknown }> = [];

  apiUtils.requireUserContext = (async () => ({
    user: { id: 'user-1' },
    supabase: {
      from(table: string) {
        assert.equal(table, 'conversations_with_archive_status');
        const query = {
          select() {
            return query;
          },
          eq(column: string, value: unknown) {
            filters.push({ column, value });
            return query;
          },
          order() {
            return query;
          },
          range: async () => ({
            data: [],
            error: null,
          }),
        };
        return query;
      },
    },
  })) as unknown as typeof apiUtils.requireUserContext;

  t.after(() => {
    apiUtils.requireUserContext = originalRequireUserContext;
  });

  const { GET } = await import('../app/api/conversations/route');
  const response = await GET(new NextRequest('http://localhost/api/conversations?includeArchived=true&sourceType=bazi_wuxing&chartId=chart-1&limit=1'));
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(filters, [
    { column: 'user_id', value: 'user-1' },
    { column: 'source_type', value: 'bazi_wuxing' },
    { column: 'source_data->>chart_id', value: 'chart-1' },
  ]);
  assert.deepEqual(payload.conversations, []);
});
