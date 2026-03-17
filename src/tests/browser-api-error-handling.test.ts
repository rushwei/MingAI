import test from 'node:test';
import assert from 'node:assert/strict';

test('fetchBrowserJson should surface non-JSON error responses', async () => {
  const originalFetch = global.fetch;
  const { fetchBrowserJson } = await import('../lib/browser-api');

  global.fetch = async () => new Response('<html>Server error</html>', {
    status: 500,
    headers: { 'Content-Type': 'text/html' },
  }) as Response;

  try {
    const { ok, result } = await fetchBrowserJson('/api/bad-request', { method: 'POST' });
    assert.equal(ok, false);
    assert.ok(result.error, 'non-JSON error responses should surface an error');
  } finally {
    global.fetch = originalFetch;
  }
});
