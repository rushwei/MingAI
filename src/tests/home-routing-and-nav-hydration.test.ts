import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const homePagePath = resolve(process.cwd(), 'src/app/page.tsx');
const sidebarPath = resolve(process.cwd(), 'src/components/layout/Sidebar.tsx');
const mobileNavPath = resolve(process.cwd(), 'src/components/layout/MobileNav.tsx');

test('home page should redirect logged-in users to user center and guests to fortune hub', async () => {
  const source = await readFile(homePagePath, 'utf-8');

  assert.ok(
    source.includes('createRequestSupabaseClient'),
    'home page should inspect the current server-side session'
  );
  assert.ok(
    source.includes("redirect('/user')"),
    'home page should send signed-in users to /user'
  );
  assert.ok(
    source.includes("redirect('/fortune-hub')"),
    'home page should still send guests to /fortune-hub'
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
    source.includes('const isNavLoading = sidebarConfigLoading || sidebarConfigRefreshing || featureRefreshing'),
    'sidebar should combine config and feature loading state'
  );
  assert.ok(
    source.includes('if (isNavLoading)'),
    'sidebar should gate initial navigation render while loading'
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
    source.includes('const isNavLoading = sidebarConfigLoading || sidebarConfigRefreshing || featureRefreshing'),
    'mobile nav should combine config and feature loading state'
  );
  assert.ok(
    source.includes('if (isNavLoading)'),
    'mobile nav should gate initial navigation render while loading'
  );
});
