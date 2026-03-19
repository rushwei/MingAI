import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const registryPath = resolve(root, 'packages/core/src/tool-registry.ts');
const formattersPath = resolve(root, 'packages/core/src/formatters.ts');
const toolOutputPath = resolve(root, 'packages/core/src/tool-output.ts');
const mcpServerPath = resolve(root, 'packages/mcp-server/src/index.ts');

test('tool output policy should be derived from registry entries instead of duplicated maps', async () => {
  const [registrySource, formatterSource, toolOutputSource, mcpServerSource] = await Promise.all([
    readFile(registryPath, 'utf8'),
    readFile(formattersPath, 'utf8'),
    readFile(toolOutputPath, 'utf8'),
    readFile(mcpServerPath, 'utf8'),
  ]);

  assert.match(registrySource, /markdownFormatter/u);
  assert.equal(formatterSource.includes('const markdownFormatters'), false);
  assert.equal(formatterSource.includes('getToolRegistryEntry'), false);
  assert.match(toolOutputSource, /renderToolResult/u);
  assert.match(toolOutputSource, /structuredContent/u);
  assert.match(mcpServerSource, /buildToolSuccessPayload/u);
});
