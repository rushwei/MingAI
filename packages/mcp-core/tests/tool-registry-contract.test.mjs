import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const registryPath = resolve(process.cwd(), 'packages/mcp-core/src/tool-registry.ts');
const formattersPath = resolve(process.cwd(), 'packages/mcp-core/src/formatters.ts');
const toolOutputPath = resolve(process.cwd(), 'packages/mcp-core/src/tool-output.ts');

test('tool registry should own formatter bindings while tool-output owns rendering policy', async () => {
  const [registrySource, formatterSource, toolOutputSource] = await Promise.all([
    readFile(registryPath, 'utf-8'),
    readFile(formattersPath, 'utf-8'),
    readFile(toolOutputPath, 'utf-8'),
  ]);

  assert.match(registrySource, /markdownFormatter/u);
  assert.equal(formatterSource.includes('markdownFormatters'), false);
  assert.equal(formatterSource.includes('getToolRegistryEntry'), false);
  assert.match(toolOutputSource, /hasMarkdownFormatter/u);
  assert.match(toolOutputSource, /formatAsMarkdown/u);
});
