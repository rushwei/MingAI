import test from 'node:test';
import assert from 'node:assert/strict';
import { getSettingsCenterDisabledState, getSettingsCenterTabs } from '../lib/settings-center';

test('settings center should group account and extension tabs while hiding management tabs for non-admin users', () => {
  const tabs = getSettingsCenterTabs({
    chartsEnabled: false,
    knowledgeBaseEnabled: true,
    mcpServiceEnabled: false,
    personalizationEnabled: false,
    helpEnabled: true,
    isAdmin: false,
  });

  assert.equal(tabs.find((tab) => tab.id === 'profile')?.group, 'account');
  assert.equal(tabs.find((tab) => tab.id === 'knowledge-base')?.group, 'extensions');
  assert.equal(tabs.find((tab) => tab.id === 'charts')?.disabled, true);
  assert.equal(tabs.find((tab) => tab.id === 'personalization')?.disabled, true);
  assert.equal(tabs.find((tab) => tab.id === 'mcp-service')?.disabled, true);
  assert.equal(tabs.some((tab) => tab.group === 'management'), false);
});

test('settings center should expose management tabs for admin users', () => {
  const tabs = getSettingsCenterTabs({
    chartsEnabled: true,
    knowledgeBaseEnabled: true,
    mcpServiceEnabled: true,
    personalizationEnabled: true,
    helpEnabled: true,
    isAdmin: true,
  });

  assert.equal(tabs.some((tab) => tab.id === 'admin-announcements'), true);
  assert.equal(tabs.some((tab) => tab.id === 'admin-features'), true);
  assert.equal(tabs.some((tab) => tab.id === 'admin-ai-services'), true);
  assert.equal(tabs.some((tab) => tab.id === 'admin-mcp'), true);
});

test('settings center should return disabled placeholders for gated tabs', () => {
  const disabledFlags = {
    chartsEnabled: false,
    knowledgeBaseEnabled: false,
    mcpServiceEnabled: false,
    personalizationEnabled: false,
    helpEnabled: false,
    isAdmin: false,
  };

  const enabledFlags = {
    chartsEnabled: true,
    knowledgeBaseEnabled: true,
    mcpServiceEnabled: true,
    personalizationEnabled: true,
    helpEnabled: true,
    isAdmin: false,
  };

  assert.deepEqual(getSettingsCenterDisabledState('charts', disabledFlags), {
    title: '暂未开放',
    description: '当前命盘不可用。',
  });
  assert.deepEqual(getSettingsCenterDisabledState('personalization', disabledFlags), {
    title: '暂未开放',
    description: '当前个性化不可用。',
  });
  assert.deepEqual(getSettingsCenterDisabledState('mcp-service', disabledFlags), {
    title: '暂未开放',
    description: '当前 MCP OAuth 不可用。',
  });
  assert.equal(getSettingsCenterDisabledState('charts', enabledFlags), null);
  assert.equal(getSettingsCenterDisabledState('personalization', enabledFlags), null);
  assert.equal(getSettingsCenterDisabledState('mcp-service', enabledFlags), null);
});
