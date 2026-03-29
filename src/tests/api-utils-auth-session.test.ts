import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import type { Session, User } from '@supabase/supabase-js';

process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon';

test('getAuthContext should refresh cookie sessions when access token has expired', async () => {
  const { getAuthContext } = await import('../lib/api-utils');
  const { ACCESS_COOKIE, REFRESH_COOKIE } = await import('../lib/auth-session');

  const user = { id: 'user-1' } as User;
  const refreshedSession = {
    access_token: 'fresh-access-token',
    refresh_token: 'fresh-refresh-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user,
  } satisfies Session;

  const cookieWrites: Array<{ name: string; value: string; maxAge: number }> = [];
  const cookieStore = {
    set(name: string, value: string, options: { maxAge: number }) {
      cookieWrites.push({ name, value, maxAge: options.maxAge });
    },
    delete() {
      throw new Error('refreshing a valid session should not clear cookies');
    },
  };

  let refreshedAccessToken: string | null = null;
  const request = new NextRequest('http://localhost/api/notifications?count=1&unread=1', {
    headers: {
      cookie: `${ACCESS_COOKIE}=expired-access-token; ${REFRESH_COOKIE}=refresh-cookie-token`,
    },
  });

  const result = await getAuthContext(request, {
    authResolverClient: {
      auth: {
        async getUser(accessToken: string) {
          assert.equal(accessToken, 'expired-access-token');
          return {
            data: { user: null },
            error: { message: 'JWT expired' },
          };
        },
        async refreshSession(tokens: { refresh_token: string }) {
          assert.equal(tokens.refresh_token, 'refresh-cookie-token');
          return {
            data: { session: refreshedSession },
            error: null,
          };
        },
      },
    } as ReturnType<typeof import('../lib/api-utils').createAnonClient>,
    authedClientFactory(token: string) {
      refreshedAccessToken = token;
      return {
        auth: {
          async getUser() {
            return { data: { user }, error: null };
          },
        },
      } as ReturnType<typeof import('../lib/api-utils').createAuthedClient>;
    },
    cookieStore,
  });

  assert.equal(result.user?.id, 'user-1');
  assert.equal(refreshedAccessToken, 'fresh-access-token');
  assert.deepEqual(cookieWrites, [
    { name: ACCESS_COOKIE, value: 'fresh-access-token', maxAge: 3600 },
    { name: REFRESH_COOKIE, value: 'fresh-refresh-token', maxAge: 60 * 60 * 24 * 30 },
  ]);
});
