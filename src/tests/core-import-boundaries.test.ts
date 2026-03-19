import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const tarotWrapperPath = resolve(process.cwd(), 'src/lib/divination/tarot.ts');
const daliurenRoutePath = resolve(process.cwd(), 'src/app/api/daliuren/route.ts');
const qimenWrapperPath = resolve(process.cwd(), 'src/lib/divination/qimen.ts');

test('client tarot wrapper should import tarot core from a narrow subpath instead of the root package entry', async () => {
  const source = await readFile(tarotWrapperPath, 'utf-8');

  assert.match(
    source,
    /from '@mingai\/core\/tarot'/u,
    'tarot wrapper should avoid the root core entry so client bundles do not pull node-only handlers',
  );
});

test('daliuren route should use the dedicated daliuren subpath export', async () => {
  const source = await readFile(daliurenRoutePath, 'utf-8');

  assert.match(
    source,
    /handleDaliurenCalculate[\s\S]*from '@mingai\/core\/daliuren'/u,
    'daliuren route should import from the dedicated subpath export instead of the package root',
  );
  assert.doesNotMatch(
    source,
    /handleDaliurenCalculate[\s\S]*from '@mingai\/core'/u,
    'daliuren route should no longer reach through the root core package entry',
  );
});

test('qimen wrapper should use the dedicated qimen subpath export instead of the root package entry', async () => {
  const source = await readFile(qimenWrapperPath, 'utf-8');

  assert.match(
    source,
    /from '@mingai\/core\/qimen'/u,
    'qimen wrapper should avoid the root core entry so browser code only pulls the qimen adapter surface',
  );
  assert.doesNotMatch(
    source,
    /from '@mingai\/core'/u,
    'qimen wrapper should no longer import from the root core entry',
  );
});
