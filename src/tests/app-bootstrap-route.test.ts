import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';

process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-anon';

test('app bootstrap route should return viewer summary, membership, toggles, payment status and unread count', async (t) => {
  const apiUtilsModule = require('../lib/api-utils') as any;
  const appSettingsModule = require('../lib/app-settings') as any;
  const routePath = require.resolve('../app/api/app/bootstrap/route');

  const originalGetAuthContext = apiUtilsModule.getAuthContext;
  const originalJsonOk = apiUtilsModule.jsonOk;
  const originalReadFeatureTogglesState = appSettingsModule.readFeatureTogglesState;
  const originalReadPaymentsPausedState = appSettingsModule.readPaymentsPausedState;

  apiUtilsModule.getAuthContext = async () => ({
    user: {
      id: 'user-1',
      user_metadata: {
        nickname: '回退昵称',
        avatar_url: 'https://example.com/avatar.png',
      },
    },
    supabase: {
      from(table: string) {
        if (table === 'users') {
          return {
            select() {
              return {
                eq() {
                  return {
                    maybeSingle: async () => ({
                      data: {
                        id: 'user-1',
                        nickname: '正式昵称',
                        avatar_url: 'https://example.com/formal-avatar.png',
                        is_admin: true,
                        membership: 'pro',
                        membership_expires_at: '2099-01-01T00:00:00.000Z',
                        ai_chat_count: 88,
                        last_credit_restore_at: '2026-03-29T00:00:00.000Z',
                      },
                      error: null,
                    }),
                  };
                },
              };
            },
          };
        }

        if (table === 'notifications') {
          return {
            select() {
              return {
                eq() {
                  return {
                    gte() {
                      return {
                        eq: async () => ({
                          count: 4,
                          error: null,
                        }),
                      };
                    },
                  };
                },
              };
            },
          };
        }

        throw new Error(`unexpected table: ${table}`);
      },
    },
  });
  apiUtilsModule.jsonOk = (payload: unknown, status = 200) => Response.json(payload, { status });
  appSettingsModule.readFeatureTogglesState = async () => ({ loaded: true, toggles: { chat: false, tarot: true } });
  appSettingsModule.readPaymentsPausedState = async () => ({ loaded: true, paused: true });

  t.after(() => {
    apiUtilsModule.getAuthContext = originalGetAuthContext;
    apiUtilsModule.jsonOk = originalJsonOk;
    appSettingsModule.readFeatureTogglesState = originalReadFeatureTogglesState;
    appSettingsModule.readPaymentsPausedState = originalReadPaymentsPausedState;
    delete require.cache[routePath];
  });

  delete require.cache[routePath];
  const routeModule = require('../app/api/app/bootstrap/route') as typeof import('../app/api/app/bootstrap/route');
  const response = await routeModule.GET(new NextRequest('http://localhost/api/app/bootstrap'));
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.data.viewerLoaded, true);
  assert.equal(payload.data.viewerSummary.userId, 'user-1');
  assert.equal(payload.data.viewerSummary.nickname, '正式昵称');
  assert.equal(payload.data.viewerSummary.isAdmin, true);
  assert.equal(payload.data.membership.type, 'pro');
  assert.equal(payload.data.membership.aiChatCount, 88);
  assert.equal(payload.data.featureToggles.chat, false);
  assert.equal(payload.data.featureTogglesLoaded, true);
  assert.equal(payload.data.paymentPaused, true);
  assert.equal(payload.data.paymentStatusLoaded, true);
  assert.equal(payload.data.unreadCount, 4);
});

test('app bootstrap route should return public state for anonymous users', async (t) => {
  const apiUtilsModule = require('../lib/api-utils') as any;
  const appSettingsModule = require('../lib/app-settings') as any;
  const routePath = require.resolve('../app/api/app/bootstrap/route');

  const originalGetAuthContext = apiUtilsModule.getAuthContext;
  const originalJsonOk = apiUtilsModule.jsonOk;
  const originalReadFeatureTogglesState = appSettingsModule.readFeatureTogglesState;
  const originalReadPaymentsPausedState = appSettingsModule.readPaymentsPausedState;

  apiUtilsModule.getAuthContext = async () => ({
    user: null,
    supabase: {},
  });
  apiUtilsModule.jsonOk = (payload: unknown, status = 200) => Response.json(payload, { status });
  appSettingsModule.readFeatureTogglesState = async () => ({ loaded: true, toggles: { chat: false } });
  appSettingsModule.readPaymentsPausedState = async () => ({ loaded: true, paused: false });

  t.after(() => {
    apiUtilsModule.getAuthContext = originalGetAuthContext;
    apiUtilsModule.jsonOk = originalJsonOk;
    appSettingsModule.readFeatureTogglesState = originalReadFeatureTogglesState;
    appSettingsModule.readPaymentsPausedState = originalReadPaymentsPausedState;
    delete require.cache[routePath];
  });

  delete require.cache[routePath];
  const routeModule = require('../app/api/app/bootstrap/route') as typeof import('../app/api/app/bootstrap/route');
  const response = await routeModule.GET(new NextRequest('http://localhost/api/app/bootstrap'));
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.data.viewerLoaded, true);
  assert.equal(payload.data.viewerSummary, null);
  assert.equal(payload.data.membership, null);
  assert.equal(payload.data.featureToggles.chat, false);
  assert.equal(payload.data.featureTogglesLoaded, true);
  assert.equal(payload.data.paymentPaused, false);
  assert.equal(payload.data.paymentStatusLoaded, true);
  assert.equal(payload.data.unreadCount, 0);
});

test('app bootstrap route should mark toggles and payment status as unloaded when app settings reads fail', async (t) => {
  const apiUtilsModule = require('../lib/api-utils') as any;
  const appSettingsModule = require('../lib/app-settings') as any;
  const routePath = require.resolve('../app/api/app/bootstrap/route');

  const originalGetAuthContext = apiUtilsModule.getAuthContext;
  const originalJsonOk = apiUtilsModule.jsonOk;
  const originalReadFeatureTogglesState = appSettingsModule.readFeatureTogglesState;
  const originalReadPaymentsPausedState = appSettingsModule.readPaymentsPausedState;

  apiUtilsModule.getAuthContext = async () => ({
    user: null,
    supabase: {},
  });
  apiUtilsModule.jsonOk = (payload: unknown, status = 200) => Response.json(payload, { status });
  appSettingsModule.readFeatureTogglesState = async () => ({ loaded: false, toggles: {} });
  appSettingsModule.readPaymentsPausedState = async () => ({ loaded: false, paused: false });

  t.after(() => {
    apiUtilsModule.getAuthContext = originalGetAuthContext;
    apiUtilsModule.jsonOk = originalJsonOk;
    appSettingsModule.readFeatureTogglesState = originalReadFeatureTogglesState;
    appSettingsModule.readPaymentsPausedState = originalReadPaymentsPausedState;
    delete require.cache[routePath];
  });

  delete require.cache[routePath];
  const routeModule = require('../app/api/app/bootstrap/route') as typeof import('../app/api/app/bootstrap/route');
  const response = await routeModule.GET(new NextRequest('http://localhost/api/app/bootstrap'));
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.data.viewerLoaded, true);
  assert.deepEqual(payload.data.featureToggles, {});
  assert.equal(payload.data.featureTogglesLoaded, false);
  assert.equal(payload.data.paymentPaused, false);
  assert.equal(payload.data.paymentStatusLoaded, false);
});

test('app bootstrap route should mark viewer state as unloaded when profile lookup fails', async (t) => {
  const apiUtilsModule = require('../lib/api-utils') as any;
  const appSettingsModule = require('../lib/app-settings') as any;
  const routePath = require.resolve('../app/api/app/bootstrap/route');

  const originalGetAuthContext = apiUtilsModule.getAuthContext;
  const originalJsonOk = apiUtilsModule.jsonOk;
  const originalReadFeatureTogglesState = appSettingsModule.readFeatureTogglesState;
  const originalReadPaymentsPausedState = appSettingsModule.readPaymentsPausedState;

  apiUtilsModule.getAuthContext = async () => ({
    user: {
      id: 'user-1',
      user_metadata: {
        nickname: '回退昵称',
      },
    },
    supabase: {
      from(table: string) {
        if (table === 'users') {
          return {
            select() {
              return {
                eq() {
                  return {
                    maybeSingle: async () => ({
                      data: null,
                      error: { message: 'boom' },
                    }),
                  };
                },
              };
            },
          };
        }

        if (table === 'notifications') {
          return {
            select() {
              return {
                eq() {
                  return {
                    gte() {
                      return {
                        eq: async () => ({
                          count: 2,
                          error: null,
                        }),
                      };
                    },
                  };
                },
              };
            },
          };
        }

        throw new Error(`unexpected table: ${table}`);
      },
    },
  });
  apiUtilsModule.jsonOk = (payload: unknown, status = 200) => Response.json(payload, { status });
  appSettingsModule.readFeatureTogglesState = async () => ({ loaded: true, toggles: { chat: false } });
  appSettingsModule.readPaymentsPausedState = async () => ({ loaded: true, paused: false });

  t.after(() => {
    apiUtilsModule.getAuthContext = originalGetAuthContext;
    apiUtilsModule.jsonOk = originalJsonOk;
    appSettingsModule.readFeatureTogglesState = originalReadFeatureTogglesState;
    appSettingsModule.readPaymentsPausedState = originalReadPaymentsPausedState;
    delete require.cache[routePath];
  });

  delete require.cache[routePath];
  const routeModule = require('../app/api/app/bootstrap/route') as typeof import('../app/api/app/bootstrap/route');
  const response = await routeModule.GET(new NextRequest('http://localhost/api/app/bootstrap'));
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.data.viewerLoaded, false);
  assert.equal(payload.data.viewerSummary, null);
  assert.equal(payload.data.membership, null);
  assert.equal(payload.data.unreadCount, 2);
});

test('app bootstrap route should fall back to free membership defaults when the user row is missing', async (t) => {
  const apiUtilsModule = require('../lib/api-utils') as any;
  const appSettingsModule = require('../lib/app-settings') as any;
  const routePath = require.resolve('../app/api/app/bootstrap/route');

  const originalGetAuthContext = apiUtilsModule.getAuthContext;
  const originalJsonOk = apiUtilsModule.jsonOk;
  const originalReadFeatureTogglesState = appSettingsModule.readFeatureTogglesState;
  const originalReadPaymentsPausedState = appSettingsModule.readPaymentsPausedState;

  apiUtilsModule.getAuthContext = async () => ({
    user: {
      id: 'user-1',
      user_metadata: {
        nickname: '回退昵称',
        avatar_url: 'https://example.com/avatar.png',
      },
    },
    supabase: {
      from(table: string) {
        if (table === 'users') {
          return {
            select() {
              return {
                eq() {
                  return {
                    maybeSingle: async () => ({
                      data: null,
                      error: null,
                    }),
                  };
                },
              };
            },
          };
        }

        if (table === 'notifications') {
          return {
            select() {
              return {
                eq() {
                  return {
                    gte() {
                      return {
                        eq: async () => ({
                          count: 0,
                          error: null,
                        }),
                      };
                    },
                  };
                },
              };
            },
          };
        }

        throw new Error(`unexpected table: ${table}`);
      },
    },
  });
  apiUtilsModule.jsonOk = (payload: unknown, status = 200) => Response.json(payload, { status });
  appSettingsModule.readFeatureTogglesState = async () => ({ loaded: true, toggles: { chat: false } });
  appSettingsModule.readPaymentsPausedState = async () => ({ loaded: true, paused: false });

  t.after(() => {
    apiUtilsModule.getAuthContext = originalGetAuthContext;
    apiUtilsModule.jsonOk = originalJsonOk;
    appSettingsModule.readFeatureTogglesState = originalReadFeatureTogglesState;
    appSettingsModule.readPaymentsPausedState = originalReadPaymentsPausedState;
    delete require.cache[routePath];
  });

  delete require.cache[routePath];
  const routeModule = require('../app/api/app/bootstrap/route') as typeof import('../app/api/app/bootstrap/route');
  const response = await routeModule.GET(new NextRequest('http://localhost/api/app/bootstrap'));
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.data.viewerLoaded, true);
  assert.equal(payload.data.viewerSummary.userId, 'user-1');
  assert.equal(payload.data.viewerSummary.membershipType, 'free');
  assert.equal(payload.data.viewerSummary.aiChatCount, 3);
  assert.equal(payload.data.membership.type, 'free');
  assert.equal(payload.data.membership.aiChatCount, 3);
});
