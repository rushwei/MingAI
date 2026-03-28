import test from 'node:test';
import assert from 'node:assert/strict';

type FetchLike = typeof global.fetch;

test('getMembershipInfo should use lightweight membership endpoint instead of profile bundle', async () => {
  const originalFetch = global.fetch;
  const requests: string[] = [];

  global.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    requests.push(url);

    if (url.endsWith('/api/user/membership')) {
      return new Response(JSON.stringify({
        userId: 'user-1',
        membership: {
          type: 'plus',
          expiresAt: null,
          isActive: true,
          aiChatCount: 12,
          lastCreditRestoreAt: null,
        },
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    throw new Error(`Unexpected fetch: ${url}`);
  }) as FetchLike;

  try {
    const modulePath = require.resolve('../lib/user/membership');
    delete require.cache[modulePath];
    const membershipModule = require('../lib/user/membership') as typeof import('../lib/user/membership');
    const info = await membershipModule.getMembershipInfo('user-1');

    assert.equal(info?.type, 'plus');
    assert.equal(info?.aiChatCount, 12);
    assert.deepEqual(requests, ['/api/user/membership']);
  } finally {
    global.fetch = originalFetch;
  }
});

test('getMembershipInfo should return null when lightweight membership endpoint has no row', async () => {
  const originalFetch = global.fetch;

  global.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);

    if (url.endsWith('/api/user/membership')) {
      return new Response(JSON.stringify({
        userId: 'user-1',
        membership: null,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    throw new Error(`Unexpected fetch: ${url}`);
  }) as FetchLike;

  try {
    const modulePath = require.resolve('../lib/user/membership');
    delete require.cache[modulePath];
    const membershipModule = require('../lib/user/membership') as typeof import('../lib/user/membership');
    const info = await membershipModule.getMembershipInfo('user-1');
    assert.equal(info, null);
  } finally {
    global.fetch = originalFetch;
  }
});
