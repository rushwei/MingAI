import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260212_mcp_unban_reactivate_keys.sql'
);

test('mcp unban reactivation migration should reactivate unbanned keys', async () => {
  const source = await readFile(migrationPath, 'utf-8');

  assert.ok(
    source.includes('UPDATE public.mcp_api_keys')
      && source.includes('WHERE is_banned = false')
      && source.includes('is_active = false'),
    'migration should backfill legacy unbanned inactive records to active'
  );
  assert.ok(
    source.includes('CREATE OR REPLACE FUNCTION public.admin_unban_mcp_key'),
    'migration should redefine admin_unban_mcp_key function'
  );
  assert.ok(
    source.includes('SET is_banned = false,')
      && source.includes('is_active = true'),
    'admin unban should restore active state instead of leaving key inactive'
  );
});
