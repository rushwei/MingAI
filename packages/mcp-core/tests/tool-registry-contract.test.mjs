import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const registryPath = resolve(root, 'packages/mcp-core/src/tool-registry.ts');
const toolsPath = resolve(root, 'packages/mcp-core/src/tools.ts');
const indexPath = resolve(root, 'packages/mcp-core/src/index.ts');
const formattersPath = resolve(root, 'packages/mcp-core/src/formatters.ts');
const toolOutputPath = resolve(root, 'packages/mcp-core/src/tool-output.ts');

let registrySource, formatterSource, toolOutputSource, toolsSource, indexSource;

test('setup: load source files', async () => {
  [registrySource, formatterSource, toolOutputSource, toolsSource, indexSource] = await Promise.all([
    readFile(registryPath, 'utf-8'),
    readFile(formattersPath, 'utf-8'),
    readFile(toolOutputPath, 'utf-8'),
    readFile(toolsPath, 'utf-8'),
    readFile(indexPath, 'utf-8'),
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

// Architecture guard: tool-registry is the single source of truth for tool definitions.
// If this test fails after refactoring, update the assertion to match new structure.
test('tool registry is the single source of truth for tool definitions', () => {
  assert.equal(
    existsSync(registryPath),
    true,
    'mcp-core should expose a central tool-registry module'
  );

  assert.match(toolsSource, /tool-registry/u, 'tools.ts should derive exported tools from the registry');
  assert.match(indexSource, /tool-registry/u, 'index.ts should derive dispatch from the registry');
  assert.match(formatterSource, /tool-registry/u, 'formatters.ts should derive markdown formatters from the registry');

  for (const legacySwitch of ["case 'bazi_calculate'", "case 'liuyao'", "case 'qimen_calculate'"]) {
    assert.equal(
      indexSource.includes(legacySwitch) || formatterSource.includes(legacySwitch),
      false,
      `${legacySwitch} should no longer be duplicated in local switch statements`
    );
  }
});
