import test from 'node:test';
import assert from 'node:assert/strict';

test('payment status store should dedupe concurrent refresh requests', async () => {
  const originalFetch = global.fetch;
  let fetchCount = 0;

  global.fetch = async () => {
    fetchCount += 1;
    return new Response(JSON.stringify({ paused: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }) as Response;
  };

  try {
    const {
      refreshPaymentPauseStore,
      resetPaymentPauseStoreForTests,
      getPaymentPauseStoreSnapshot,
    } = await import('../lib/payment-status-store');

    resetPaymentPauseStoreForTests();
    await Promise.all([
      refreshPaymentPauseStore(true),
      refreshPaymentPauseStore(true),
      refreshPaymentPauseStore(true),
    ]);

    assert.equal(fetchCount, 1);
    assert.deepEqual(getPaymentPauseStoreSnapshot(), {
      isPaused: true,
      isLoading: false,
    });
  } finally {
    global.fetch = originalFetch;
  }
});
