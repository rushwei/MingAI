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

test('mcp-core should define a single tool registry as the source of truth', async () => {
  assert.equal(
    existsSync(registryPath),
    true,
    'mcp-core should expose a central tool-registry module'
  );

  const [toolsSource, indexSource, formatterSource] = await Promise.all([
    readFile(toolsPath, 'utf-8'),
    readFile(indexPath, 'utf-8'),
    readFile(formattersPath, 'utf-8'),
  ]);

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
