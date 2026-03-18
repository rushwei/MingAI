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
    getAuthAdminClient: () => null;
    getSystemAdminClient: () => {
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
  const originalGetAuthAdminClient = apiUtilsModule.getAuthAdminClient;
  const originalGetServiceRoleClient = apiUtilsModule.getSystemAdminClient;
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
  apiUtilsModule.getAuthAdminClient = () => null;

  apiUtilsModule.getSystemAdminClient = () => ({
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
    apiUtilsModule.getAuthAdminClient = originalGetAuthAdminClient;
    apiUtilsModule.getSystemAdminClient = originalGetServiceRoleClient;
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

test('linuxdo callback should create new users through admin api instead of public signup', async (t) => {
  const linuxdoModule = require('../lib/oauth/linuxdo') as {
    exchangeCode: (code: string, verifier: string, redirectUri: string) => Promise<{ access_token: string }>;
    fetchUserInfo: (accessToken: string) => Promise<Record<string, unknown>>;
    generateDeterministicPassword: (sub: string) => string;
  };
  const apiUtilsModule = require('../lib/api-utils') as {
    createAnonClient: () => {
      auth: {
        signUp: () => Promise<{ data: { session: null }; error: { message: string } }>;
        signInWithPassword: () => Promise<{ data: { session: { user: { id: string } } }; error: null }>;
      };
    };
    getAuthAdminClient: () => {
      auth: {
        admin: {
          createUser: (payload: Record<string, unknown>) => Promise<{ data: { user: { id: string } }; error: null }>;
        };
      };
    };
    getSystemAdminClient: () => {
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
  const originalGetAuthAdminClient = apiUtilsModule.getAuthAdminClient;
  const originalGetServiceRoleClient = apiUtilsModule.getSystemAdminClient;
  const originalSetSessionCookies = authSessionModule.setSessionCookies;

  let publicSignUpCalls = 0;
  let adminCreateUserCalls = 0;
  let signInCalls = 0;
  let createUserPayload: Record<string, unknown> | null = null;

  linuxdoModule.exchangeCode = async () => ({ access_token: 'access-token' });
  linuxdoModule.fetchUserInfo = async () => ({
    sub: 'linuxdo-user-2',
    preferred_username: 'bob',
    name: 'Bob',
    email: 'bob@example.com',
    email_verified: true,
    picture: 'https://cdn.example.com/bob.png',
  });
  linuxdoModule.generateDeterministicPassword = () => 'deterministic-password';

  apiUtilsModule.createAnonClient = () => ({
    auth: {
      signUp: async () => {
        publicSignUpCalls += 1;
        return {
          data: { session: null },
          error: { message: 'Email address not authorized' },
        };
      },
      signInWithPassword: async () => {
        signInCalls += 1;
        return {
          data: {
            session: {
              user: { id: 'user-2' },
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
        createUser: async (payload: Record<string, unknown>) => {
          adminCreateUserCalls += 1;
          createUserPayload = payload;
          return {
            data: { user: { id: 'user-2' } },
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
    apiUtilsModule.getAuthAdminClient = originalGetAuthAdminClient;
    apiUtilsModule.getSystemAdminClient = originalGetServiceRoleClient;
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
  assert.equal(publicSignUpCalls, 0);
  assert.equal(adminCreateUserCalls, 1);
  assert.equal(signInCalls, 1);
  const createdUser = createUserPayload as Record<string, unknown> | null;
  assert.ok(createdUser);
  assert.equal(createdUser.email_confirm, true);
  assert.equal(
    (createdUser.user_metadata as Record<string, unknown>)?.linuxdo_sub,
    'linuxdo-user-2',
  );
});

test('linuxdo callback should surface missing auth admin key when public signup is blocked', async (t) => {
  const linuxdoModule = require('../lib/oauth/linuxdo') as {
    exchangeCode: (code: string, verifier: string, redirectUri: string) => Promise<{ access_token: string }>;
    fetchUserInfo: (accessToken: string) => Promise<Record<string, unknown>>;
    generateDeterministicPassword: (sub: string) => string;
  };
  const apiUtilsModule = require('../lib/api-utils') as {
    createAnonClient: () => {
      auth: {
        signUp: () => Promise<{ data: { session: null }; error: { message: string } }>;
      };
    };
    getAuthAdminClient: () => null;
    getSystemAdminClient: () => {
      from: (table: string) => {
        select?: () => { eq: (field: string, value: string) => { eq?: (field2: string, value2: string) => { maybeSingle: () => Promise<{ data: { user_id: string } | null }> } } };
      };
    };
  };

  const originalExchangeCode = linuxdoModule.exchangeCode;
  const originalFetchUserInfo = linuxdoModule.fetchUserInfo;
  const originalGenerateDeterministicPassword = linuxdoModule.generateDeterministicPassword;
  const originalCreateAnonClient = apiUtilsModule.createAnonClient;
  const originalGetAuthAdminClient = apiUtilsModule.getAuthAdminClient;
  const originalGetServiceRoleClient = apiUtilsModule.getSystemAdminClient;

  linuxdoModule.exchangeCode = async () => ({ access_token: 'access-token' });
  linuxdoModule.fetchUserInfo = async () => ({
    sub: 'linuxdo-user-3',
    preferred_username: 'carol',
    name: 'Carol',
    email: 'carol@example.com',
    email_verified: true,
  });
  linuxdoModule.generateDeterministicPassword = () => 'deterministic-password';

  apiUtilsModule.createAnonClient = () => ({
    auth: {
      signUp: async () => ({
        data: { session: null },
        error: { message: 'Email address not authorized' },
      }),
    },
  });
  apiUtilsModule.getAuthAdminClient = () => null;
  apiUtilsModule.getSystemAdminClient = () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null }),
          }),
        }),
      }),
    }),
  });

  t.after(() => {
    linuxdoModule.exchangeCode = originalExchangeCode;
    linuxdoModule.fetchUserInfo = originalFetchUserInfo;
    linuxdoModule.generateDeterministicPassword = originalGenerateDeterministicPassword;
    apiUtilsModule.createAnonClient = originalCreateAnonClient;
    apiUtilsModule.getAuthAdminClient = originalGetAuthAdminClient;
    apiUtilsModule.getSystemAdminClient = originalGetServiceRoleClient;
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
  assert.equal(
    response.headers.get('location'),
    'http://localhost/?error=signup_requires_admin_key',
  );
});

test('linuxdo callback should recover existing deterministic linuxdo account when provider binding is missing', async (t) => {
  const linuxdoModule = require('../lib/oauth/linuxdo') as {
    exchangeCode: (code: string, verifier: string, redirectUri: string) => Promise<{ access_token: string }>;
    fetchUserInfo: (accessToken: string) => Promise<Record<string, unknown>>;
    generateDeterministicPassword: (sub: string) => string;
  };
  const apiUtilsModule = require('../lib/api-utils') as {
    createAnonClient: () => {
      auth: {
        signInWithPassword: () => Promise<{ data: { session: { user: { id: string } } }; error: null }>;
      };
    };
    getAuthAdminClient: () => {
      auth: {
        admin: {
          listUsers: () => Promise<{ data: { users: Array<{ id: string; email: string; user_metadata: Record<string, unknown> }> }; error: null }>;
          updateUserById: (
            id: string,
            payload: Record<string, unknown>,
          ) => Promise<{ data: { user: { id: string; email: string } }; error: null }>;
          createUser: () => Promise<{ data: { user: null }; error: { message: string } }>;
        };
      };
    };
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

  let signInCalls = 0;
  let providerInsertCalls = 0;

  linuxdoModule.exchangeCode = async () => ({ access_token: 'access-token' });
  linuxdoModule.fetchUserInfo = async () => ({
    sub: 'linuxdo-user-4',
    preferred_username: 'dylan',
    name: 'Dylan',
    email: 'dylan@example.com',
    email_verified: true,
    picture: 'https://cdn.example.com/dylan.png',
  });
  linuxdoModule.generateDeterministicPassword = () => 'deterministic-password';

  apiUtilsModule.createAnonClient = () => ({
    auth: {
      signInWithPassword: async () => {
        signInCalls += 1;
        return {
          data: {
            session: {
              user: { id: 'user-4' },
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
          data: { user: null },
          error: { message: 'not found' },
        }),
        listUsers: async () => ({
          data: {
            users: [
              {
                id: 'user-4',
                email: 'dylan@example.com',
                user_metadata: {
                  linuxdo_sub: 'linuxdo-user-4',
                },
              },
            ],
          },
          error: null,
        }),
        updateUserById: async () => ({
          data: {
            user: {
              id: 'user-4',
              email: 'dylan@example.com',
            },
          },
          error: null,
        }),
        createUser: async () => ({
          data: { user: null },
          error: { message: 'User already registered' },
        }),
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
  assert.equal(signInCalls, 1);
  assert.equal(providerInsertCalls, 1);
});

test('linuxdo callback should surface provider sync failure when oauth binding insert fails', async (t) => {
  const linuxdoModule = require('../lib/oauth/linuxdo') as {
    exchangeCode: (code: string, verifier: string, redirectUri: string) => Promise<{ access_token: string }>;
    fetchUserInfo: (accessToken: string) => Promise<Record<string, unknown>>;
    generateDeterministicPassword: (sub: string) => string;
  };
  const apiUtilsModule = require('../lib/api-utils') as {
    createAnonClient: () => {
      auth: {
        signInWithPassword: () => Promise<{ data: { session: { user: { id: string } } }; error: null }>;
      };
    };
    getAuthAdminClient: () => {
      auth: {
        admin: {
          createUser: () => Promise<{ data: { user: { id: string } }; error: null }>;
        };
      };
    };
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

  linuxdoModule.exchangeCode = async () => ({ access_token: 'access-token' });
  linuxdoModule.fetchUserInfo = async () => ({
    sub: 'linuxdo-user-5',
    preferred_username: 'eve',
    name: 'Eve',
    email: 'eve@example.com',
    email_verified: true,
  });
  linuxdoModule.generateDeterministicPassword = () => 'deterministic-password';

  apiUtilsModule.createAnonClient = () => ({
    auth: {
      signInWithPassword: async () => ({
        data: {
          session: {
            user: { id: 'user-5' },
          },
        },
        error: null,
      }),
    },
  });

  apiUtilsModule.getAuthAdminClient = () => ({
    auth: {
      admin: {
        createUser: async () => ({
          data: { user: { id: 'user-5' } },
          error: null,
        }),
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
          insert: async () => ({
            error: { message: 'new row violates row-level security policy' },
          }),
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
  assert.equal(
    response.headers.get('location'),
    'http://localhost/?error=provider_sync_failed',
  );
});
