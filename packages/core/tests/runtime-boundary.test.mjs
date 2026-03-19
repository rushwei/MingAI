import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

test('core src tree should not contain compiled JavaScript artifacts', async () => {
  const srcDir = resolve(process.cwd(), 'packages/core/src');
  const entries = await readdir(srcDir, { recursive: true });
  const jsFiles = entries
    .filter((entry) => typeof entry === 'string' && entry.endsWith('.js'));

  assert.deepEqual(
    jsFiles,
    [],
    'compiled .js artifacts inside packages/core/src create a second runtime truth next to TypeScript sources'
  );
});

test('core contract tests should not import dist artifacts directly', async () => {
  const testDir = resolve(process.cwd(), 'packages/core/tests');
  const entries = await readdir(testDir);

  for (const entry of entries) {
    if (!entry.endsWith('.test.mjs')) continue;
    const source = await readFile(resolve(testDir, entry), 'utf-8');
    assert.doesNotMatch(
      source,
      /\.\.\/dist\//u,
      `${entry} should validate source/runtime contracts without importing checked-in dist artifacts directly`
    );
  }
});
