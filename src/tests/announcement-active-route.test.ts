import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';

process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-anon';

type AnnouncementStateUpsertPayload = {
  announcement_id: string;
  user_id: string;
  version: number;
  dismissed_until: string | null;
  dismissed_permanently_at: string | null;
};

test('active announcements GET should return published popup announcements for visitors', async (t) => {
  const apiUtilsModule = require('../lib/api-utils') as any;
  const originalGetAuthContext = apiUtilsModule.getAuthContext;
  const originalGetSystemAdminClient = apiUtilsModule.getSystemAdminClient;

  apiUtilsModule.getAuthContext = async () => ({
    user: null,
    supabase: {},
  });
  apiUtilsModule.getSystemAdminClient = () => ({
    from: (table: string) => {
      assert.equal(table, 'announcements');
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              or: () => ({
                or: () => ({
                  order: async () => ({
                    data: [
                      {
                        id: 'announcement-1',
                        title: '系统维护公告',
                        content: '访客也可见',
                        cta_label: '查看详情',
                        cta_href: '/status',
                        priority: 'critical',
                        display_order: 0,
                        starts_at: null,
                        ends_at: null,
                        popup_enabled: true,
                        audience_scope: 'all_visitors',
                        version: 1,
                        published_at: '2026-03-23T00:00:00.000Z',
                        created_at: '2026-03-23T00:00:00.000Z',
                        updated_at: '2026-03-23T00:00:00.000Z',
                      },
                    ],
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      };
    },
  });

  t.after(() => {
    apiUtilsModule.getAuthContext = originalGetAuthContext;
    apiUtilsModule.getSystemAdminClient = originalGetSystemAdminClient;
  });

  const { GET } = await import('../app/api/announcements/active/route');
  const response = await GET(new NextRequest('http://localhost/api/announcements/active'));
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.announcements.length, 1);
  assert.equal(payload.announcements[0].id, 'announcement-1');
  assert.equal(payload.announcements[0].priority, 'critical');
});

test('active announcements GET should filter out permanently dismissed announcements for signed-in users', async (t) => {
  const apiUtilsModule = require('../lib/api-utils') as any;
  const originalGetAuthContext = apiUtilsModule.getAuthContext;
  const originalGetSystemAdminClient = apiUtilsModule.getSystemAdminClient;

  apiUtilsModule.getAuthContext = async () => ({
    user: { id: 'user-1' },
    supabase: {},
  });
  apiUtilsModule.getSystemAdminClient = () => ({
    from: (table: string) => {
      if (table === 'announcements') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                or: () => ({
                  or: () => ({
                    order: async () => ({
                      data: [
                        {
                          id: 'announcement-1',
                          title: '系统维护公告',
                          content: '应当被过滤',
                          cta_label: null,
                          cta_href: null,
                          priority: 'normal',
                          display_order: 0,
                          starts_at: null,
                          ends_at: null,
                          popup_enabled: true,
                          audience_scope: 'all_visitors',
                          version: 2,
                          published_at: '2026-03-23T00:00:00.000Z',
                          created_at: '2026-03-23T00:00:00.000Z',
                          updated_at: '2026-03-23T00:00:00.000Z',
                        },
                      ],
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          }),
        };
      }

      if (table === 'announcement_user_states') {
        return {
          select: () => ({
            eq: () => ({
              in: async () => ({
                data: [
                  {
                    announcement_id: 'announcement-1',
                    version: 2,
                    dismissed_until: null,
                    dismissed_permanently_at: '2026-03-23T01:00:00.000Z',
                  },
                ],
                error: null,
              }),
            }),
          }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  });

  t.after(() => {
    apiUtilsModule.getAuthContext = originalGetAuthContext;
    apiUtilsModule.getSystemAdminClient = originalGetSystemAdminClient;
  });

  const { GET } = await import('../app/api/announcements/active/route');
  const response = await GET(new NextRequest('http://localhost/api/announcements/active'));
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(payload.announcements, []);
});

test('active announcements GET should respect display_order before published_at in popup ordering', async (t) => {
  const apiUtilsModule = require('../lib/api-utils') as any;
  const originalGetAuthContext = apiUtilsModule.getAuthContext;
  const originalGetSystemAdminClient = apiUtilsModule.getSystemAdminClient;

  apiUtilsModule.getAuthContext = async () => ({
    user: null,
    supabase: {},
  });
  apiUtilsModule.getSystemAdminClient = () => ({
    from: (table: string) => {
      assert.equal(table, 'announcements');
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              or: () => ({
                or: () => ({
                  order: async () => ({
                    data: [
                      {
                        id: 'announcement-later',
                        title: '后展示',
                        content: '内容',
                        cta_label: null,
                        cta_href: null,
                        priority: 'normal',
                        display_order: 20,
                        starts_at: null,
                        ends_at: null,
                        popup_enabled: true,
                        audience_scope: 'all_visitors',
                        version: 1,
                        published_at: '2026-03-23T10:00:00.000Z',
                        created_at: '2026-03-23T10:00:00.000Z',
                        updated_at: '2026-03-23T10:00:00.000Z',
                      },
                      {
                        id: 'announcement-earlier',
                        title: '先展示',
                        content: '内容',
                        cta_label: null,
                        cta_href: null,
                        priority: 'normal',
                        display_order: 1,
                        starts_at: null,
                        ends_at: null,
                        popup_enabled: true,
                        audience_scope: 'all_visitors',
                        version: 1,
                        published_at: '2026-03-23T09:00:00.000Z',
                        created_at: '2026-03-23T09:00:00.000Z',
                        updated_at: '2026-03-23T09:00:00.000Z',
                      },
                    ],
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      };
    },
  });

  t.after(() => {
    apiUtilsModule.getAuthContext = originalGetAuthContext;
    apiUtilsModule.getSystemAdminClient = originalGetSystemAdminClient;
  });

  const { GET } = await import('../app/api/announcements/active/route');
  const response = await GET(new NextRequest('http://localhost/api/announcements/active'));
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(
    payload.announcements.map((item: { id: string }) => item.id),
    ['announcement-earlier', 'announcement-later'],
  );
});

test('announcement dismiss POST should upsert user dismissal state for today-close', async (t) => {
  const apiUtilsModule = require('../lib/api-utils') as any;
  const originalRequireUserContext = apiUtilsModule.requireUserContext;
  const originalGetSystemAdminClient = apiUtilsModule.getSystemAdminClient;

  let upsertPayload: AnnouncementStateUpsertPayload | null = null;
  let upsertOptions: Record<string, unknown> | null = null;

  apiUtilsModule.requireUserContext = async () => ({
    user: { id: 'user-1' },
    supabase: {},
  });
  apiUtilsModule.getSystemAdminClient = () => ({
    from: (table: string) => {
      assert.equal(table, 'announcement_user_states');
      return {
        upsert: async (payload: AnnouncementStateUpsertPayload, options: Record<string, unknown>) => {
          upsertPayload = payload;
          upsertOptions = options;
          return { error: null };
        },
      };
    },
  });

  t.after(() => {
    apiUtilsModule.requireUserContext = originalRequireUserContext;
    apiUtilsModule.getSystemAdminClient = originalGetSystemAdminClient;
  });

  const { POST } = await import('../app/api/announcements/dismiss/route');
  const request = new NextRequest('http://localhost/api/announcements/dismiss', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      announcementId: '11111111-1111-4111-8111-111111111111',
      version: 3,
      mode: 'today',
      dismissedUntil: '2026-03-23T15:59:59.999Z',
    }),
  });

  const response = await POST(request);

  assert.equal(response.status, 200);
  assert.deepEqual(upsertOptions, {
    onConflict: 'announcement_id,user_id,version',
  });
  if (!upsertPayload) {
    throw new Error('expected upsertPayload to be captured');
  }
  const dismissedPayload: AnnouncementStateUpsertPayload = upsertPayload;
  assert.equal(dismissedPayload.announcement_id, '11111111-1111-4111-8111-111111111111');
  assert.equal(dismissedPayload.user_id, 'user-1');
  assert.equal(dismissedPayload.version, 3);
  assert.equal(dismissedPayload.dismissed_until, '2026-03-23T15:59:59.999Z');
  assert.equal(dismissedPayload.dismissed_permanently_at, null);
});

test('announcement dismiss POST should reject null request bodies with 400', async (t) => {
  const apiUtilsModule = require('../lib/api-utils') as any;
  const originalRequireUserContext = apiUtilsModule.requireUserContext;

  apiUtilsModule.requireUserContext = async () => ({
    user: { id: 'user-1' },
    supabase: {},
  });

  t.after(() => {
    apiUtilsModule.requireUserContext = originalRequireUserContext;
  });

  const { POST } = await import('../app/api/announcements/dismiss/route');
  const request = new NextRequest('http://localhost/api/announcements/dismiss', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: 'null',
  });

  const response = await POST(request);
  const payload = await response.json();

  assert.equal(response.status, 400);
  assert.equal(payload.error, '请求体不是合法对象');
});

test('announcement dismiss POST should reject non-uuid announcement ids before database upsert', async (t) => {
  const apiUtilsModule = require('../lib/api-utils') as any;
  const originalRequireUserContext = apiUtilsModule.requireUserContext;
  const originalGetSystemAdminClient = apiUtilsModule.getSystemAdminClient;

  let upsertCalled = false;

  apiUtilsModule.requireUserContext = async () => ({
    user: { id: 'user-1' },
    supabase: {},
  });
  apiUtilsModule.getSystemAdminClient = () => ({
    from: () => ({
      upsert: async () => {
        upsertCalled = true;
        return { error: null };
      },
    }),
  });

  t.after(() => {
    apiUtilsModule.requireUserContext = originalRequireUserContext;
    apiUtilsModule.getSystemAdminClient = originalGetSystemAdminClient;
  });

  const { POST } = await import('../app/api/announcements/dismiss/route');
  const request = new NextRequest('http://localhost/api/announcements/dismiss', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      announcementId: 'not-a-uuid',
      version: 1,
      mode: 'permanent',
    }),
  });

  const response = await POST(request);
  const payload = await response.json();

  assert.equal(response.status, 400);
  assert.equal(payload.error, '公告 ID 无效');
  assert.equal(upsertCalled, false);
});
