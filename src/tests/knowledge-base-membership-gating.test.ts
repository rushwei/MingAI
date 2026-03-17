import test from 'node:test';
import assert from 'node:assert/strict';

test('searchKnowledge should honor explicit membershipType without env', async (t) => {
  const prevUrl = process.env.SUPABASE_URL;
  const prevKey = process.env.SUPABASE_ANON_KEY;

  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_ANON_KEY;

  t.after(() => {
    if (prevUrl === undefined) {
      delete process.env.SUPABASE_URL;
    } else {
      process.env.SUPABASE_URL = prevUrl;
    }
    if (prevKey === undefined) {
      delete process.env.SUPABASE_ANON_KEY;
    } else {
      process.env.SUPABASE_ANON_KEY = prevKey;
    }
  });

  const modulePath = require.resolve('../lib/knowledge-base/search');
  delete require.cache[modulePath];
  const { searchKnowledge } = require('../lib/knowledge-base/search') as typeof import('../lib/knowledge-base/search');

  const results = await searchKnowledge('test', { membershipType: 'free' });
  assert.deepEqual(results, []);
});
