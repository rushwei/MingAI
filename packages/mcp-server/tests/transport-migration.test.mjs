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

test('mcp server entry should provide root and metadata compatibility routes', async () => {
  const entryPath = resolve(process.cwd(), 'packages/mcp-server/src/index.ts');
  const source = await readFile(entryPath, 'utf-8');

  assert.ok(
    source.includes("app.get('/',"),
    'should provide a root route for connector refresh compatibility'
  );
  assert.ok(
    source.includes("app.get('/.well-known/openid-configuration'"),
    'should provide OIDC discovery compatibility at root'
  );
  assert.ok(
    source.includes("app.get('/token/.well-known/openid-configuration'"),
    'should provide OIDC discovery compatibility for token-path probing clients'
  );
  assert.ok(
    source.includes("app.get('/.well-known/oauth-protected-resource'"),
    'should provide root protected-resource metadata compatibility'
  );
});

test('mcp server entry should support stateless fallback for sessionless streamable-http requests', async () => {
  const entryPath = resolve(process.cwd(), 'packages/mcp-server/src/index.ts');
  const source = await readFile(entryPath, 'utf-8');

  assert.ok(
    source.includes('sessionIdGenerator: undefined'),
    'should create a stateless streamable-http transport for compatibility clients'
  );
  assert.ok(
    source.includes('if (!sessionId)') && source.includes('await handleStatelessRequest'),
    'GET /mcp should fallback to stateless transport when mcp-session-id is absent'
  );
  assert.ok(
    source.includes('if (!sessionId && !isInitializeRequest(req.body))'),
    'POST /mcp should fallback to stateless transport for non-initialize requests without session id'
  );
});
