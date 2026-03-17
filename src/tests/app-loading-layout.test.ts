import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const loadingPath = resolve(process.cwd(), 'src/app/loading.tsx');

test('global loading should not use full-screen fixed overlay', async () => {
  const source = await readFile(loadingPath, 'utf-8');

  assert.doesNotMatch(
    source,
    /fixed\s+inset-0/u,
    'global loading should not cover the sidebar area with a full-screen overlay',
  );
});
