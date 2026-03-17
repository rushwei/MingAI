import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const registryPath = resolve(process.cwd(), 'packages/mcp-core/src/tool-registry.ts');
const toolOutputPath = resolve(process.cwd(), 'packages/mcp-core/src/tool-output.ts');
const formattersPath = resolve(process.cwd(), 'packages/mcp-core/src/formatters.ts');

test('mcp-core should bind markdown formatter and rendering policy through tool registry + tool-output', async () => {
  const [registrySource, toolOutputSource, formatterSource] = await Promise.all([
    readFile(registryPath, 'utf-8'),
    readFile(toolOutputPath, 'utf-8'),
    readFile(formattersPath, 'utf-8'),
  ]);

  assert.equal(
    registrySource.includes('markdownFormatter'),
    true,
    'tool registry entries should carry markdown formatter bindings directly'
  );
  assert.equal(
    toolOutputSource.includes("getToolRegistryEntry(toolName)?.markdownFormatter"),
    true,
    'tool-output should render markdown from the registry entry'
  );
  assert.equal(
    toolOutputSource.includes('structuredContent'),
    true,
    'tool-output should remain the single rendering policy entry'
  );
  assert.equal(
    formatterSource.includes('getToolRegistryEntry'),
    false,
    'formatters.ts should only contain formatter implementations, not runtime registry lookups'
  );
});
