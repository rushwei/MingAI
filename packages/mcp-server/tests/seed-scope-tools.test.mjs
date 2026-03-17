import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const serverPath = resolve(process.cwd(), 'packages/mcp-server/src/index.ts');

test('seed scoped tools should use canonical tool names', async () => {
  const source = await readFile(serverPath, 'utf-8');

  assert.match(source, /'liuyao'/u);
  assert.match(source, /'tarot'/u);
  assert.equal(/liuyao_analyze/.test(source), false);
  assert.equal(/tarot_draw/.test(source), false);
});
