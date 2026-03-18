import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

test('mcp local should return both structuredContent and content when outputSchema exists', async () => {
  const entryPath = resolve(process.cwd(), 'packages/mcp-local/src/index.ts');
  const source = await readFile(entryPath, 'utf-8');

  assert.match(
    source,
    /from '@mingai\/mcp-core\/transport'/u,
    'local entrypoint should delegate transport payload policy to the shared mcp-core adapter'
  );
  assert.match(
    source,
    /buildToolSuccessPayload/u,
    'tools with outputSchema should include structuredContent and content through the shared transport adapter'
  );
});
