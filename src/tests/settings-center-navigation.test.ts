import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  getSettingsCenterDisabledState,
  getSettingsCenterRouteTarget,
  getSettingsCenterTabs,
  parseSettingsCenterHash,
} from '../lib/settings-center';
import { DEFAULT_MOBILE_DRAWER_ORDER, DEFAULT_TOOL_ORDER } from '../lib/user/settings';

test('settings center keeps only the merged membership tab and falls back from legacy credits hash', () => {
  const tabs = getSettingsCenterTabs({
    upgradeEnabled: true,
    chartsEnabled: true,
    knowledgeBaseEnabled: true,
    mcpServiceEnabled: true,
    personalizationEnabled: true,
    helpEnabled: true,
    isAdmin: false,
  });
  const registrySource = readFileSync(resolve(process.cwd(), 'src/lib/navigation/registry.ts'), 'utf8');

  assert.equal(tabs.some((tab) => tab.id === 'upgrade' && tab.disabled === false), true);
  assert.equal(registrySource.includes("id: 'settings-upgrade', href: getSettingsCenterRouteTarget('upgrade')"), true);
  assert.equal(parseSettingsCenterHash('#settings/credits'), 'upgrade');
  assert.equal(
    getSettingsCenterRouteTarget('upgrade', { search: '?claim=ok' }),
    '/bazi?claim=ok#settings/upgrade',
  );
});

test('settings center exposes disabled state for the merged membership tab', () => {
  const flags = {
    upgradeEnabled: false,
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
});

test('settings center disables merged membership tab when upgrade is disabled', () => {
  const tabs = getSettingsCenterTabs({
    upgradeEnabled: false,
    chartsEnabled: true,
    knowledgeBaseEnabled: true,
    mcpServiceEnabled: true,
    personalizationEnabled: true,
    helpEnabled: true,
    isAdmin: false,
  });

  assert.equal(tabs.some((tab) => tab.id === 'upgrade' && tab.disabled === false), false);
  assert.deepEqual(getSettingsCenterDisabledState('upgrade', {
    upgradeEnabled: false,
    chartsEnabled: true,
    knowledgeBaseEnabled: true,
    mcpServiceEnabled: true,
    personalizationEnabled: true,
    helpEnabled: true,
    isAdmin: false,
  }), {
    title: '暂未开放',
    description: '当前会员与积分不可用。',
  });
});

test('checkin is removed from default user-facing tool orders', () => {
  const defaultToolOrder = DEFAULT_TOOL_ORDER as readonly string[];
  const defaultMobileDrawerOrder = DEFAULT_MOBILE_DRAWER_ORDER as readonly string[];

  assert.equal(defaultToolOrder.includes('checkin'), false);
  assert.equal(defaultMobileDrawerOrder.includes('checkin'), false);
  assert.equal(defaultMobileDrawerOrder.includes('user/credits'), false);
  assert.equal(defaultMobileDrawerOrder.includes('settings-upgrade'), true);
});

test('shared navigation and admin feature toggles no longer expose legacy credits entry', () => {
  const registrySource = readFileSync(resolve(process.cwd(), 'src/lib/navigation/registry.ts'), 'utf8');
  const headerSource = readFileSync(resolve(process.cwd(), 'src/components/layout/Header.tsx'), 'utf8');

  assert.equal(registrySource.includes("id: 'user/credits'"), false);
  assert.equal(headerSource.includes("'/user/credits'"), false);
  assert.equal(registrySource.includes("{ id: 'credits', label: '积分流水' }"), false);
  assert.equal(registrySource.includes("credits: '积分流水'"), false);
});

test('help navigation uses canonical /help route and removes /user/help mapping', () => {
  const registrySource = readFileSync(resolve(process.cwd(), 'src/lib/navigation/registry.ts'), 'utf8');

  assert.equal(registrySource.includes("id: 'settings-help', href: getSettingsCenterRouteTarget('help')"), true);
  assert.equal(registrySource.includes("href: '/help'"), false);
  assert.equal(registrySource.includes("href: '/user/help'"), false);
});

test('personalization navigation uses canonical settings-center route and removes legacy alias page', () => {
  const registrySource = readFileSync(resolve(process.cwd(), 'src/lib/navigation/registry.ts'), 'utf8');
  const settingsLinkSource = readFileSync(resolve(process.cwd(), 'src/components/settings/SettingsCenterLink.tsx'), 'utf8');
  const settingsCenterSource = readFileSync(resolve(process.cwd(), 'src/lib/settings-center.ts'), 'utf8');

  assert.equal(registrySource.includes("id: 'settings-personalization', href: getSettingsCenterRouteTarget('personalization')"), true);
  assert.equal(registrySource.includes("href: '/user/ai-settings'"), false);
  assert.equal(registrySource.includes("id: 'user/settings/ai'"), false);
  assert.equal(settingsLinkSource.includes('getSettingsCenterRouteTarget(tab)'), true);
  assert.equal(settingsCenterSource.includes("window.history[method](nextState, '', getSettingsCenterRouteTarget(tab,"), true);
  assert.equal(existsSync(resolve(process.cwd(), 'src/app/user/settings/ai/page.tsx')), false);
});

test('legacy checkin route is reduced to a settings-center launcher', () => {
  const checkinSource = readFileSync(resolve(process.cwd(), 'src/app/checkin/page.tsx'), 'utf8');
  const launcherSource = readFileSync(resolve(process.cwd(), 'src/components/settings/SettingsRouteLauncher.tsx'), 'utf8');

  assert.equal(checkinSource.includes('return <SettingsRouteLauncher tab="upgrade" />;'), true);
  assert.equal(checkinSource.includes('CheckinModal'), false);
  assert.equal(checkinSource.includes('FeatureGate'), false);
  assert.equal(launcherSource.includes('getSettingsCenterTabLabel(tab)'), true);
  assert.equal(launcherSource.includes('buildSettingsCenterHash(tab'), false);
});

test('privacy and terms pages link back to canonical settings help route instead of /help shell', () => {
  const privacySource = readFileSync(resolve(process.cwd(), 'src/app/privacy/page.tsx'), 'utf8');
  const termsSource = readFileSync(resolve(process.cwd(), 'src/app/terms/page.tsx'), 'utf8');

  assert.equal(privacySource.includes('getSettingsCenterRouteTarget(\'help\')'), true);
  assert.equal(privacySource.includes('href="/help"'), false);
  assert.equal(termsSource.includes('getSettingsCenterRouteTarget(\'help\')'), true);
  assert.equal(termsSource.includes('href="/help"'), false);
});

test('header uses canonical settings labels and legal-page back fallback', () => {
  const headerSource = readFileSync(resolve(process.cwd(), 'src/components/layout/Header.tsx'), 'utf8');

  assert.equal(headerSource.includes("'/checkin': '会员与积分'"), true);
  assert.equal(headerSource.includes("'/user/ai-settings': '个性化'"), true);
  assert.equal(headerSource.includes("'/user/settings': '设置'"), true);
  assert.equal(headerSource.includes("'/user/charts': '命盘'"), true);
  assert.equal(headerSource.includes("'/user/mcp': 'MCP OAuth'"), true);
  assert.equal(headerSource.includes("'/help': '帮助'"), true);
  assert.equal(headerSource.includes("'/privacy': '隐私政策'"), true);
  assert.equal(headerSource.includes("'/terms': '服务条款'"), true);
  assert.equal(headerSource.includes("'/admin/features': '功能与激活码'"), true);
  assert.equal(headerSource.includes("'/admin/announcements': '公告管理'"), true);
  assert.equal(headerSource.includes("'/privacy': getSettingsCenterRouteTarget('help')"), true);
  assert.equal(headerSource.includes("'/terms': getSettingsCenterRouteTarget('help')"), true);
  assert.equal(headerSource.includes("'/user/settings': '偏好设置'"), false);
  assert.equal(headerSource.includes("'/user/ai-settings': 'AI 个性化'"), false);
  assert.equal(headerSource.includes("'/help': '帮助中心'"), false);
});

test('legacy admin payment and user orders alias pages are removed', () => {
  assert.equal(existsSync(resolve(process.cwd(), 'src/app/admin/payment/page.tsx')), false);
  assert.equal(existsSync(resolve(process.cwd(), 'src/app/user/orders/page.tsx')), false);
});
