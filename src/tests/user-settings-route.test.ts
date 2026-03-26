import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';

process.env.SUPABASE_URL = 'http://localhost';
process.env.SUPABASE_ANON_KEY = 'test-anon';

test('user settings route should return normalized settings bundle for the current user', async (t) => {
  const apiUtilsModule = require('../lib/api-utils') as typeof import('../lib/api-utils');
  type RequireUserContextResult = Awaited<ReturnType<typeof apiUtilsModule.requireUserContext>>;
  const originalRequireUserContext = apiUtilsModule.requireUserContext;

  apiUtilsModule.requireUserContext = async () => ({
    user: { id: 'user-1' } as Awaited<ReturnType<typeof import('../lib/api-utils').getAuthContext>>['user'],
    supabase: {
      from(table: string) {
        assert.equal(table, 'user_settings');
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  expression_style: 'gentle',
                  custom_instructions: 'keep calm',
                  user_profile: { career: 'engineer' },
                  prompt_kb_ids: ['kb-2', 'kb-1'],
                  visualization_settings: {
                    selectedDimensions: ['career', 'wealth'],
                    dayunDisplayCount: 6,
                    chartStyle: 'dark',
                  },
                },
                error: null,
              }),
            }),
          }),
        };
      },
    } as never,
  } as unknown as RequireUserContextResult);

  t.after(() => {
    apiUtilsModule.requireUserContext = originalRequireUserContext;
  });

  const { GET } = await import('../app/api/user/settings/route');
  const response = await GET(new NextRequest('http://localhost/api/user/settings'));
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.settings.expressionStyle, 'gentle');
  assert.deepEqual(payload.settings.promptKbIds, ['kb-2', 'kb-1']);
  assert.deepEqual(payload.settings.visualizationSettings, {
    selectedDimensions: ['career', 'wealth'],
    dayunDisplayCount: 6,
    chartStyle: 'dark',
  });
});

test('user settings route PATCH should update only user_settings without touching removed feature subscriptions', async (t) => {
  const apiUtilsModule = require('../lib/api-utils') as typeof import('../lib/api-utils');
  type RequireUserContextResult = Awaited<ReturnType<typeof apiUtilsModule.requireUserContext>>;
  const originalRequireUserContext = apiUtilsModule.requireUserContext;
  const touchedTables: string[] = [];

  apiUtilsModule.requireUserContext = async () => ({
    user: { id: 'user-1' } as Awaited<ReturnType<typeof import('../lib/api-utils').getAuthContext>>['user'],
    supabase: {
      from(table: string) {
        touchedTables.push(table);
        assert.equal(table, 'user_settings');
        return {
          upsert: () => ({ error: null }),
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  notifications_enabled: false,
                  notify_email: false,
                  notify_site: false,
                  visualization_settings: {
                    selectedDimensions: ['career', 'health'],
                    dayunDisplayCount: 4,
                    chartStyle: 'modern',
                  },
                },
                error: null,
              }),
            }),
          }),
        };
      },
    } as never,
  } as unknown as RequireUserContextResult);

  t.after(() => {
    apiUtilsModule.requireUserContext = originalRequireUserContext;
  });

  const { PATCH } = await import('../app/api/user/settings/route');
  const response = await PATCH(new NextRequest('http://localhost/api/user/settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      notificationsEnabled: false,
      visualizationSettings: {
        selectedDimensions: ['career', 'health'],
        dayunDisplayCount: 4,
        chartStyle: 'modern',
      },
    }),
  }));
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.settings.notificationsEnabled, false);
  assert.deepEqual(payload.settings.visualizationSettings, {
    selectedDimensions: ['career', 'health'],
    dayunDisplayCount: 4,
    chartStyle: 'modern',
  });
  assert.deepEqual(touchedTables, ['user_settings', 'user_settings']);
});
