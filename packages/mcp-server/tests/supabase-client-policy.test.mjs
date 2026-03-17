import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const supabasePath = resolve(process.cwd(), 'packages/mcp-server/src/supabase.ts');

test('mcp supabase client should require system admin credentials and never fall back to anon', async () => {
  const source = await readFile(supabasePath, 'utf-8');

  assert.ok(
    source.includes('Missing SUPABASE_SYSTEM_ADMIN_EMAIL or SUPABASE_SYSTEM_ADMIN_PASSWORD'),
    'mcp supabase client should expose a clear missing-credentials error'
  );
  assert.ok(
    !source.includes('falling back to anon client'),
    'mcp supabase client should not silently fall back to anon mode'
  );
  assert.ok(
    !source.includes('NODE_ENV') && !source.includes('IS_PRODUCTION'),
    'mcp supabase client should not branch privileged auth policy by environment'
  );
});
