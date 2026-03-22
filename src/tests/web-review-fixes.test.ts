import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';

process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-anon';

test('notifications launch route should honor selected template content for site notifications', async (t) => {
  const apiUtils = require('../lib/api-utils') as any;

  const originalRequireAdminContext = apiUtils.requireAdminContext;
  const originalGetSystemAdminClient = apiUtils.getSystemAdminClient;

  const insertedNotifications: Array<{ title?: string; content?: string }> = [];

  apiUtils.requireAdminContext = async () => ({
    user: { id: 'admin-1' },
    supabase: {},
  });
  apiUtils.getSystemAdminClient = () => ({
    from: (table: string) => {
      if (table === 'users') {
        return {
          select: () => ({
            order: async () => ({
              data: [{ id: 'user-1' }],
              error: null,
            }),
          }),
        };
      }

      if (table === 'notifications') {
        return {
          insert: async (payload: Record<string, unknown>) => {
            insertedNotifications.push(payload);
            return { error: null };
          },
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  });

  t.after(() => {
    apiUtils.requireAdminContext = originalRequireAdminContext;
    apiUtils.getSystemAdminClient = originalGetSystemAdminClient;
  });

  const { POST } = await import('../app/api/notifications/launch/route');
  const request = new NextRequest('http://localhost/api/notifications/launch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      featureKey: 'liuyao',
      featureUrl: '/liuyao',
      templateId: 'promo_discount',
      templateVars: {
        discount: '限时五折',
        description: '六爻高级分析开放',
        end_date: '本周日',
      },
    }),
  });

  const response = await POST(request);
  assert.equal(response.status, 200);
  assert.equal(insertedNotifications.length, 1);
  assert.equal(insertedNotifications[0]?.title, '🔥 限时优惠：限时五折');
  assert.equal(insertedNotifications[0]?.content, '限时特惠！六爻高级分析开放，活动截止至 本周日，抓紧时间！');
});

test('notifications launch route should preserve absolute links instead of forcing them into the current site path', async (t) => {
  const apiUtils = require('../lib/api-utils') as any;

  const originalRequireAdminContext = apiUtils.requireAdminContext;
  const originalGetSystemAdminClient = apiUtils.getSystemAdminClient;

  const insertedNotifications: Array<{ link?: string }> = [];

  apiUtils.requireAdminContext = async () => ({
    user: { id: 'admin-1' },
    supabase: {},
  });
  apiUtils.getSystemAdminClient = () => ({
    from: (table: string) => {
      if (table === 'users') {
        return {
          select: () => ({
            order: async () => ({
              data: [{ id: 'user-1' }],
              error: null,
            }),
          }),
        };
      }

      if (table === 'notifications') {
        return {
          insert: async (payload: Record<string, unknown>) => {
            insertedNotifications.push(payload);
            return { error: null };
          },
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  });

  t.after(() => {
    apiUtils.requireAdminContext = originalRequireAdminContext;
    apiUtils.getSystemAdminClient = originalGetSystemAdminClient;
  });

  const { POST } = await import('../app/api/notifications/launch/route');
  const request = new NextRequest('http://localhost/api/notifications/launch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      featureKey: 'liuyao',
      featureUrl: 'https://docs.example.com/features/liuyao?ref=launch',
    }),
  });

  const response = await POST(request);
  assert.equal(response.status, 200);
  assert.equal(insertedNotifications.length, 1);
  assert.equal(insertedNotifications[0]?.link, 'https://docs.example.com/features/liuyao?ref=launch');
});

test('notifications launch route should send site announcements to all users without feature subscriptions', async (t) => {
  const apiUtils = require('../lib/api-utils') as any;

  const originalRequireAdminContext = apiUtils.requireAdminContext;
  const originalGetSystemAdminClient = apiUtils.getSystemAdminClient;

  const insertedNotifications: Array<{ user_id?: string; title?: string; content?: string }> = [];

  apiUtils.requireAdminContext = async () => ({
    user: { id: 'admin-1' },
    supabase: {},
  });
  apiUtils.getSystemAdminClient = () => ({
    from: (table: string) => {
      if (table === 'users') {
        return {
          select: () => ({
            order: async () => ({
              data: [{ id: 'user-1' }, { id: 'user-2' }],
              error: null,
            }),
          }),
        };
      }

      if (table === 'notifications') {
        return {
          insert: async (payload: Record<string, unknown>) => {
            insertedNotifications.push(payload);
            return { error: null };
          },
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  });

  t.after(() => {
    apiUtils.requireAdminContext = originalRequireAdminContext;
    apiUtils.getSystemAdminClient = originalGetSystemAdminClient;
  });

  const { POST } = await import('../app/api/notifications/launch/route');
  const request = new NextRequest('http://localhost/api/notifications/launch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      featureKey: 'qimen',
      featureUrl: '/qimen',
    }),
  });

  const response = await POST(request);
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(insertedNotifications.length, 2);
  assert.deepEqual(insertedNotifications.map((item) => item.user_id), ['user-1', 'user-2']);
  assert.match(String(insertedNotifications[0]?.content), /奇门遁甲功能现已正式上线/u);
  assert.doesNotMatch(String(insertedNotifications[0]?.content), /订阅/u);
  assert.equal(payload.stats.total, 2);
  assert.equal(payload.stats.siteEligible, 2);
  assert.equal(payload.stats.siteSkipped, 0);
  assert.equal(payload.stats.notifications, 2);
});

test('history restore payload should use a fresh timestamp query instead of the static history id', async () => {
  const originalNow = Date.now;
  Date.now = () => 1700000000000;

  try {
    const historyClient = await import('../lib/history/client');
    const target = historyClient.applyHistoryRestorePayload({
      sessionKey: 'tarot_result',
      detailPath: '/tarot/result',
      useTimestamp: true,
      sessionData: {},
    });

    assert.equal(target, '/tarot/result?from=history&t=1700000000000');
  } finally {
    Date.now = originalNow;
  }
});
