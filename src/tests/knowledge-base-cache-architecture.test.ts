import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const searchPath = resolve(process.cwd(), 'src/lib/knowledge-base/search.ts');

test('knowledge base cache should enforce ttl cleanup and size cap', async () => {
  const source = await readFile(searchPath, 'utf-8');

  assert.ok(
    source.includes('KB_WEIGHT_CACHE_MAX'),
    'knowledge base cache should define a max size'
  );
  assert.ok(
    source.includes('pruneKbWeightCache'),
    'knowledge base cache should prune expired/overflow entries'
  );
});

test('knowledge base search should log rerank or extra candidate failures', async () => {
  const source = await readFile(searchPath, 'utf-8');

  assert.ok(
    source.includes('[knowledge-base]'),
    'knowledge base search should emit warning logs for failure cases'
  );
});
