import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

test('mcp server entry should not use deprecated Server/SSE imports', async () => {
  const entryPath = resolve(process.cwd(), 'packages/mcp-server/src/index.ts');
  const source = await readFile(entryPath, 'utf-8');

  assert.ok(
    source.includes("from '@modelcontextprotocol/sdk/server/mcp.js'"),
    'should import McpServer'
  );
  assert.ok(
    source.includes("from '@modelcontextprotocol/sdk/server/streamableHttp.js'"),
    'should import StreamableHTTPServerTransport'
  );

  assert.ok(
    !source.includes("from '@modelcontextprotocol/sdk/server/index.js'"),
    'should not import deprecated Server'
  );
  assert.ok(
    !source.includes("from '@modelcontextprotocol/sdk/server/sse.js'"),
    'should not import deprecated SSEServerTransport'
  );
});
