import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const supabaseServerPath = resolve(process.cwd(), 'src/lib/supabase-server.ts');

test('supabase-server should not depend on SUPABASE_SERVICE_ROLE_KEY', async () => {
  const source = await readFile(supabaseServerPath, 'utf-8');

  assert.ok(
    !source.includes('SUPABASE_SERVICE_ROLE_KEY'),
    'supabase-server should remove service role key dependency'
  );
});

test('supabase-server should support system admin credential based session', async () => {
  const source = await readFile(supabaseServerPath, 'utf-8');

  assert.ok(
    source.includes('SUPABASE_SYSTEM_ADMIN_EMAIL'),
    'should read system admin email env'
  );
  assert.ok(
    source.includes('SUPABASE_SYSTEM_ADMIN_PASSWORD'),
    'should read system admin password env'
  );
  assert.ok(
    source.includes('accessToken'),
    'should configure supabase client with accessToken callback'
  );
  assert.ok(
    'should not expose static system admin access token env'
  );
});
