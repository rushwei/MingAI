import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260315_fix_user_oauth_providers_admin_rls.sql'
);

test('linuxdo oauth provider migration should grant admin-session access without relying on service_role', async () => {
  const source = await readFile(migrationPath, 'utf-8');

  assert.ok(
    source.includes('DROP POLICY IF EXISTS "Service role full access on oauth providers"'),
    'migration should remove the obsolete service_role-only policy'
  );
  assert.ok(
    source.includes('CREATE POLICY "Admins full access" ON public.user_oauth_providers'),
    'migration should add an admin policy for oauth provider bindings'
  );
  assert.ok(
    source.includes('public.is_admin_user()'),
    'migration should use the shared admin policy predicate'
  );
});
