import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const homePagePath = resolve(process.cwd(), 'src/app/page.tsx');
const authSessionPath = resolve(process.cwd(), 'src/lib/auth-session.ts');

test('home page should resolve custom auth cookies before redirecting guests to fortune hub', async () => {
  const [homePageSource, authSessionSource] = await Promise.all([
    readFile(homePagePath, 'utf-8'),
    readFile(authSessionPath, 'utf-8'),
  ]);

  assert.ok(
    authSessionSource.includes('export async function resolveSessionFromTokens'),
    'auth-session should expose shared custom-cookie session resolution',
  );
  assert.ok(
    homePageSource.includes('ACCESS_COOKIE') && homePageSource.includes('REFRESH_COOKIE'),
    'home page should inspect the custom auth cookies that /api/auth writes',
  );
  assert.ok(
    homePageSource.includes('resolveSessionFromTokens'),
    'home page should reuse the shared token-based session resolver before redirecting',
  );
});
