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

test('loadAppBootstrap should unwrap the route envelope into app bootstrap data', async () => {
  const originalFetch = global.fetch;

  global.fetch = async () => new Response(JSON.stringify({
    data: {
      viewerSummary: {
        userId: 'user-1',
        nickname: '缓存用户',
        avatarUrl: null,
        isAdmin: false,
        membershipType: 'free',
        membershipExpiresAt: null,
        aiChatCount: 3,
        lastCreditRestoreAt: null,
      },
      membership: {
        type: 'free',
        expiresAt: null,
        isActive: true,
        aiChatCount: 3,
        lastCreditRestoreAt: null,
      },
      featureToggles: { chat: false },
      featureTogglesLoaded: true,
      paymentPaused: true,
      paymentStatusLoaded: true,
      unreadCount: 7,
    },
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  }) as Response;

  try {
    const { loadAppBootstrap } = await import('../lib/app/bootstrap');
    const payload = await loadAppBootstrap();

    assert.equal(payload.viewerSummary?.userId, 'user-1');
    assert.equal(payload.featureToggles.chat, false);
    assert.equal(payload.paymentPaused, true);
    assert.equal(payload.unreadCount, 7);
  } finally {
    global.fetch = originalFetch;
  }
});

test('loadAppBootstrap should throw on request failure', async () => {
  const originalFetch = global.fetch;

  global.fetch = async () => new Response(JSON.stringify({ error: 'boom' }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' },
  }) as Response;

  try {
    const { loadAppBootstrap } = await import('../lib/app/bootstrap');
    await assert.rejects(() => loadAppBootstrap(), /boom/u);
  } finally {
    global.fetch = originalFetch;
  }
});

test('loadAppBootstrap should throw when feature or payment state is unavailable', async () => {
  const originalFetch = global.fetch;

  global.fetch = async () => new Response(JSON.stringify({
    data: {
      viewerLoaded: true,
      viewerSummary: null,
      membership: null,
      featureToggles: {},
      featureTogglesLoaded: false,
      paymentPaused: false,
      paymentStatusLoaded: true,
      unreadCount: 0,
    },
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  }) as Response;

  try {
    const { loadAppBootstrap } = await import('../lib/app/bootstrap');
    await assert.rejects(() => loadAppBootstrap(), /功能状态加载失败/u);
  } finally {
    global.fetch = originalFetch;
  }
});
