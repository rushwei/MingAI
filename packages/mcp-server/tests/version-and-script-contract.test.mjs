import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

test('root web scripts should not be blocked by mcp-core build presteps', async () => {
  const packageJson = JSON.parse(
    await readFile(resolve(process.cwd(), 'package.json'), 'utf-8')
  );

  for (const scriptName of ['dev', 'build']) {
    const script = packageJson.scripts?.[scriptName] ?? '';
    assert.doesNotMatch(
      script,
      /packages\/mcp-core build/u,
      `${scriptName} should not force a prebuild of packages/mcp-core`
    );
  }
});

test('online MCP server version should come from package metadata instead of a hardcoded literal', async () => {
  const source = await readFile(resolve(process.cwd(), 'packages/mcp-server/src/index.ts'), 'utf-8');

  assert.doesNotMatch(
    source,
    /version:\s*'1\.0\.0'/u,
    'online MCP server should derive its version from package.json just like the local server'
  );
  assert.match(
    source,
    /require\('\.\.\/package\.json'\)/u,
    'online MCP server should read package metadata through package.json'
  );
});
