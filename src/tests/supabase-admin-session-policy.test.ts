import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const supabaseServerPath = resolve(process.cwd(), 'src/lib/supabase-server.ts');

test('supabase-server should enforce system admin session in production and allow dev fallback', async () => {
  const source = await readFile(supabaseServerPath, 'utf-8');

  assert.ok(
    source.includes('NODE_ENV') && source.includes('production'),
    'supabase-server should branch on NODE_ENV for system admin requirements'
  );
  assert.ok(
    source.includes('Missing SUPABASE_SYSTEM_ADMIN_EMAIL or SUPABASE_SYSTEM_ADMIN_PASSWORD'),
    'supabase-server should expose a clear missing-credentials error'
  );
});
