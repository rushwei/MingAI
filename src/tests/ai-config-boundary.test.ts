import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const sharedConfigPath = resolve(process.cwd(), 'src/lib/ai-config.ts');
const serverConfigPath = resolve(process.cwd(), 'src/lib/server/ai-config.ts');
const modelsRoutePath = resolve(process.cwd(), 'src/app/api/models/route.ts');

test('server ai-config module should be marked as server-only', async () => {
  const source = await readFile(serverConfigPath, 'utf-8');

  assert.ok(
    source.includes("import 'server-only'"),
    'server ai-config module must include server-only guard'
  );
  assert.ok(
    source.includes('SUPABASE_SERVICE_ROLE_KEY'),
    'server ai-config module should own service-role access'
  );
});

test('shared ai-config module should not directly create service-role client', async () => {
  const source = await readFile(sharedConfigPath, 'utf-8');

  assert.ok(
    !source.includes("await import('@supabase/supabase-js')"),
    'shared ai-config should not dynamically import supabase-js for service-role access'
  );
  assert.ok(
    !source.includes('SUPABASE_SERVICE_ROLE_KEY'),
    'shared ai-config should not reference service role key directly'
  );
});

test('models route should use server ai-config module', async () => {
  const source = await readFile(modelsRoutePath, 'utf-8');

  assert.ok(
    source.includes("from '@/lib/server/ai-config'"),
    'models route should import async model APIs from server ai-config module'
  );
});
