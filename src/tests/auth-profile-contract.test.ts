import test from 'node:test';
import assert from 'node:assert/strict';

type FetchLike = typeof global.fetch;

test('profile helpers should parse raw /api/user/profile payload shape', async () => {
  const originalFetch = global.fetch;

  global.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);

    if (url.endsWith('/api/user/profile')) {
      return new Response(JSON.stringify({
        profile: {
          id: 'user-1',
          nickname: '命理爱好者',
          avatar_url: 'https://example.com/avatar.png',
          is_admin: true,
          membership: 'plus',
          membership_expires_at: null,
          ai_chat_count: 9,
          last_credit_restore_at: null,
        },
        settings: {
          expressionStyle: 'gentle',
          customInstructions: 'keep calm',
          userProfile: { identity: 'tester' },
          promptKbIds: ['kb-1'],
          sidebarConfig: {
            hiddenNavItems: [],
            hiddenToolItems: [],
            navOrder: ['fortune-hub'],
            toolOrder: ['chat'],
            mobileMainItems: ['chat'],
            mobileDrawerOrder: ['chat'],
            hiddenMobileItems: [],
          },
          notificationsEnabled: true,
          notifyEmail: true,
          notifySite: true,
          language: 'zh',
          defaultBaziChartId: null,
          defaultZiweiChartId: null,
        },
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    throw new Error(`Unexpected fetch: ${url}`);
  }) as FetchLike;

  try {
    const authPath = require.resolve('../lib/auth');
    const profilePath = require.resolve('../lib/user/profile');
    delete require.cache[authPath];
    delete require.cache[profilePath];
    const authModule = require('../lib/auth') as typeof import('../lib/auth');

    const bundle = await authModule.getCurrentUserProfileBundle();
    assert.equal(bundle?.profile?.id, 'user-1');
    assert.equal(bundle?.settings?.expressionStyle, 'gentle');
    assert.deepEqual(bundle?.settings?.promptKbIds, ['kb-1']);

    const profile = await authModule.getUserProfile('user-1');
    assert.equal(profile?.nickname, '命理爱好者');
    assert.equal(profile?.is_admin, true);
  } finally {
    global.fetch = originalFetch;
  }
});

test('profile helpers should update nickname through /api/user/profile', async () => {
  const originalFetch = global.fetch;
  const requests: Array<{ url: string; method: string; body: unknown }> = [];

  global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method || 'GET';
    const body = init?.body ? JSON.parse(String(init.body)) : null;
    requests.push({ url, method, body });

    if (url.endsWith('/api/user/profile') && method === 'PATCH') {
      return new Response(JSON.stringify({
        profile: {
          id: 'user-1',
          nickname: '新昵称',
          avatar_url: null,
          is_admin: false,
          membership: 'free',
          membership_expires_at: null,
          ai_chat_count: 3,
          last_credit_restore_at: null,
        },
        settings: {
          expressionStyle: 'direct',
          customInstructions: '',
          userProfile: {},
          promptKbIds: [],
          sidebarConfig: {
            hiddenNavItems: [],
            hiddenToolItems: [],
            navOrder: [],
            toolOrder: [],
            mobileMainItems: [],
            mobileDrawerOrder: [],
            hiddenMobileItems: [],
          },
          notificationsEnabled: true,
          notifyEmail: true,
          notifySite: true,
          language: 'zh',
          defaultBaziChartId: null,
          defaultZiweiChartId: null,
        },
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (url.endsWith('/api/auth')) {
      return new Response(JSON.stringify({
        data: { user: null },
        error: null,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    throw new Error(`Unexpected fetch: ${url}`);
  }) as FetchLike;

  try {
    const authPath = require.resolve('../lib/auth');
    const profilePath = require.resolve('../lib/user/profile');
    delete require.cache[authPath];
    delete require.cache[profilePath];
    const authModule = require('../lib/auth') as typeof import('../lib/auth');

    const result = await authModule.updateNickname('user-1', '新昵称');
    assert.equal(result.success, true);
    assert.deepEqual(requests.find((request) => request.method === 'PATCH')?.body, {
      profile: {
        nickname: '新昵称',
      },
    });
  } finally {
    global.fetch = originalFetch;
  }
});

test('ensureUserRecord should forward bearer token to profile ensure endpoint', async () => {
  const originalFetch = global.fetch;
  const requests: Array<{ url: string; headers: Headers }> = [];

  global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const headers = new Headers(init?.headers || {});

    if (url.endsWith('/api/user/profile') && init?.method === 'POST') {
      requests.push({ url, headers });
      return new Response(JSON.stringify({
        data: { success: true },
        error: null,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    throw new Error(`Unexpected fetch: ${url}`);
  }) as FetchLike;

  try {
    const authPath = require.resolve('../lib/auth');
    delete require.cache[authPath];
    const authModule = require('../lib/auth') as typeof import('../lib/auth');

    await authModule.ensureUserRecord({ id: 'user-1' } as never, 'token-123');

    assert.equal(requests.length, 1);
    assert.equal(requests[0]?.headers.get('authorization'), 'Bearer token-123');
  } finally {
    global.fetch = originalFetch;
  }
});
