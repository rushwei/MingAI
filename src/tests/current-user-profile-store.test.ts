import test from 'node:test';
import assert from 'node:assert/strict';

process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon';

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
