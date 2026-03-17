import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

test('ClientProviders should not monkey-patch window.fetch for cache invalidation', async () => {
  const source = await readFile(resolve(process.cwd(), 'src/components/providers/ClientProviders.tsx'), 'utf-8');

  assert.doesNotMatch(source, /window\.fetch\s*=\s*patchedFetch/u);
  assert.doesNotMatch(source, /const rawFetch = window\.fetch\.bind\(window\)/u);
});
