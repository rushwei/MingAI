import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const packageJsonPath = resolve(process.cwd(), 'packages/core/package.json');
const toolsPath = resolve(process.cwd(), 'packages/core/src/tools.ts');
const toolSchemaPath = resolve(process.cwd(), 'packages/core/src/tool-schema.ts');
const indexPath = resolve(process.cwd(), 'packages/core/src/index.ts');
const formattersPath = resolve(process.cwd(), 'packages/core/src/formatters.ts');

test('qimen runtime dependency should be declared in core package manifest', async () => {
  const pkg = JSON.parse(await readFile(packageJsonPath, 'utf-8'));

  assert.equal(typeof pkg.dependencies?.taobi, 'string', 'core should declare taobi as a runtime dependency');
});

test('core tool surface should expose qimen寄宫 option and avoid re-adding removed legacy aliases', async () => {
  const [toolsSource, toolSchemaSource, indexSource, formatterSource] = await Promise.all([
    readFile(toolsPath, 'utf-8'),
    readFile(toolSchemaPath, 'utf-8'),
    readFile(indexPath, 'utf-8'),
    readFile(formattersPath, 'utf-8'),
  ]);

  assert.match(
    toolSchemaSource,
    /zhiFuJiGong/u,
    'qimen tool schema should expose the zhiFuJiGong option that the web and api layers already accept',
  );

  for (const alias of ['LEGACY_TOOL_ALIASES', "case 'liuyao_analyze'", "case 'tarot_draw'", "case 'daily_fortune'", "case 'dayun_calculate'"]) {
    assert.equal(
      toolsSource.includes(alias) || indexSource.includes(alias) || formatterSource.includes(alias),
      false,
      `${alias} should not remain after canonical MCP tool renaming`,
    );
  }
});
