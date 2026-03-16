import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';

process.env.LINUXDO_CLIENT_ID = 'linuxdo-client-id';
process.env.LINUXDO_CLIENT_SECRET = 'linuxdo-client-secret';
process.env.SUPABASE_SECRET_KEY = 'supabase-management-secret';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon';

type SessionResult = {
  data: { session: { user: { id: string } } | null };
  error: { message?: string } | null;
};

type AuthAdminUser = {
  id: string;
  email: string;
  user_metadata?: Record<string, unknown> | null;
};

function buildCallbackRequest() {
  const stateValue = encodeURIComponent(JSON.stringify({
    state: 'expected-state',
    codeVerifier: 'code-verifier',
  }));

  return new NextRequest(
    'http://localhost/api/auth/linuxdo/callback?code=oauth-code&state=expected-state',
    {
      headers: {
        cookie: `linuxdo-oauth-state=${stateValue}`,
      },
    },
  );
}

test('generateDeterministicPassword should stay stable when only linuxdo client secret rotates', async (t) => {
  const linuxdoModule = await import('../lib/oauth/linuxdo');
  const originalClientSecret = process.env.LINUXDO_CLIENT_SECRET;
  const originalSupabaseSecret = process.env.SUPABASE_SECRET_KEY;

  process.env.SUPABASE_SECRET_KEY = 'stable-auth-secret';
  process.env.LINUXDO_CLIENT_SECRET = 'linuxdo-client-secret-v1';
  const first = linuxdoModule.generateDeterministicPassword('linuxdo-user-stable');

  process.env.LINUXDO_CLIENT_SECRET = 'linuxdo-client-secret-v2';
  const second = linuxdoModule.generateDeterministicPassword('linuxdo-user-stable');

  t.after(() => {
    process.env.LINUXDO_CLIENT_SECRET = originalClientSecret;
    process.env.SUPABASE_SECRET_KEY = originalSupabaseSecret;
  });

  assert.equal(first, second);
});

test('linuxdo callback should sign bound users in with stored auth email and synced password', async (t) => {
  const linuxdoModule = require('../lib/oauth/linuxdo') as {
    exchangeCode: (code: string, verifier: string, redirectUri: string) => Promise<{ access_token: string }>;
    fetchUserInfo: (accessToken: string) => Promise<Record<string, unknown>>;
    generateDeterministicPassword: (sub: string) => string;
  };
  const apiUtilsModule = require('../lib/api-utils') as {
    createAnonClient: () => {
      auth: {
        signInWithPassword: (credentials: { email: string; password: string }) => Promise<SessionResult>;
      };
    };
    getAuthAdminClient: () => {
      auth: {
        admin: {
          getUserById: (id: string) => Promise<{ data: { user: AuthAdminUser | null }; error: null }>;
          updateUserById: (
            id: string,
            payload: Record<string, unknown>,
          ) => Promise<{ data: { user: AuthAdminUser | null }; error: null }>;
        };
      };
    } | null;
    getSystemAdminClient: () => {
      from: (table: string) => Record<string, unknown>;
    };
  };
  const authSessionModule = require('../lib/auth-session') as {
    setSessionCookies: (response: Response, session: unknown) => void;
  };

  const originalExchangeCode = linuxdoModule.exchangeCode;
  const originalFetchUserInfo = linuxdoModule.fetchUserInfo;
  const originalGenerateDeterministicPassword = linuxdoModule.generateDeterministicPassword;
  const originalCreateAnonClient = apiUtilsModule.createAnonClient;
  const originalGetAuthAdminClient = apiUtilsModule.getAuthAdminClient;
  const originalGetServiceRoleClient = apiUtilsModule.getSystemAdminClient;
  const originalSetSessionCookies = authSessionModule.setSessionCookies;

  let signInEmail = '';
  let signInPassword = '';
  let updatePayload: Record<string, unknown> | null = null;

  linuxdoModule.exchangeCode = async () => ({ access_token: 'access-token' });
  linuxdoModule.fetchUserInfo = async () => ({
    sub: 'linuxdo-user-bound',
    preferred_username: 'bound-user',
    name: 'Bound User',
    email: 'new-relay@example.com',
    email_verified: true,
    picture: 'https://cdn.example.com/bound.png',
  });
  linuxdoModule.generateDeterministicPassword = () => 'rotated-password';

  apiUtilsModule.createAnonClient = () => ({
    auth: {
      signInWithPassword: async ({ email, password }) => {
        signInEmail = email;
        signInPassword = password;
        return {
          data: {
            session: {
              user: { id: 'bound-user-id' },
            },
          },
          error: null,
        };
      },
    },
  });

  apiUtilsModule.getAuthAdminClient = () => ({
    auth: {
      admin: {
        getUserById: async () => ({
          data: {
            user: {
              id: 'bound-user-id',
              email: 'stored-auth@example.com',
              user_metadata: {},
            },
          },
          error: null,
        }),
        updateUserById: async (_id: string, payload: Record<string, unknown>) => {
          updatePayload = payload;
          return {
            data: {
              user: {
                id: 'bound-user-id',
                email: 'stored-auth@example.com',
              },
            },
            error: null,
          };
        },
      },
    },
  });

  apiUtilsModule.getSystemAdminClient = () => ({
    from: (table: string) => {
      if (table === 'user_oauth_providers') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { user_id: 'bound-user-id' }, error: null }),
              }),
            }),
          }),
          update: () => ({
            eq: () => ({
              eq: async () => ({ error: null }),
            }),
          }),
        };
      }

      if (table === 'users') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { id: 'bound-user-id' }, error: null }),
            }),
          }),
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
    apiUtilsModule.getAuthAdminClient = originalGetAuthAdminClient;
    apiUtilsModule.getSystemAdminClient = originalGetServiceRoleClient;
    authSessionModule.setSessionCookies = originalSetSessionCookies;
  });

  const { GET } = await import('../app/api/auth/linuxdo/callback/route');
  const response = await GET(buildCallbackRequest());

  assert.equal(response.status, 307);
  assert.equal(response.headers.get('location'), 'http://localhost/');
  assert.equal(signInEmail, 'stored-auth@example.com');
  assert.equal(signInPassword, 'rotated-password');
  assert.equal(updatePayload?.password, 'rotated-password');
  assert.equal(
    (updatePayload?.user_metadata as Record<string, unknown>)?.linuxdo_sub,
    'linuxdo-user-bound',
  );
});

test('linuxdo callback should recover missing provider bindings via admin user lookup before creating a new auth user', async (t) => {
  const linuxdoModule = require('../lib/oauth/linuxdo') as {
    exchangeCode: (code: string, verifier: string, redirectUri: string) => Promise<{ access_token: string }>;
    fetchUserInfo: (accessToken: string) => Promise<Record<string, unknown>>;
    generateDeterministicPassword: (sub: string) => string;
  };
  const apiUtilsModule = require('../lib/api-utils') as {
    createAnonClient: () => {
      auth: {
        signInWithPassword: (credentials: { email: string; password: string }) => Promise<SessionResult>;
      };
    };
    getAuthAdminClient: () => {
      auth: {
        admin: {
          listUsers: (options?: { page?: number; perPage?: number }) => Promise<{
            data: { users: AuthAdminUser[] };
            error: null;
          }>;
          updateUserById: (
            id: string,
            payload: Record<string, unknown>,
          ) => Promise<{ data: { user: AuthAdminUser | null }; error: null }>;
          createUser: (payload: Record<string, unknown>) => Promise<{
            data: { user: AuthAdminUser | null };
            error: { message: string } | null;
          }>;
        };
      };
    } | null;
    getSystemAdminClient: () => {
      from: (table: string) => Record<string, unknown>;
    };
  };
  const authSessionModule = require('../lib/auth-session') as {
    setSessionCookies: (response: Response, session: unknown) => void;
  };

  const originalExchangeCode = linuxdoModule.exchangeCode;
  const originalFetchUserInfo = linuxdoModule.fetchUserInfo;
  const originalGenerateDeterministicPassword = linuxdoModule.generateDeterministicPassword;
  const originalCreateAnonClient = apiUtilsModule.createAnonClient;
  const originalGetAuthAdminClient = apiUtilsModule.getAuthAdminClient;
  const originalGetServiceRoleClient = apiUtilsModule.getSystemAdminClient;
  const originalSetSessionCookies = authSessionModule.setSessionCookies;

  let listUsersCalls = 0;
  let createUserCalls = 0;
  let providerInsertCalls = 0;
  let signInEmail = '';
  let updatePayload: Record<string, unknown> | null = null;

  linuxdoModule.exchangeCode = async () => ({ access_token: 'access-token' });
  linuxdoModule.fetchUserInfo = async () => ({
    sub: 'linuxdo-user-recover',
    preferred_username: 'recover-user',
    name: 'Recover User',
    email: 'relay-now@example.com',
    email_verified: true,
    picture: 'https://cdn.example.com/recover.png',
  });
  linuxdoModule.generateDeterministicPassword = () => 'stable-password';

  apiUtilsModule.createAnonClient = () => ({
    auth: {
      signInWithPassword: async ({ email }) => {
        signInEmail = email;
        return {
          data: {
            session: {
              user: { id: 'recover-user-id' },
            },
          },
          error: null,
        };
      },
    },
  });

  apiUtilsModule.getAuthAdminClient = () => ({
    auth: {
      admin: {
        listUsers: async () => {
          listUsersCalls += 1;
          return {
            data: {
              users: [
                {
                  id: 'recover-user-id',
                  email: 'stored-auth@example.com',
                  user_metadata: {
                    linuxdo_sub: 'linuxdo-user-recover',
                  },
                },
              ],
            },
            error: null,
          };
        },
        updateUserById: async (_id: string, payload: Record<string, unknown>) => {
          updatePayload = payload;
          return {
            data: {
              user: {
                id: 'recover-user-id',
                email: 'stored-auth@example.com',
              },
            },
            error: null,
          };
        },
        createUser: async () => {
          createUserCalls += 1;
          return {
            data: { user: null },
            error: { message: 'User already registered' },
          };
        },
      },
    },
  });

  apiUtilsModule.getSystemAdminClient = () => ({
    from: (table: string) => {
      if (table === 'user_oauth_providers') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: null, error: null }),
              }),
            }),
          }),
          insert: async () => {
            providerInsertCalls += 1;
            return { error: null };
          },
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
    apiUtilsModule.getAuthAdminClient = originalGetAuthAdminClient;
    apiUtilsModule.getSystemAdminClient = originalGetServiceRoleClient;
    authSessionModule.setSessionCookies = originalSetSessionCookies;
  });

  const { GET } = await import('../app/api/auth/linuxdo/callback/route');
  const response = await GET(buildCallbackRequest());

  assert.equal(response.status, 307);
  assert.equal(response.headers.get('location'), 'http://localhost/');
  assert.equal(listUsersCalls, 1);
  assert.equal(createUserCalls, 0);
  assert.equal(providerInsertCalls, 1);
  assert.equal(signInEmail, 'stored-auth@example.com');
  assert.equal(
    (updatePayload?.user_metadata as Record<string, unknown>)?.linuxdo_sub,
    'linuxdo-user-recover',
  );
});
