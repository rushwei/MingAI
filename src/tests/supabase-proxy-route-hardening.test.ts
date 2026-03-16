import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const storageRoutePath = resolve(process.cwd(), 'src/app/api/supabase/storage/route.ts');

test('legacy supabase proxy route should be removed', async () => {
  assert.equal(
    existsSync(resolve(process.cwd(), 'src/app/api/supabase/proxy/route.ts')),
    false,
    'browser queries should go through feature-owned APIs instead of the generic supabase proxy'
  );
});

test('supabase storage route should require user auth for uploads and return publicUrl', async () => {
  const source = await readFile(storageRoutePath, 'utf-8');

  assert.ok(
    source.includes('const auth = await requireUserContext(request);'),
    'storage upload should require authenticated user context'
  );
  assert.ok(
    source.includes("const ALLOWED_BUCKETS = new Set(['avatars'])"),
    'storage route should keep upload bucket allowlist'
  );
  assert.ok(
    source.includes('publicUrl: publicData.publicUrl'),
    'storage upload response should include publicUrl'
  );
});
