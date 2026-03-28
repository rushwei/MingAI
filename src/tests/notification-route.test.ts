import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';

process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon';

test('notifications GET should use head count query for unread badge requests', async (t) => {
  const apiUtils = require('../lib/api-utils') as {
    requireUserContext: typeof import('../lib/api-utils').requireUserContext;
  };
  const notificationServer = require('../lib/notification-server') as {
    pruneExpiredNotifications: typeof import('../lib/notification-server').pruneExpiredNotifications;
  };
  const originalRequireUserContext = apiUtils.requireUserContext;
  const originalPruneExpiredNotifications = notificationServer.pruneExpiredNotifications;

  const queryState: {
    columns?: string;
    options?: Record<string, unknown>;
    eqCalls: Array<{ column: string; value: unknown }>;
    gteCalls: Array<{ column: string; value: unknown }>;
  } = {
    eqCalls: [],
    gteCalls: [],
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
              gte(column: string, value: unknown) {
                queryState.gteCalls.push({ column, value });
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
  notificationServer.pruneExpiredNotifications = (async () => 0) as typeof notificationServer.pruneExpiredNotifications;

  t.after(() => {
    apiUtils.requireUserContext = originalRequireUserContext;
    notificationServer.pruneExpiredNotifications = originalPruneExpiredNotifications;
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
  assert.deepEqual(queryState.gteCalls.map((item) => item.column), ['created_at']);
});

test('notifications GET list should filter notifications to the most recent 3 days', async (t) => {
  const apiUtils = require('../lib/api-utils') as {
    requireUserContext: typeof import('../lib/api-utils').requireUserContext;
  };
  const notificationServer = require('../lib/notification-server') as {
    pruneExpiredNotifications: typeof import('../lib/notification-server').pruneExpiredNotifications;
  };
  const originalRequireUserContext = apiUtils.requireUserContext;
  const originalPruneExpiredNotifications = notificationServer.pruneExpiredNotifications;

  const gteCalls: Array<{ column: string; value: unknown }> = [];

  apiUtils.requireUserContext = (async () => ({
    user: { id: 'user-1' },
    supabase: {
      from(table: string) {
        assert.equal(table, 'notifications');
        return {
          select() {
            const query = {
              eq() {
                return query;
              },
              gte(column: string, value: unknown) {
                gteCalls.push({ column, value });
                return query;
              },
              order() {
                return query;
              },
              range() {
                return Promise.resolve({
                  data: [
                    {
                      id: 'notification-1',
                      user_id: 'user-1',
                      type: 'system',
                      title: '标题',
                      content: '内容',
                      is_read: false,
                      link: null,
                      created_at: '2026-03-28T00:00:00.000Z',
                    },
                    {
                      id: 'notification-2',
                      user_id: 'user-1',
                      type: 'system',
                      title: '标题2',
                      content: '内容2',
                      is_read: true,
                      link: null,
                      created_at: '2026-03-27T00:00:00.000Z',
                    },
                    {
                      id: 'notification-3',
                      user_id: 'user-1',
                      type: 'system',
                      title: '标题3',
                      content: '内容3',
                      is_read: true,
                      link: null,
                      created_at: '2026-03-26T00:00:00.000Z',
                    },
                  ],
                  error: null,
                });
              },
            };
            return query;
          },
        };
      },
    },
  })) as unknown as typeof apiUtils.requireUserContext;
  notificationServer.pruneExpiredNotifications = (async () => 0) as typeof notificationServer.pruneExpiredNotifications;

  t.after(() => {
    apiUtils.requireUserContext = originalRequireUserContext;
    notificationServer.pruneExpiredNotifications = originalPruneExpiredNotifications;
  });

  const { GET } = await import('../app/api/notifications/route');
  const response = await GET(new NextRequest('http://localhost/api/notifications?limit=2'));
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(payload.notifications.map((item: { id: string }) => item.id), ['notification-1', 'notification-2']);
  assert.deepEqual(payload.pagination, {
    hasMore: true,
    nextOffset: 2,
  });
  assert.equal(gteCalls.length, 1);
  assert.equal(gteCalls[0].column, 'created_at');
  assert.equal(typeof gteCalls[0].value, 'string');
});
