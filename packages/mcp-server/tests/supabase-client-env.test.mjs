import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const supabasePath = resolve(process.cwd(), 'packages/mcp-server/src/supabase.ts');

test('mcp server supabase client should use anon key instead of service role key', async () => {
  const source = await readFile(supabasePath, 'utf-8');

  assert.ok(
    source.includes('SUPABASE_ANON_KEY') || source.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    'should read anon key env for MCP server database access'
  );
  assert.ok(
    !source.includes('SUPABASE_SERVICE_ROLE_KEY'),
    'should not depend on SUPABASE_SERVICE_ROLE_KEY'
  );
});

test('mcp server supabase client should fail fast when system admin credentials are missing', async () => {
  const source = await readFile(supabasePath, 'utf-8');

  assert.ok(
    source.includes('Missing SUPABASE_SYSTEM_ADMIN_EMAIL or SUPABASE_SYSTEM_ADMIN_PASSWORD'),
    'missing system admin credentials should have an explicit fail-fast error message'
  );
});
