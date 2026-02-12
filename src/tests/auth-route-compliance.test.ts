import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const authRoutePath = resolve(process.cwd(), 'src/app/api/auth/route.ts');

test('auth route should rely on api-utils supabase client factories', async () => {
  const source = await readFile(authRoutePath, 'utf-8');

  assert.ok(
    source.includes("from '@/lib/api-utils'") && source.includes('createAnonClient'),
    'auth route should import supabase client factories from api-utils'
  );
  assert.ok(
    !source.includes("from '@supabase/supabase-js'") || source.includes('import type { Session, User }'),
    'auth route should not create supabase client directly in route file'
  );
  assert.ok(
    !source.includes('createClient('),
    'auth route should not call createClient directly'
  );
});
