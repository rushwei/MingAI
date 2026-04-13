import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  getSettingsCenterDisabledState,
  getSettingsCenterRouteTarget,
  getSettingsCenterTabs,
  parseSettingsCenterHash,
} from '../lib/settings-center';
import { DEFAULT_MOBILE_DRAWER_ORDER, DEFAULT_TOOL_ORDER } from '../lib/user/settings';

test('settings center keeps only the merged membership tab and rejects removed legacy credits hash', () => {
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
  assert.equal(parseSettingsCenterHash('#settings/credits'), null);
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

test('help navigation uses canonical settings-center route and removes old help shells', () => {
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
});

test('settings center host should load standalone panel modules instead of app route pages', () => {
  const hostSource = readFileSync(resolve(process.cwd(), 'src/components/settings/SettingsCenterHost.tsx'), 'utf8');

  assert.equal(hostSource.includes("@/components/settings/panels/GeneralSettingsPanel"), true);
  assert.equal(hostSource.includes("@/components/settings/panels/AISettingsPanel"), true);
  assert.equal(hostSource.includes("@/components/settings/panels/UpgradePanel"), true);
  assert.equal(hostSource.includes("@/components/settings/panels/ProfilePanel"), true);
  assert.equal(hostSource.includes("@/components/settings/panels/ChartsPanel"), true);
  assert.equal(hostSource.includes("@/components/settings/panels/KnowledgeBasePanel"), true);
  assert.equal(hostSource.includes("@/components/settings/panels/McpServicePanel"), true);
  assert.equal(hostSource.includes("@/components/settings/panels/HelpPanel"), true);
  assert.equal(hostSource.includes("import('@/app/user/settings/page')"), false);
  assert.equal(hostSource.includes("import('@/app/user/profile/page')"), false);
  assert.equal(hostSource.includes("import('@/app/help/page')"), false);
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
  const announcementHostSource = readFileSync(resolve(process.cwd(), 'src/components/providers/AnnouncementPopupHost.tsx'), 'utf8');

  assert.equal(headerSource.includes("'/checkin': '会员与积分'"), false);
  assert.equal(headerSource.includes("'/user/ai-settings': '个性化'"), false);
  assert.equal(headerSource.includes("'/user/settings': '设置'"), false);
  assert.equal(headerSource.includes("'/user/charts': '命盘'"), false);
  assert.equal(headerSource.includes("'/user/mcp': 'MCP OAuth'"), false);
  assert.equal(headerSource.includes("'/help': '帮助'"), false);
  assert.equal(headerSource.includes("'/privacy': '隐私政策'"), true);
  assert.equal(headerSource.includes("'/terms': '服务条款'"), true);
  assert.equal(headerSource.includes("'/admin/features': '功能与激活码'"), false);
  assert.equal(headerSource.includes("'/admin/announcements': '公告管理'"), false);
  assert.equal(headerSource.includes("'/privacy': getSettingsCenterRouteTarget('help')"), true);
  assert.equal(headerSource.includes("'/terms': getSettingsCenterRouteTarget('help')"), true);
  assert.equal(headerSource.includes("'/user/settings': '偏好设置'"), false);
  assert.equal(headerSource.includes("'/user/ai-settings': 'AI 个性化'"), false);
  assert.equal(headerSource.includes("'/help': '帮助中心'"), false);
  assert.equal(headerSource.includes("useActiveSettingsCenterTab"), true);
  assert.equal(headerSource.includes("isAdminSettingsCenterTab(activeSettingsTab)"), true);
  assert.equal(announcementHostSource.includes("useActiveSettingsCenterTab"), true);
  assert.equal(announcementHostSource.includes("isAdminSettingsCenterTab(activeSettingsTab)"), true);
});

test('navigation registry no longer carries dead checkin-only tool filtering', () => {
  const registrySource = readFileSync(resolve(process.cwd(), 'src/lib/navigation/registry.ts'), 'utf8');

  assert.equal(registrySource.includes("n.id !== 'checkin'"), false);
});
