import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { listToolDefinitions } from '@mingai/core/mcp';

const coreRoot = resolve(process.cwd(), 'packages/core');
const packageJson = JSON.parse(readFileSync(resolve(coreRoot, 'package.json'), 'utf8'));
const readme = readFileSync(resolve(coreRoot, 'README.md'), 'utf8');
const rootIndex = readFileSync(resolve(coreRoot, 'src/index.ts'), 'utf8');
const typesIndex = readFileSync(resolve(coreRoot, 'src/types.ts'), 'utf8');
const jsonTypesIndex = readFileSync(resolve(coreRoot, 'src/json-types.ts'), 'utf8');
const mcpTools = readFileSync(resolve(coreRoot, 'src/mcp/tools.ts'), 'utf8');

const expectedDomains = [
  { domain: 'astrology', tool: 'astrology' },
  { domain: 'bazi', tool: 'bazi' },
  { domain: 'bazi-dayun', tool: 'bazi_dayun' },
  { domain: 'bazi-pillars-resolve', tool: 'bazi_pillars_resolve' },
  { domain: 'almanac', tool: 'almanac' },
  { domain: 'liuyao', tool: 'liuyao' },
  { domain: 'meihua', tool: 'meihua' },
  { domain: 'qimen', tool: 'qimen' },
  { domain: 'tarot', tool: 'tarot' },
  { domain: 'taiyi', tool: 'taiyi' },
  { domain: 'daliuren', tool: 'daliuren' },
  { domain: 'xiaoliuren', tool: 'xiaoliuren' },
  { domain: 'ziwei', tool: 'ziwei' },
  { domain: 'ziwei-horoscope', tool: 'ziwei_horoscope' },
  { domain: 'ziwei-flying-star', tool: 'ziwei_flying_star' },
];

test('public core domains should stay aligned across exports, docs, and MCP registry', () => {
  const toolNames = new Set(listToolDefinitions().map((item) => item.name));

  for (const { domain, tool } of expectedDomains) {
    assert.match(rootIndex, new RegExp(`domains/${domain}/index\\.js`), `${domain} should be exported from src/index.ts`);
    assert.match(typesIndex, new RegExp(`domains/${domain}/types\\.js`), `${domain} should be exported from src/types.ts`);
    assert.match(jsonTypesIndex, new RegExp(`domains/${domain}/json-types\\.js`), `${domain} should be exported from src/json-types.ts`);
    assert.ok(packageJson.exports[`./${domain}`], `${domain} should have a package.json subpath export`);
    assert.match(readme, new RegExp(`@mingai/core/${domain.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`), `${domain} should be documented in README domain list`);
    assert.match(mcpTools, new RegExp(`domains/${domain}/tool\\.js`), `${domain} should be registered in src/mcp/tools.ts`);
    assert.equal(toolNames.has(tool), true, `${tool} should be exposed via MCP`);
    assert.match(readme, new RegExp(`\\|\\s+\\\`${tool.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\\`\\s+\\|`), `${tool} should be documented in README tool list`);
  }
});

test('root core entry should expose canonical json/text option types for newly added domains', () => {
  for (const typeName of [
    'AstrologyAspectJSON',
    'AstrologyCanonicalJSON',
    'AstrologyCanonicalTextOptions',
    'AstrologyFactorJSON',
    'AstrologyHouseJSON',
    'TaiyiCanonicalJSON',
    'TaiyiCanonicalTextOptions',
    'XiaoliurenCanonicalJSON',
  ]) {
    assert.match(rootIndex, new RegExp(`\\b${typeName}\\b`), `${typeName} should be exported from src/index.ts`);
  }
});
