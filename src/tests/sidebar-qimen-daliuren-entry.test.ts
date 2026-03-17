import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { DEFAULT_SIDEBAR_CONFIG, normalizeSidebarConfig } from '@/lib/user/settings';

const sidebarPath = resolve(process.cwd(), 'src/components/layout/Sidebar.tsx');
const sidebarCustomizerPath = resolve(process.cwd(), 'src/components/settings/SidebarCustomizer.tsx');
const mobileNavPath = resolve(process.cwd(), 'src/components/layout/MobileNav.tsx');
const mobileCustomizerPath = resolve(process.cwd(), 'src/components/settings/MobileNavCustomizer.tsx');
const sidebarConfigContextPath = resolve(process.cwd(), 'src/components/layout/SidebarConfigContext.tsx');
const appSettingsPath = resolve(process.cwd(), 'src/lib/app-settings.ts');
const featureTogglePanelPath = resolve(process.cwd(), 'src/components/admin/FeatureTogglePanel.tsx');

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

test('desktop and mobile navigation surfaces should expose daliuren consistently', async () => {
  const [sidebarSource, sidebarCustomizerSource, mobileNavSource, mobileCustomizerSource, appSettingsSource] = await Promise.all([
    readFile(sidebarPath, 'utf-8'),
    readFile(sidebarCustomizerPath, 'utf-8'),
    readFile(mobileNavPath, 'utf-8'),
    readFile(mobileCustomizerPath, 'utf-8'),
    readFile(appSettingsPath, 'utf-8'),
  ]);

  assert.match(sidebarSource, /href:\s*'\/daliuren'/u);
  assert.match(sidebarCustomizerSource, /id:\s*'daliuren'/u);
  assert.match(mobileNavSource, /'daliuren':\s*\{\s*href:\s*'\/daliuren'/u);
  assert.match(mobileCustomizerSource, /id:\s*'qimen'/u);
  assert.match(mobileCustomizerSource, /id:\s*'daliuren'/u);
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
  const source = await readFile(featureTogglePanelPath, 'utf-8');

  assert.match(source, /id:\s*'qimen'/u);
  assert.match(source, /id:\s*'daliuren'/u);
});
