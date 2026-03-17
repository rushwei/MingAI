import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();

test('tool registry should own markdown formatter bindings', async () => {
  const [registrySource, formatterSource, toolOutputSource] = await Promise.all([
    readFile(resolve(root, 'packages/mcp-core/src/tool-registry.ts'), 'utf8'),
    readFile(resolve(root, 'packages/mcp-core/src/formatters.ts'), 'utf8'),
    readFile(resolve(root, 'packages/mcp-core/src/tool-output.ts'), 'utf8'),
  ]);

  assert.equal(registrySource.includes('markdownFormatter'), true);
  assert.equal(formatterSource.includes('markdownFormatters'), false);
  assert.equal(formatterSource.includes('getToolRegistryEntry'), false);
  assert.equal(toolOutputSource.includes('entry?.markdownFormatter'), true);
});
