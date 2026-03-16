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
        settings: null,
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
    assert.equal(bundle?.settings, null);

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
        settings: null,
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
