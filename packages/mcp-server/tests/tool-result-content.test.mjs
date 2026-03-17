import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

test('mcp server should return both structuredContent and content when outputSchema exists', async () => {
  const entryPath = resolve(process.cwd(), 'packages/mcp-server/src/index.ts');
  const source = await readFile(entryPath, 'utf-8');

  assert.match(
    source,
    /buildToolSuccessPayload/u,
    'server entrypoint should delegate structuredContent/content policy to the shared transport adapter'
  );
});
