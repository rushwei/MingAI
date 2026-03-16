import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const apiUtilsPath = resolve(process.cwd(), 'src/lib/api-utils.ts');

test('getAuthContext should use bearer token to build authed client', async () => {
  const source = await readFile(apiUtilsPath, 'utf-8');

  assert.ok(
    source.includes('const supabase = token ? createAuthedClient(token)'),
    'getAuthContext should return a token-bound client when Authorization header exists'
  );
});

test('requireAdminUser should check admin via authResult.supabase instead of service role', async () => {
  const source = await readFile(apiUtilsPath, 'utf-8');

  assert.ok(
    source.includes('const authResult = await requireUserContext(request);'),
    'requireAdminUser should be based on requireUserContext'
  );
  assert.ok(
    source.includes('checkIsAdmin') && source.includes(".from('users')"),
    'requireAdminUser should use shared checkIsAdmin function'
  );
  assert.ok(
    !source.includes('const serviceClient = getSystemAdminClient();'),
    'requireAdminUser should no longer create service role client'
  );
});
