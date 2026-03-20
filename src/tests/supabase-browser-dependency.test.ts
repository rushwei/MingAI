import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const supabaseClientPath = resolve(process.cwd(), 'src/lib/auth.ts');

test('frontend supabase adapter should not depend on browser supabase client', async () => {
  const source = await readFile(supabaseClientPath, 'utf-8');

  assert.ok(
    !source.includes('createBrowserClient'),
    'frontend adapter should not create browser supabase client'
  );
  // NEXT_PUBLIC_SUPABASE_URL may appear in getPublicUrl for storage URL construction,
  // but must not be used to create a Supabase client instance
  assert.ok(
    !source.includes('createClient'),
    'frontend adapter should not call createClient with env vars'
  );
  assert.ok(
    !source.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    'frontend adapter should not require NEXT_PUBLIC_SUPABASE_ANON_KEY'
  );
});
