import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const daliurenRoutePath = resolve(process.cwd(), 'src/app/api/daliuren/route.ts');

test('daliuren calculate should pass timezone into core handler', async () => {
  const source = await readFile(daliurenRoutePath, 'utf-8');
  const calculateStart = source.indexOf("case 'calculate'");
  const saveStart = source.indexOf("case 'save'");

  assert.ok(calculateStart >= 0, 'calculate case should exist');
  assert.ok(saveStart > calculateStart, 'save case should follow calculate case');
  const calculateBlock = source.slice(calculateStart, saveStart);

  assert.match(
    calculateBlock,
    /const\s+\{[^}]*timezone[^}]*\}\s*=\s*body/u,
    'calculate action should extract timezone from request body',
  );
  assert.match(
    calculateBlock,
    /handleDaliurenCalculate\(\{\s*[\s\S]*?timezone[\s\S]*?\}\s*\)/u,
    'route should forward timezone to daliuren core calculation',
  );
});
