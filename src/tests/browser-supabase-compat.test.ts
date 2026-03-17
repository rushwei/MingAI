import test from 'node:test';
import assert from 'node:assert/strict';

test('browser auth client should not expose table query or rpc helpers', async () => {
  const { supabase } = await import('../lib/auth');

  assert.equal('from' in (supabase as Record<string, unknown>), false);
  assert.equal('rpc' in (supabase as Record<string, unknown>), false);
});
