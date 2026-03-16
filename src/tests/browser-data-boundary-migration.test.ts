import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

async function readSource(relativePath: string) {
  return readFile(resolve(process.cwd(), relativePath), 'utf-8');
}

test('profile page should use profile APIs instead of direct users table or storage writes', async () => {
  const source = await readSource('src/app/user/profile/page.tsx');

  assert.equal(
    source.includes(".from('users')"),
    false,
    'profile page should not update users table directly from the browser',
  );
  assert.equal(
    source.includes('supabase.storage'),
    false,
    'profile page should upload avatars through a server API instead of browser storage access',
  );
});

test('community post detail page should not write user_settings directly from the browser', async () => {
  const source = await readSource('src/app/community/[postId]/page.tsx');

  assert.equal(
    source.includes(".from('user_settings')"),
    false,
    'community post detail page should persist anonymous names through a server API',
  );
});

test('chart selector should load charts through a feature API instead of direct table queries', async () => {
  const source = await readSource('src/components/chat/BaziChartSelector.tsx');

  assert.equal(
    source.includes(".from('bazi_charts')"),
    false,
    'chart selector should not query bazi_charts directly from the browser',
  );
  assert.equal(
    source.includes(".from('ziwei_charts')"),
    false,
    'chart selector should not query ziwei_charts directly from the browser',
  );
});
