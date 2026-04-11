import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  getSettingsCenterDisabledState,
  getSettingsCenterLegacyPath,
  getSettingsCenterRouteTarget,
  getSettingsCenterTabs,
  parseSettingsCenterHash,
} from '../lib/settings-center';
import { DEFAULT_MOBILE_DRAWER_ORDER, DEFAULT_TOOL_ORDER } from '../lib/user/settings';

test('settings center keeps only the merged membership tab while preserving legacy credits route', () => {
  const tabs = getSettingsCenterTabs({
    upgradeEnabled: true,
    creditsEnabled: true,
    chartsEnabled: true,
    knowledgeBaseEnabled: true,
    mcpServiceEnabled: true,
    personalizationEnabled: true,
    helpEnabled: true,
    isAdmin: false,
  });

  assert.equal(tabs.some((tab) => tab.id === 'upgrade' && tab.disabled === false), true);
  assert.equal(tabs.some((tab) => tab.id === 'credits'), false);
  assert.equal(getSettingsCenterLegacyPath('upgrade'), '/user/upgrade');
  assert.equal(getSettingsCenterLegacyPath('credits'), '/user/credits');
  assert.equal(parseSettingsCenterHash('#settings/credits'), 'upgrade');
  assert.equal(
    getSettingsCenterRouteTarget('upgrade', { search: '?claim=ok' }),
    '/bazi?claim=ok#settings/upgrade',
  );
});

test('settings center exposes disabled states for membership and credits tabs', () => {
  const flags = {
    upgradeEnabled: false,
    creditsEnabled: false,
    chartsEnabled: true,
    knowledgeBaseEnabled: true,
    mcpServiceEnabled: true,
    personalizationEnabled: true,
    helpEnabled: true,
    isAdmin: false,
  };

  assert.deepEqual(getSettingsCenterDisabledState('upgrade', flags), {
    title: '暂未开放',
    description: '当前会员与积分不可用。',
  });
  assert.deepEqual(getSettingsCenterDisabledState('credits', flags), {
    title: '暂未开放',
    description: '当前积分流水不可用。',
  });
});

test('settings center keeps merged membership tab available when only credits is enabled', () => {
  const tabs = getSettingsCenterTabs({
    upgradeEnabled: false,
    creditsEnabled: true,
    chartsEnabled: true,
    knowledgeBaseEnabled: true,
    mcpServiceEnabled: true,
    personalizationEnabled: true,
    helpEnabled: true,
    isAdmin: false,
  });

  assert.equal(tabs.some((tab) => tab.id === 'upgrade' && tab.disabled === false), true);
  assert.equal(getSettingsCenterDisabledState('upgrade', {
    upgradeEnabled: false,
    creditsEnabled: true,
    chartsEnabled: true,
    knowledgeBaseEnabled: true,
    mcpServiceEnabled: true,
    personalizationEnabled: true,
    helpEnabled: true,
    isAdmin: false,
  }), null);
});

test('checkin is removed from default user-facing tool orders', () => {
  assert.equal(DEFAULT_TOOL_ORDER.includes('checkin'), false);
  assert.equal(DEFAULT_MOBILE_DRAWER_ORDER.includes('checkin'), false);
  assert.equal(DEFAULT_MOBILE_DRAWER_ORDER.includes('user/credits'), false);
});
