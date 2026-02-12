import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const vectorIndexPath = resolve(process.cwd(), 'src/lib/knowledge-base/vector-index.ts');
const edgeFnPath = resolve(process.cwd(), 'supabase/functions/create-vector-index/index.ts');

test('vector index trigger should not use SUPABASE_SERVICE_ROLE_KEY', async () => {
  const source = await readFile(vectorIndexPath, 'utf-8');

  assert.ok(
    !source.includes('SUPABASE_SERVICE_ROLE_KEY'),
    'vector-index helper should not reference service role key'
  );
  assert.ok(
    source.includes('INTERNAL_API_SECRET'),
    'vector-index helper should use internal secret header'
  );
});

test('create-vector-index edge function should use INTERNAL_API_SECRET auth', async () => {
  const source = await readFile(edgeFnPath, 'utf-8');

  assert.ok(
    !source.includes('SUPABASE_SERVICE_ROLE_KEY'),
    'edge function should not verify against service role key'
  );
  assert.ok(
    source.includes('INTERNAL_API_SECRET'),
    'edge function should validate internal secret'
  );
});
