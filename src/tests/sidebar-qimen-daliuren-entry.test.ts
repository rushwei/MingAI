import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_SIDEBAR_CONFIG, normalizeSidebarConfig } from '@/lib/user/settings';

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
});
