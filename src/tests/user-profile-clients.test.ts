import test from 'node:test';
import assert from 'node:assert/strict';

type FetchLike = typeof global.fetch;

test('user profile feature clients should persist nickname through profile API and load selectable charts', async () => {
  const originalFetch = global.fetch;
  const calls: Array<{ url: string; init?: RequestInit }> = [];

  global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init });

    if (url.endsWith('/api/user/profile') && init?.method === 'PATCH') {
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

    if (url.endsWith('/api/user/charts')) {
      return new Response(JSON.stringify({
        baziCharts: [
          {
            id: 'bazi-1',
            name: '测试八字',
            gender: 'male',
            birth_date: '1990-01-01',
            birth_time: '08:30',
          },
        ],
        ziweiCharts: [
          {
            id: 'ziwei-1',
            name: '测试紫微',
            gender: 'female',
            birth_date: '1992-02-02',
            birth_time: '10:00',
          },
        ],
        defaultChartIds: {
          bazi: null,
          ziwei: null,
        },
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    throw new Error(`Unexpected fetch: ${url}`);
  }) as FetchLike;

  try {
    const profileClientPath = require.resolve('../lib/user/profile');
    const chartClientPath = require.resolve('../lib/user/charts');
    delete require.cache[profileClientPath];
    delete require.cache[chartClientPath];
    const profileClient = require('../lib/user/profile') as typeof import('../lib/user/profile');
    const chartClient = require('../lib/user/charts') as typeof import('../lib/user/charts');

    const saveResult = await profileClient.updateCurrentUserProfile({
      profile: {
        nickname: '新昵称',
      },
    });
    assert.equal(saveResult.success, true);

    const patchCall = calls.find(call => call.url.endsWith('/api/user/profile') && call.init?.method === 'PATCH');
    assert.ok(patchCall, 'expected PATCH /api/user/profile');
    assert.match(String(patchCall.init?.body), /profile/);
    assert.match(String(patchCall.init?.body), /nickname/);

    const charts = await chartClient.listSelectableCharts();
    assert.equal(charts.length, 2);
    assert.equal(charts[0]?.type, 'bazi');
    assert.equal(charts[1]?.type, 'ziwei');
  } finally {
    global.fetch = originalFetch;
  }
});
