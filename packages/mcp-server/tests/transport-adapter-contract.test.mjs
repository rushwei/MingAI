import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

test('mcp server and local entrypoints should share a transport adapter from core', async () => {
  const serverSource = await readFile(resolve(process.cwd(), 'packages/mcp-server/src/index.ts'), 'utf-8');
  const localSource = await readFile(resolve(process.cwd(), 'packages/mcp/src/index.ts'), 'utf-8');

  assert.match(
    serverSource,
    /from '@mingai\/core\/transport'/u,
    'online MCP entrypoint should consume a shared transport adapter instead of hand-rolling tool listing and call responses'
  );
  assert.match(
    localSource,
    /from '@mingai\/core\/transport'/u,
    'local MCP entrypoint should consume the same shared transport adapter as the online server'
  );
});
