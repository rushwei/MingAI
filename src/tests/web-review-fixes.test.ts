import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-anon';

test('legacy notifications launch route should be removed after announcement system split', async () => {
  assert.equal(
    existsSync(join(process.cwd(), 'src/app/api/notifications/launch/route.ts')),
    false,
  );
});

test('history restore payload should use a fresh timestamp query instead of the static history id', async () => {
  const originalNow = Date.now;
  Date.now = () => 1700000000000;

  try {
    const historyClient = await import('../lib/history/client');
    const target = historyClient.applyHistoryRestorePayload({
      sessionKey: 'tarot_result',
      detailPath: '/tarot/result',
      useTimestamp: true,
      sessionData: {},
    });

    assert.equal(target, '/tarot/result?from=history&t=1700000000000');
  } finally {
    Date.now = originalNow;
  }
});
