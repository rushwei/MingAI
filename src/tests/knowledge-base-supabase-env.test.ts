import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const FILES = [
  'src/lib/knowledge-base/archive-status.ts',
  'src/lib/knowledge-base/embedding-config.ts',
  'src/lib/knowledge-base/index.ts',
  'src/lib/knowledge-base/ingest.ts',
  'src/lib/knowledge-base/search.ts',
];

test('server knowledge-base modules should not hardcode NEXT_PUBLIC supabase env names', async () => {
  for (const filePath of FILES) {
    const absolutePath = resolve(process.cwd(), filePath);
    const source = await readFile(absolutePath, 'utf-8');

    assert.ok(
      !source.includes('NEXT_PUBLIC_SUPABASE_URL'),
      `${filePath} should use server supabase env helper instead of NEXT_PUBLIC_SUPABASE_URL`
    );
    assert.ok(
      !source.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
      `${filePath} should use server supabase env helper instead of NEXT_PUBLIC_SUPABASE_ANON_KEY`
    );
  }
});
