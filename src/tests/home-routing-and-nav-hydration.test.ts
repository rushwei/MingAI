import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const homePagePath = resolve(process.cwd(), 'src/app/page.tsx');
const sidebarPath = resolve(process.cwd(), 'src/components/layout/Sidebar.tsx');
const mobileNavPath = resolve(process.cwd(), 'src/components/layout/MobileNav.tsx');

test('home page should redirect both signed-in users and guests to user center after anonymous mode removal', async () => {
  const source = await readFile(homePagePath, 'utf-8');

  assert.ok(
    source.includes("redirect('/user')"),
    'home page should send every visitor to /user'
  );
  assert.doesNotMatch(
    source,
    /redirect\('\/fortune-hub'\)/u,
    'home page should no longer keep a guest-only fortune hub redirect'
  );
});

test('sidebar should avoid rendering fail-open entries before feature toggles and config finish loading', async () => {
  const source = await readFile(sidebarPath, 'utf-8');

  assert.ok(
    source.includes('loading: sidebarConfigLoading'),
    'sidebar should read sidebar config loading state'
  );
  assert.ok(
    source.includes('isLoading: featureLoading'),
    'sidebar should read feature toggle loading state'
  );
  assert.ok(
    source.includes('const isNavLoading = sidebarConfigLoading || sidebarConfigRefreshing || featureLoading || featureRefreshing'),
    'sidebar should combine config loading, refresh, and feature loading state'
  );
  assert.ok(
    source.includes('if (isNavLoading)'),
    'sidebar should gate initial navigation render while loading'
  );
  assert.doesNotMatch(
    source,
    /featureLoading\s*\?\s*true\s*:\s*isFeatureEnabled/u,
    'sidebar should not fail open while feature toggles are still loading',
  );
});

test('mobile nav should avoid rendering fail-open entries before feature toggles and config finish loading', async () => {
  const source = await readFile(mobileNavPath, 'utf-8');

  assert.ok(
    source.includes('loading: sidebarConfigLoading'),
    'mobile nav should read sidebar config loading state'
  );
  assert.ok(
    source.includes('isLoading: featureLoading'),
    'mobile nav should read feature toggle loading state'
  );
  assert.ok(
    source.includes('const isNavLoading = sidebarConfigLoading || sidebarConfigRefreshing || featureLoading || featureRefreshing'),
    'mobile nav should combine config loading, refresh, and feature loading state'
  );
  assert.ok(
    source.includes('if (isNavLoading)'),
    'mobile nav should gate initial navigation render while loading'
  );
  assert.doesNotMatch(
    source,
    /featureLoading\s*\?\s*true\s*:\s*isFeatureEnabled/u,
    'mobile nav should not fail open while feature toggles are still loading',
  );
});
