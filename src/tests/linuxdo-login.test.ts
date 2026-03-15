import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';

process.env.LINUXDO_CLIENT_ID = 'linuxdo-client-id';
process.env.LINUXDO_CLIENT_SECRET = 'linuxdo-client-secret';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon';

type MockFetchResponse = {
  ok: boolean;
  status: number;
  text?: () => Promise<string>;
  json?: () => Promise<unknown>;
};

test('fetchUserInfo should retry backup endpoint and normalize legacy Linux.do payload', async (t) => {
  const originalFetch = global.fetch;
  const calls: string[] = [];

  const legacyPayload = {
    sub: 'linuxdo-user-1',
    username: 'alice',
    name: 'Alice',
    email: 'alice@example.com',
    avatar_url: 'https://cdn.example.com/avatar.png',
  };

  global.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    calls.push(url);

    if (url === 'https://connect.linux.do/api/user') {
      return {
        ok: false,
        status: 503,
        text: async () => 'upstream blocked',
      } satisfies MockFetchResponse as Response;
    }

    if (url === 'https://connect.linuxdo.org/api/user') {
      return {
        ok: true,
        status: 200,
        json: async () => legacyPayload,
      } satisfies MockFetchResponse as Response;
    }

    throw new Error(`unexpected fetch url: ${url}`);
  }) as typeof fetch;

  t.after(() => {
    global.fetch = originalFetch;
  });

  const { fetchUserInfo } = await import('../lib/oauth/linuxdo');
  const user = await fetchUserInfo('access-token');

  assert.deepEqual(calls, [
    'https://connect.linux.do/api/user',
    'https://connect.linuxdo.org/api/user',
  ]);
  assert.equal(user.preferred_username, 'alice');
  assert.equal(user.picture, 'https://cdn.example.com/avatar.png');
  assert.equal(user.email_verified, undefined);
});

test('exchangeCode should retry backup token endpoint when primary host fails', async (t) => {
  const originalFetch = global.fetch;
  const calls: string[] = [];

  global.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    calls.push(url);

    if (url === 'https://connect.linux.do/oauth2/token') {
      return {
        ok: false,
        status: 502,
        text: async () => 'bad gateway',
      } satisfies MockFetchResponse as Response;
    }

    if (url === 'https://connect.linuxdo.org/oauth2/token') {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          access_token: 'token-from-backup',
          token_type: 'bearer',
          refresh_token: 'refresh-from-backup',
        }),
      } satisfies MockFetchResponse as Response;
    }

    throw new Error(`unexpected fetch url: ${url}`);
  }) as typeof fetch;

  t.after(() => {
    global.fetch = originalFetch;
  });

  const { exchangeCode } = await import('../lib/oauth/linuxdo');
  const token = await exchangeCode(
    'oauth-code',
    'code-verifier',
    'https://mingai.fun/api/auth/linuxdo/callback',
  );

  assert.deepEqual(calls, [
    'https://connect.linux.do/oauth2/token',
    'https://connect.linuxdo.org/oauth2/token',
  ]);
  assert.equal(token.access_token, 'token-from-backup');
  assert.equal(token.refresh_token, 'refresh-from-backup');
});

test('linuxdo callback should not reject login when email_verified claim is missing', async (t) => {
  const linuxdoModule = require('../lib/oauth/linuxdo') as {
    exchangeCode: (code: string, verifier: string, redirectUri: string) => Promise<{ access_token: string }>;
    fetchUserInfo: (accessToken: string) => Promise<Record<string, unknown>>;
    generateDeterministicPassword: (sub: string) => string;
  };
  const apiUtilsModule = require('../lib/api-utils') as {
    createAnonClient: () => {
      auth: {
        signUp: (args: unknown) => Promise<{ data: { session: { user: { id: string } } }; error: null }>;
      };
    };
    getServiceRoleClient: () => {
      from: (table: string) => {
        select?: () => { eq: (field: string, value: string) => { eq?: (field2: string, value2: string) => { maybeSingle: () => Promise<{ data: { user_id: string } | null }> }; maybeSingle?: () => Promise<{ data: { id: string } | null }> } };
        upsert?: () => Promise<{ error: null }>;
        insert?: () => Promise<{ error: null }>;
      };
    };
  };
  const authSessionModule = require('../lib/auth-session') as {
    setSessionCookies: (response: Response, session: unknown) => void;
  };

  const originalExchangeCode = linuxdoModule.exchangeCode;
  const originalFetchUserInfo = linuxdoModule.fetchUserInfo;
  const originalGenerateDeterministicPassword = linuxdoModule.generateDeterministicPassword;
  const originalCreateAnonClient = apiUtilsModule.createAnonClient;
  const originalGetServiceRoleClient = apiUtilsModule.getServiceRoleClient;
  const originalSetSessionCookies = authSessionModule.setSessionCookies;

  linuxdoModule.exchangeCode = async () => ({ access_token: 'access-token' });
  linuxdoModule.fetchUserInfo = async () => ({
    sub: 'linuxdo-user-1',
    preferred_username: 'alice',
    name: 'Alice',
    email: 'alice@example.com',
    picture: 'https://cdn.example.com/avatar.png',
  });
  linuxdoModule.generateDeterministicPassword = () => 'deterministic-password';

  apiUtilsModule.createAnonClient = () => ({
    auth: {
      signUp: async () => ({
        data: {
          session: {
            user: { id: 'user-1' },
          },
        },
        error: null,
      }),
    },
  });

  apiUtilsModule.getServiceRoleClient = () => ({
    from: (table: string) => {
      if (table === 'user_oauth_providers') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: null }),
              }),
            }),
          }),
          insert: async () => ({ error: null }),
        };
      }

      if (table === 'users') {
        return {
          upsert: async () => ({ error: null }),
        };
      }

      throw new Error(`unexpected table: ${table}`);
    },
  });

  authSessionModule.setSessionCookies = () => {};

  t.after(() => {
    linuxdoModule.exchangeCode = originalExchangeCode;
    linuxdoModule.fetchUserInfo = originalFetchUserInfo;
    linuxdoModule.generateDeterministicPassword = originalGenerateDeterministicPassword;
    apiUtilsModule.createAnonClient = originalCreateAnonClient;
    apiUtilsModule.getServiceRoleClient = originalGetServiceRoleClient;
    authSessionModule.setSessionCookies = originalSetSessionCookies;
  });

  const { GET } = await import('../app/api/auth/linuxdo/callback/route');
  const stateValue = encodeURIComponent(JSON.stringify({
    state: 'expected-state',
    codeVerifier: 'code-verifier',
  }));
  const request = new NextRequest(
    'http://localhost/api/auth/linuxdo/callback?code=oauth-code&state=expected-state',
    {
      headers: {
        cookie: `linuxdo-oauth-state=${stateValue}`,
      },
    },
  );

  const response = await GET(request);

  assert.equal(response.status, 307);
  assert.equal(response.headers.get('location'), 'http://localhost/');
});
