import test from 'node:test';
import assert from 'node:assert/strict';

test('feature toggle store refresh should publish updated state to all subscribers', async () => {
  const originalFetch = global.fetch;
  const featureTogglesModule = await import('../lib/hooks/useFeatureToggles');
  const {
    refreshFeatureToggleStore,
    subscribeFeatureToggleStore,
    getFeatureToggleStoreSnapshot,
    resetFeatureToggleStoreForTests,
  } = featureTogglesModule;

  resetFeatureToggleStoreForTests();
  global.fetch = async () => new Response(JSON.stringify({
    toggles: { chat: false, tarot: true },
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  }) as Response;

  const seenA: Array<{ isLoading: boolean; chat?: boolean }> = [];
  const seenB: Array<{ isLoading: boolean; chat?: boolean }> = [];
  const unsubscribeA = subscribeFeatureToggleStore((state) => {
    seenA.push({ isLoading: state.isLoading, chat: state.toggles?.chat });
  });
  const unsubscribeB = subscribeFeatureToggleStore((state) => {
    seenB.push({ isLoading: state.isLoading, chat: state.toggles?.chat });
  });

  try {
    await refreshFeatureToggleStore(true);
    const snapshot = getFeatureToggleStoreSnapshot();
    assert.equal(snapshot.toggles?.chat, false);
    assert.equal(snapshot.isLoading, false);
    assert.ok(seenA.some((entry) => entry.chat === false), 'subscriber A should receive refreshed toggles');
    assert.ok(seenB.some((entry) => entry.chat === false), 'subscriber B should receive refreshed toggles');
  } finally {
    unsubscribeA();
    unsubscribeB();
    resetFeatureToggleStoreForTests();
    global.fetch = originalFetch;
  }
});
