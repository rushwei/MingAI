import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { DEFAULT_SIDEBAR_CONFIG, normalizeSidebarConfig } from '@/lib/user/settings';

const sidebarPath = resolve(process.cwd(), 'src/components/layout/Sidebar.tsx');
const mobileNavPath = resolve(process.cwd(), 'src/components/layout/MobileNav.tsx');
const sidebarConfigContextPath = resolve(process.cwd(), 'src/components/layout/SidebarConfigContext.tsx');
const appSettingsPath = resolve(process.cwd(), 'src/lib/app-settings.ts');

test('sidebar config defaults should include qimen and daliuren for new users', () => {
  assert.ok(DEFAULT_SIDEBAR_CONFIG.navOrder.includes('qimen'));
  assert.ok(DEFAULT_SIDEBAR_CONFIG.navOrder.includes('daliuren'));
  assert.ok(DEFAULT_SIDEBAR_CONFIG.mobileDrawerOrder.includes('qimen'));
  assert.ok(DEFAULT_SIDEBAR_CONFIG.mobileDrawerOrder.includes('daliuren'));
});

test('normalizeSidebarConfig should not auto-append missing items', () => {
  const normalized = normalizeSidebarConfig({
    hiddenNavItems: [],
    hiddenToolItems: [],
    navOrder: ['fortune-hub', 'bazi', 'hepan'],
    toolOrder: ['chat', 'daily'],
    mobileMainItems: ['fortune-hub', 'chat'],
    mobileDrawerOrder: ['bazi', 'records', 'community'],
    hiddenMobileItems: [],
  });

  assert.equal(normalized.navOrder.includes('qimen'), false);
  assert.equal(normalized.navOrder.includes('daliuren'), false);
  assert.equal(normalized.mobileDrawerOrder.includes('qimen'), false);
  assert.equal(normalized.mobileDrawerOrder.includes('daliuren'), false);
});

test('navigation registry should expose daliuren and qimen consistently', async () => {
  const { getSidebarNavItems, getMobileItemsList } = await import('@/lib/navigation/registry');

  const sidebarIds = getSidebarNavItems().map(n => n.id);
  assert.ok(sidebarIds.includes('daliuren'), 'sidebar nav should include daliuren');
  assert.ok(sidebarIds.includes('qimen'), 'sidebar nav should include qimen');

  const mobileIds = getMobileItemsList().map(n => n.id);
  assert.ok(mobileIds.includes('daliuren'), 'mobile items should include daliuren');
  assert.ok(mobileIds.includes('qimen'), 'mobile items should include qimen');

  // Sidebar and MobileNav should import from registry
  const [sidebarSource, mobileNavSource] = await Promise.all([
    readFile(sidebarPath, 'utf-8'),
    readFile(mobileNavPath, 'utf-8'),
  ]);

  assert.match(sidebarSource, /from\s+['"]@\/lib\/navigation\/registry['"]/u);
  assert.match(mobileNavSource, /from\s+['"]@\/lib\/navigation\/registry['"]/u);

  const appSettingsSource = await readFile(appSettingsPath, 'utf-8');
  assert.match(appSettingsSource, /'daliuren'/u);
});

test('mobile customizers should gate drawer items using feature id mapping', async () => {
  const mobileNavSource = await readFile(mobileNavPath, 'utf-8');
  const mobileCustomizerSource = await readFile(mobileCustomizerPath, 'utf-8');

  assert.match(mobileNavSource, /toFeatureId\(id\)/u);
  assert.match(mobileCustomizerSource, /toFeatureId\(item\.id\)/u);
});

test('sidebar config context should normalize cached config before using it', async () => {
  const source = await readFile(sidebarConfigContextPath, 'utf-8');

  assert.match(source, /normalizeSidebarConfig\(cached\)/u);
});

test('admin feature panel should expose qimen and daliuren toggles', async () => {
  const { getFeatureModules } = await import('@/lib/navigation/registry');
  const modules = getFeatureModules();
  const ids = modules.map(m => m.id);

  assert.ok(ids.includes('qimen'), 'getFeatureModules should include qimen');
  assert.ok(ids.includes('daliuren'), 'getFeatureModules should include daliuren');
});
