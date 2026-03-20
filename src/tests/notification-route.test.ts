import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';

process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon';

test('notifications GET should use head count query for unread badge requests', async (t) => {
  const apiUtils = require('../lib/api-utils') as {
    requireUserContext: typeof import('../lib/api-utils').requireUserContext;
  };
  const originalRequireUserContext = apiUtils.requireUserContext;

  const queryState: {
    columns?: string;
    options?: Record<string, unknown>;
    eqCalls: Array<{ column: string; value: unknown }>;
  } = {
    eqCalls: [],
  };

  apiUtils.requireUserContext = (async () => ({
    user: { id: 'user-1' },
    supabase: {
      from(table: string) {
        assert.equal(table, 'notifications');
        return {
          select(columns: string, options?: Record<string, unknown>) {
            queryState.columns = columns;
            queryState.options = options;
            const query = {
              eq(column: string, value: unknown) {
                queryState.eqCalls.push({ column, value });
                return query;
              },
              order() {
                throw new Error('count query should not sort notifications');
              },
              limit() {
                throw new Error('count query should not apply list limit');
              },
              then(resolve: (value: { data: null; error: null; count: number }) => unknown) {
                return Promise.resolve(resolve({ data: null, error: null, count: 5 }));
              },
            };
            return query;
          },
        };
      },
    },
  })) as unknown as typeof apiUtils.requireUserContext;

  t.after(() => {
    apiUtils.requireUserContext = originalRequireUserContext;
  });

  const { GET } = await import('../app/api/notifications/route');
  const response = await GET(new NextRequest('http://localhost/api/notifications?count=1&unread=1'));
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.count, 5);
  assert.equal(queryState.columns, 'id');
  assert.deepEqual(queryState.options, { count: 'exact', head: true });
  assert.deepEqual(queryState.eqCalls, [
    { column: 'user_id', value: 'user-1' },
    { column: 'is_read', value: false },
  ]);
});
