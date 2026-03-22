import test from 'node:test';
import assert from 'node:assert/strict';

test('loadCurrentUserSettings should surface request errors instead of collapsing them into null settings', async () => {
  const originalFetch = global.fetch;
  const { loadCurrentUserSettings } = await import('../lib/user/settings');

  global.fetch = async () => new Response(JSON.stringify({ error: { message: 'boom' } }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' },
  }) as Response;

  try {
    const result = await loadCurrentUserSettings();
    assert.equal(result.settings, null);
    assert.equal(result.error?.message, 'boom');
  } finally {
    global.fetch = originalFetch;
  }
});
