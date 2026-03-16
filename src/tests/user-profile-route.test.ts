import test from 'node:test';
import assert from 'node:assert/strict';

process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-anon';

test('user profile route should update profile fields without touching user_settings', async (t) => {
  const apiUtilsPath = require.resolve('../lib/api-utils');
  const routePath = require.resolve('../app/api/user/profile/route');
  const apiUtilsModule = require('../lib/api-utils');

  const originalRequireUserContext = apiUtilsModule.requireUserContext;
  const originalJsonOk = apiUtilsModule.jsonOk;
  const originalJsonError = apiUtilsModule.jsonError;

  const calls: Array<{ table: string; action: string; payload?: Record<string, unknown> }> = [];

  const makeUsersQuery = (nickname = '命理爱好者') => ({
    select() {
      return this;
    },
    eq() {
      return this;
    },
    maybeSingle: async () => ({
      data: {
        id: 'user-1',
        nickname,
        avatar_url: null,
        is_admin: false,
        membership: 'free',
        membership_expires_at: null,
        ai_chat_count: 3,
        last_credit_restore_at: null,
      },
      error: null,
    }),
  });

  const fakeSupabase = {
    from(table: string) {
      if (table === 'users') {
        return {
          ...makeUsersQuery(),
          update(payload: Record<string, unknown>) {
            calls.push({ table, action: 'update', payload });
            return makeUsersQuery(String(payload.nickname ?? '命理爱好者'));
          },
        };
      }

      if (table === 'user_settings') {
        throw new Error('user_settings should not be touched after removing community anonymity');
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  };

  apiUtilsModule.requireUserContext = async () => ({
    user: { id: 'user-1' },
    supabase: fakeSupabase,
  });
  apiUtilsModule.jsonOk = (payload: unknown, status = 200) => Response.json(payload, { status });
  apiUtilsModule.jsonError = (message: string, status = 400) => Response.json({ error: message }, { status });

  t.after(() => {
    apiUtilsModule.requireUserContext = originalRequireUserContext;
    apiUtilsModule.jsonOk = originalJsonOk;
    apiUtilsModule.jsonError = originalJsonError;
    delete require.cache[routePath];
    delete require.cache[apiUtilsPath];
  });

  delete require.cache[routePath];
  const routeModule = require('../app/api/user/profile/route') as typeof import('../app/api/user/profile/route');

  const response = await routeModule.PATCH(new Request('http://localhost/api/user/profile', {
    method: 'PATCH',
    body: JSON.stringify({
      profile: {
        nickname: '新昵称',
      },
    }),
    headers: { 'Content-Type': 'application/json' },
  }) as never);

  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.table, 'users');
  assert.equal(calls[0]?.action, 'update');
  assert.equal(calls[0]?.payload?.nickname, '新昵称');
  assert.equal(payload.profile?.nickname, '新昵称');
  assert.equal(payload.settings, null);
});
