import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const layoutPath = resolve(process.cwd(), 'src/app/layout.tsx');

test('root layout should not inject public supabase config into window', async () => {
  const source = await readFile(layoutPath, 'utf-8');

  assert.doesNotMatch(
    source,
    /__MINGAI_PUBLIC_SUPABASE__/u,
    'layout should not leak Supabase public config through inline window state',
  );
  assert.doesNotMatch(
    source,
    /getSupabaseUrl|getSupabaseAnonKey/u,
    'layout should not depend on Supabase env helpers after browser query client removal',
  );
});
