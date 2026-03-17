import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const registryPath = resolve(root, 'packages/mcp-core/src/tool-registry.ts');
const formattersPath = resolve(root, 'packages/mcp-core/src/formatters.ts');
const toolOutputPath = resolve(root, 'packages/mcp-core/src/tool-output.ts');

let registrySource, formatterSource, toolOutputSource;

test('setup: load source files', async () => {
  [registrySource, formatterSource, toolOutputSource] = await Promise.all([
    readFile(registryPath, 'utf-8'),
    readFile(formattersPath, 'utf-8'),
    readFile(toolOutputPath, 'utf-8'),
  ]);
});

test('tool registry should own markdownFormatter bindings', () => {
  assert.match(registrySource, /markdownFormatter/u,
    'tool registry entries should carry markdown formatter bindings directly');
});

test('formatters.ts should not contain registry map or runtime lookups', () => {
  assert.equal(formatterSource.includes('markdownFormatters'), false,
    'formatters.ts should not own the formatter map');
  assert.equal(formatterSource.includes('getToolRegistryEntry'), false,
    'formatters.ts should only contain formatter implementations, not runtime registry lookups');
});

test('tool-output should render markdown via registry entry', () => {
  assert.match(toolOutputSource, /hasMarkdownFormatter/u,
    'tool-output should expose hasMarkdownFormatter');
  assert.match(toolOutputSource, /formatAsMarkdown/u,
    'tool-output should expose formatAsMarkdown');
  assert.equal(toolOutputSource.includes('structuredContent'), true,
    'tool-output should remain the single rendering policy entry');
  assert.equal(
    toolOutputSource.includes("getToolRegistryEntry(toolName)?.markdownFormatter"),
    true,
    'tool-output should render markdown from the registry entry'
  );
});
