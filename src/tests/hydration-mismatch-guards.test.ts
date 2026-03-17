import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const featureTogglesPath = resolve(process.cwd(), 'src/lib/hooks/useFeatureToggles.ts');
const daliurenPagePath = resolve(process.cwd(), 'src/app/daliuren/page.tsx');
const featureGatePath = resolve(process.cwd(), 'src/components/layout/FeatureGate.tsx');

test('feature toggles should not hydrate from local cache during initial render', async () => {
  const source = await readFile(featureTogglesPath, 'utf-8');

  const initialStateMatch = source.match(/function\s+getInitialStoreState[\s\S]*?\}/u);
  assert.ok(initialStateMatch, 'getInitialStoreState should exist');

  const initialStateBody = initialStateMatch?.[0] ?? '';
  assert.match(initialStateBody, /toggles:\s*null/u);
  assert.match(initialStateBody, /isLoading:\s*true/u);
  assert.ok(!/readWarmToggles\(/u.test(initialStateBody), 'initial store state should not read local cache');
});

test('daliuren page should defer date/time defaults to client effect', async () => {
  const source = await readFile(daliurenPagePath, 'utf-8');

  assert.equal(/useState\(\(\)\s*=>[\s\S]*new Date/u.test(source), false);
  assert.match(source, /useEffect\(\(\)\s*=>[\s\S]*setDate\(/u);
  assert.match(source, /useEffect\(\(\)\s*=>[\s\S]*setHour\(/u);
  assert.match(source, /useEffect\(\(\)\s*=>[\s\S]*setMinute\(/u);
});

test('FeatureGate should guard initial render to avoid hydration mismatch', async () => {
  const source = await readFile(featureGatePath, 'utf-8');

  assert.match(source, /useSyncExternalStore/u);
  assert.match(source, /\(\)\s*=>\s*false/u);
  assert.match(source, /if\s*\(\s*!\w+\s*\|\|\s*isLoading\s*\)/u);
});
