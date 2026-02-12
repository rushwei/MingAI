import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260212_mcp_guard_internal_updates.sql'
);

test('mcp guard migration should allow scoped internal updates for security definer rpc paths', async () => {
  const source = await readFile(migrationPath, 'utf-8');

  assert.ok(
    source.includes("current_setting('mingai.mcp_internal_update', true)"),
    'guard trigger should support scoped bypass flag for trusted internal updates'
  );
  assert.ok(
    source.includes("set_config('mingai.mcp_internal_update', '1', true)"),
    'trusted RPC functions should set scoped bypass flag before protected updates'
  );
  assert.ok(
    source.includes('CREATE OR REPLACE FUNCTION public.mcp_reset_key'),
    'migration should patch mcp_reset_key to set bypass flag'
  );
  assert.ok(
    source.includes('CREATE OR REPLACE FUNCTION public.admin_revoke_mcp_key'),
    'migration should patch admin_revoke_mcp_key to set bypass flag'
  );
  assert.ok(
    source.includes('CREATE OR REPLACE FUNCTION public.admin_unban_mcp_key'),
    'migration should define admin_unban_mcp_key for reversible ban operations'
  );
  assert.ok(
    source.includes('SET key_code = p_new_key_code,')
      && source.includes('is_active = true'),
    'reset RPC should reactivate key while rotating key code'
  );
});
