import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const sidebarPath = resolve(process.cwd(), 'src/components/layout/Sidebar.tsx');
const sidebarConfigContextPath = resolve(process.cwd(), 'src/components/layout/SidebarConfigContext.tsx');
const featureTogglesPath = resolve(process.cwd(), 'src/lib/hooks/useFeatureToggles.ts');

test('sidebar should not use featureLoading to block initial render', async () => {
  const source = await readFile(sidebarPath, 'utf-8');

  assert.match(source, /featureLoading/u);
  assert.match(source, /featureRefreshing/u);
  assert.ok(!/sidebarConfigLoading\s*\|\|\s*featureLoading/u.test(source));
  assert.match(source, /featureLoading\s*\?\s*true\s*:\s*isFeatureEnabled/u);
});

test('sidebar config context should expose refreshing state', async () => {
  const source = await readFile(sidebarConfigContextPath, 'utf-8');

  assert.match(source, /refreshing:\s*boolean/u);
  assert.match(source, /refreshing:\s*.*refreshing/u);
});

test('feature toggles hook should expose isRefreshing and allow refresh to request loading', async () => {
  const source = await readFile(featureTogglesPath, 'utf-8');

  assert.match(source, /isRefreshing:\s*boolean/u);
  assert.match(source, /refresh:\s*\(force\?:\s*boolean,\s*showLoading\?:\s*boolean\)/u);
});
