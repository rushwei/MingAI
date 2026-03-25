import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';

process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-anon';

type InsertedAnnouncementPayload = {
  title: string;
  status: string;
  priority: string;
  popup_enabled: boolean;
  audience_scope: string;
  version: number;
  created_by: string;
  updated_by: string;
  published_at?: string | null;
};

type UpdatedAnnouncementPayload = {
  title: string;
  content: string;
  cta_label: string | null;
  cta_href: string | null;
  published_at?: string | null;
  version?: number;
  updated_by: string;
};

test('admin announcements POST should create a published announcement with popup defaults', async (t) => {
  const apiUtilsModule = require('../lib/api-utils') as any;
  const originalRequireAdminContext = apiUtilsModule.requireAdminContext;
  const originalGetSystemAdminClient = apiUtilsModule.getSystemAdminClient;

  let insertedPayload: InsertedAnnouncementPayload | null = null;

  apiUtilsModule.requireAdminContext = async () => ({
    user: { id: 'admin-1' },
    supabase: {},
  });
  apiUtilsModule.getSystemAdminClient = () => ({
    from: (table: string) => {
      assert.equal(table, 'announcements');
      return {
        insert: (payload: InsertedAnnouncementPayload) => {
          insertedPayload = payload;
          return {
            select: () => ({
              single: async () => ({
                data: {
                  id: 'announcement-1',
                  ...payload,
                  created_at: '2026-03-23T00:00:00.000Z',
                  updated_at: '2026-03-23T00:00:00.000Z',
                },
                error: null,
              }),
            }),
          };
        },
      };
    },
  });

  t.after(() => {
    apiUtilsModule.requireAdminContext = originalRequireAdminContext;
    apiUtilsModule.getSystemAdminClient = originalGetSystemAdminClient;
  });

  const { POST } = await import('../app/api/admin/announcements/route');
  const request = new NextRequest('http://localhost/api/admin/announcements', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: '系统维护公告',
      content: '今晚 23:00 到 23:30 进行短时维护',
      status: 'published',
      priority: 'critical',
      ctaLabel: '查看详情',
      ctaHref: '/status',
    }),
  });

  const response = await POST(request);
  const payload = await response.json();

  assert.equal(response.status, 200);
  if (!insertedPayload) {
    throw new Error('expected insertedPayload to be captured');
  }
  const createdPayload: InsertedAnnouncementPayload = insertedPayload;
  assert.equal(createdPayload.title, '系统维护公告');
  assert.equal(createdPayload.status, 'published');
  assert.equal(createdPayload.priority, 'critical');
  assert.equal(createdPayload.popup_enabled, true);
  assert.equal(createdPayload.audience_scope, 'all_visitors');
  assert.equal(createdPayload.version, 1);
  assert.equal(createdPayload.created_by, 'admin-1');
  assert.equal(createdPayload.updated_by, 'admin-1');
  assert.equal(typeof createdPayload.published_at, 'string');
  assert.equal(payload.announcement.id, 'announcement-1');
});

test('admin announcements POST should reject unsafe CTA urls', async (t) => {
  const apiUtilsModule = require('../lib/api-utils') as any;
  const originalRequireAdminContext = apiUtilsModule.requireAdminContext;
  const originalGetSystemAdminClient = apiUtilsModule.getSystemAdminClient;

  let insertCalled = false;

  apiUtilsModule.requireAdminContext = async () => ({
    user: { id: 'admin-1' },
    supabase: {},
  });
  apiUtilsModule.getSystemAdminClient = () => ({
    from: () => ({
      insert: () => {
        insertCalled = true;
        throw new Error('insert should not be called for unsafe CTA');
      },
    }),
  });

  t.after(() => {
    apiUtilsModule.requireAdminContext = originalRequireAdminContext;
    apiUtilsModule.getSystemAdminClient = originalGetSystemAdminClient;
  });

  const { POST } = await import('../app/api/admin/announcements/route');
  const request = new NextRequest('http://localhost/api/admin/announcements', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: '危险公告',
      content: '请不要保存',
      ctaLabel: '点我',
      ctaHref: 'javascript:alert(1)',
    }),
  });

  const response = await POST(request);
  const payload = await response.json();

  assert.equal(response.status, 400);
  assert.equal(payload.error, '按钮链接不安全');
  assert.equal(insertCalled, false);
});

test('admin announcements PATCH should bump version when editing a published announcement', async (t) => {
  const apiUtilsModule = require('../lib/api-utils') as any;
  const originalRequireAdminContext = apiUtilsModule.requireAdminContext;
  const originalGetSystemAdminClient = apiUtilsModule.getSystemAdminClient;

  let updatedPayload: UpdatedAnnouncementPayload | null = null;

  apiUtilsModule.requireAdminContext = async () => ({
    user: { id: 'admin-1' },
    supabase: {},
  });
  apiUtilsModule.getSystemAdminClient = () => ({
    from: (table: string) => {
      assert.equal(table, 'announcements');
      return {
        select: () => ({
          eq: () => ({
            single: async () => ({
              data: {
                id: 'announcement-1',
                title: '旧标题',
                content: '旧内容',
                cta_label: '旧按钮',
                cta_href: '/old',
                status: 'published',
                priority: 'normal',
                display_order: 0,
                starts_at: null,
                ends_at: null,
                popup_enabled: true,
                audience_scope: 'all_visitors',
                version: 2,
                published_at: '2026-03-21T10:00:00.000Z',
              },
              error: null,
            }),
          }),
        }),
        update: (payload: UpdatedAnnouncementPayload) => {
          updatedPayload = payload;
          return {
            eq: () => ({
              select: () => ({
                single: async () => ({
                  data: {
                    id: 'announcement-1',
                    ...payload,
                    updated_at: '2026-03-23T00:00:00.000Z',
                  },
                  error: null,
                }),
              }),
            }),
          };
        },
      };
    },
  });

  t.after(() => {
    apiUtilsModule.requireAdminContext = originalRequireAdminContext;
    apiUtilsModule.getSystemAdminClient = originalGetSystemAdminClient;
  });

  const { PATCH } = await import('../app/api/admin/announcements/[id]/route');
  const request = new NextRequest('http://localhost/api/admin/announcements/announcement-1', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: '新标题',
      content: '新内容',
      ctaLabel: '立即查看',
      ctaHref: '/new',
    }),
  });

  const response = await PATCH(request, { params: Promise.resolve({ id: 'announcement-1' }) });

  assert.equal(response.status, 200);
  if (!updatedPayload) {
    throw new Error('expected updatedPayload to be captured');
  }
  const patchedPayload: UpdatedAnnouncementPayload = updatedPayload;
  assert.equal(patchedPayload.title, '新标题');
  assert.equal(patchedPayload.content, '新内容');
  assert.equal(patchedPayload.cta_label, '立即查看');
  assert.equal(patchedPayload.cta_href, '/new');
  assert.equal(patchedPayload.version, 3);
  assert.equal(patchedPayload.updated_by, 'admin-1');
});

test('admin announcements PATCH should bump version when republishing an edited archived announcement', async (t) => {
  const apiUtilsModule = require('../lib/api-utils') as any;
  const originalRequireAdminContext = apiUtilsModule.requireAdminContext;
  const originalGetSystemAdminClient = apiUtilsModule.getSystemAdminClient;

  let updatedPayload: UpdatedAnnouncementPayload | null = null;

  apiUtilsModule.requireAdminContext = async () => ({
    user: { id: 'admin-1' },
    supabase: {},
  });
  apiUtilsModule.getSystemAdminClient = () => ({
    from: (table: string) => {
      assert.equal(table, 'announcements');
      return {
        select: () => ({
          eq: () => ({
            single: async () => ({
              data: {
                id: 'announcement-2',
                title: '旧公告',
                content: '旧内容',
                cta_label: null,
                cta_href: null,
                status: 'archived',
                priority: 'normal',
                display_order: 0,
                starts_at: null,
                ends_at: null,
                popup_enabled: true,
                audience_scope: 'all_visitors',
                version: 2,
                published_at: '2026-03-21T10:00:00.000Z',
              },
              error: null,
            }),
          }),
        }),
        update: (payload: UpdatedAnnouncementPayload) => {
          updatedPayload = payload;
          return {
            eq: () => ({
              select: () => ({
                single: async () => ({
                  data: {
                    id: 'announcement-2',
                    ...payload,
                    updated_at: '2026-03-23T00:00:00.000Z',
                  },
                  error: null,
                }),
              }),
            }),
          };
        },
      };
    },
  });

  t.after(() => {
    apiUtilsModule.requireAdminContext = originalRequireAdminContext;
    apiUtilsModule.getSystemAdminClient = originalGetSystemAdminClient;
  });

  const { PATCH } = await import('../app/api/admin/announcements/[id]/route');
  const request = new NextRequest('http://localhost/api/admin/announcements/announcement-2', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: '重新发布公告',
      content: '新内容',
      status: 'published',
    }),
  });

  const response = await PATCH(request, { params: Promise.resolve({ id: 'announcement-2' }) });

  assert.equal(response.status, 200);
  if (!updatedPayload) {
    throw new Error('expected updatedPayload to be captured');
  }
  const republishedPayload: UpdatedAnnouncementPayload = updatedPayload;
  assert.equal(republishedPayload.title, '重新发布公告');
  assert.equal(republishedPayload.content, '新内容');
  assert.equal(republishedPayload.version, 3);
  assert.equal(typeof republishedPayload.published_at, 'string');
  assert.notEqual(republishedPayload.published_at, '2026-03-21T10:00:00.000Z');
});
