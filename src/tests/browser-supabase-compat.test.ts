import test from 'node:test';
import assert from 'node:assert/strict';

test('browser auth client should preserve temporary from/rpc compatibility during migration', async () => {
  const { supabase } = await import('../lib/auth');

  assert.equal(typeof (supabase as { from?: unknown }).from, 'function');
  assert.equal(typeof (supabase as { rpc?: unknown }).rpc, 'function');
});
