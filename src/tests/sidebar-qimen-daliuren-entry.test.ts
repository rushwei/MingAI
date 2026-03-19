import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { DEFAULT_SIDEBAR_CONFIG, normalizeSidebarConfig } from '@/lib/user/settings';

const sidebarPath = resolve(process.cwd(), 'src/components/layout/Sidebar.tsx');
const mobileNavPath = resolve(process.cwd(), 'src/components/layout/MobileNav.tsx');
const mobileCustomizerPath = resolve(process.cwd(), 'src/components/settings/MobileNavCustomizer.tsx');
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

test('legacy mobile configs should still surface newly introduced drawer items', async () => {
  const [mobileNavSource, mobileCustomizerSource] = await Promise.all([
    readFile(mobileNavPath, 'utf-8'),
    readFile(mobileCustomizerPath, 'utf-8'),
  ]);

  const settingsModule = await import('@/lib/user/settings') as unknown as {
    getEffectiveMobileDrawerOrder?: (config: {
      mobileMainItems?: string[];
      mobileDrawerOrder?: string[];
      hiddenMobileItems?: string[];
    }) => string[];
  };

  assert.equal(
    typeof settingsModule.getEffectiveMobileDrawerOrder,
    'function',
    'user settings should expose a shared mobile drawer fallback helper',
  );

  const resolvedOrder = settingsModule.getEffectiveMobileDrawerOrder!({
    mobileMainItems: ['fortune-hub', 'chat'],
    mobileDrawerOrder: ['bazi', 'records', 'community'],
    hiddenMobileItems: [],
  });

  assert.deepEqual(resolvedOrder.slice(0, 5), ['bazi', 'records', 'community', 'hepan', 'ziwei']);
  assert.ok(resolvedOrder.includes('qimen'));
  assert.ok(resolvedOrder.includes('daliuren'));
  assert.ok(
    resolvedOrder.indexOf('qimen') > resolvedOrder.indexOf('community'),
    'new drawer items should be appended after the user-configured prefix',
  );
  assert.match(mobileNavSource, /getEffectiveMobileDrawerOrder\(config\)/u);
  assert.match(mobileCustomizerSource, /getEffectiveMobileDrawerOrder\(\s*\{/u);
});

test('navigation registry should expose daliuren and qimen consistently', async () => {
  const registryPath = resolve(process.cwd(), 'src/lib/navigation/registry.ts');
  const registrySource = await readFile(registryPath, 'utf-8');

  // Verify registry includes daliuren and qimen in nav items
  assert.match(registrySource, /id:\s*['"]daliuren['"]/u, 'registry should define daliuren nav item');
  assert.match(registrySource, /id:\s*['"]qimen['"]/u, 'registry should define qimen nav item');

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
  const registryPath = resolve(process.cwd(), 'src/lib/navigation/registry.ts');
  const registrySource = await readFile(registryPath, 'utf-8');

  // Verify getFeatureModules includes qimen and daliuren
  assert.match(registrySource, /getFeatureModules/u, 'registry should export getFeatureModules');
  assert.match(registrySource, /id:\s*['"]qimen['"]/u, 'registry should define qimen feature module');
  assert.match(registrySource, /id:\s*['"]daliuren['"]/u, 'registry should define daliuren feature module');
});
