import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const registryPath = resolve(process.cwd(), 'packages/mcp-core/src/tool-registry.ts');
const formattersPath = resolve(process.cwd(), 'packages/mcp-core/src/formatters.ts');

function extractFormatterKeysFromRegistry(source) {
  return source
    .split('\n')
    .map((line) => line.match(/adaptToolHandler\([^)]*\),\s*'([^']+)'\)/)?.[1] ?? null)
    .filter(Boolean);
}

function extractFormatterKeysFromMap(source) {
  const blockMatch = source.match(/const markdownFormatters:[\s\S]*?=\s*\{([\s\S]*?)\n\};/);
  if (!blockMatch) return [];
  return [...blockMatch[1].matchAll(/^\s*([A-Za-z0-9_]+):/gm)].map((match) => match[1]);
}

test('tool registry formatter keys should stay aligned with markdown formatter map', async () => {
  const [registrySource, formatterSource] = await Promise.all([
    readFile(registryPath, 'utf-8'),
    readFile(formattersPath, 'utf-8'),
  ]);

  const registryKeys = extractFormatterKeysFromRegistry(registrySource).sort();
  const formatterKeys = extractFormatterKeysFromMap(formatterSource).sort();

  assert.deepEqual(registryKeys, formatterKeys);
  assert.match(formatterSource, /hasMarkdownFormatter/u);
});
