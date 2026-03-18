import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const homePagePath = resolve(process.cwd(), 'src/app/page.tsx');

test('home page should no longer resolve auth cookies or server sessions after anonymous mode removal', async () => {
  const homePageSource = await readFile(homePagePath, 'utf-8');

  assert.doesNotMatch(homePageSource, /ACCESS_COOKIE/u);
  assert.doesNotMatch(homePageSource, /REFRESH_COOKIE/u);
  assert.doesNotMatch(homePageSource, /resolveSessionFromTokens/u);
  assert.doesNotMatch(homePageSource, /createAnonClient/u);
  assert.doesNotMatch(homePageSource, /createRequestSupabaseClient/u);
  assert.doesNotMatch(homePageSource, /cookies\(\)/u);
  assert.match(homePageSource, /redirect\('\/user'\)/u);
});
