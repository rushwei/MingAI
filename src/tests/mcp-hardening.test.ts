import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const mcpKeysLibPath = resolve(process.cwd(), 'src/lib/mcp-keys.ts');
const adminKeyRoutePath = resolve(process.cwd(), 'src/app/api/admin/mcp-keys/route.ts');
const gitignorePath = resolve(process.cwd(), '.gitignore');

test('admin MCP key list should not expose raw key_code payload to frontend', async () => {
  const source = await readFile(mcpKeysLibPath, 'utf-8');

  assert.ok(
    !source.includes('key_code: row.key_code'),
    'getAllMcpKeys should not map raw key_code into API response objects'
  );
});

test('admin MCP key list should not rely on postgrest relationship join for users', async () => {
  const source = await readFile(mcpKeysLibPath, 'utf-8');

  assert.ok(
    !source.includes('users:user_id('),
    'getAllMcpKeys should not use users:user_id relationship join'
  );
});

test('admin MCP key DELETE route should guard invalid JSON body', async () => {
  const source = await readFile(adminKeyRoutePath, 'utf-8');

  assert.match(
    source,
    /try\s*\{[\s\S]*await request\.json\(\)/,
    'DELETE route should wrap request.json() in try/catch'
  );
});

test('admin MCP key PATCH route should guard invalid JSON body', async () => {
  const source = await readFile(adminKeyRoutePath, 'utf-8');

  assert.match(
    source,
    /export\s+async\s+function\s+PATCH[\s\S]*try\s*\{[\s\S]*await request\.json\(\)/,
    'PATCH unban route should wrap request.json() in try/catch'
  );
});

test('gitignore should exclude nested package node_modules directories', async () => {
  const source = await readFile(gitignorePath, 'utf-8');

  assert.ok(
    source.includes('**/node_modules'),
    'gitignore should include nested node_modules ignore rule'
  );
});
