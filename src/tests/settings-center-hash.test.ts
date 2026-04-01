import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSettingsCenterHash,
  getSettingsCenterCloseMode,
  getSettingsCenterLegacyPath,
  getSettingsCenterRouteTarget,
  parseSettingsCenterHash,
  parseSettingsCenterHashSubpath,
} from '../lib/settings-center';

test('settings center hash helpers build and parse supported tabs', () => {
  assert.equal(buildSettingsCenterHash('general'), '#settings/general');
  assert.equal(buildSettingsCenterHash('personalization'), '#settings/personalization');
  assert.equal(buildSettingsCenterHash('profile'), '#settings/profile');
  assert.equal(buildSettingsCenterHash('help'), '#settings/help');
  assert.equal(buildSettingsCenterHash('admin-features', { subpath: 'pause' }), '#settings/admin-features/pause');
  assert.equal(parseSettingsCenterHash('#settings/charts'), 'charts');
  assert.equal(parseSettingsCenterHash('#settings/knowledge-base'), 'knowledge-base');
  assert.equal(parseSettingsCenterHash('#settings/mcp-service'), 'mcp-service');
  assert.equal(parseSettingsCenterHash('#settings/admin-features'), 'admin-features');
  assert.equal(parseSettingsCenterHash('#settings/admin-features/pause'), 'admin-features');
  assert.equal(parseSettingsCenterHashSubpath('#settings/admin-features/pause'), 'pause');
});

test('settings center hash parser falls back invalid tabs to general within settings namespace', () => {
  assert.equal(parseSettingsCenterHash('#settings/unknown'), 'general');
  assert.equal(parseSettingsCenterHash('#elsewhere/general'), null);
  assert.equal(parseSettingsCenterHash(''), null);
  assert.equal(parseSettingsCenterHashSubpath('#settings/unknown/pause'), null);
});

test('settings center legacy paths stay stable for launch routes', () => {
  assert.equal(getSettingsCenterLegacyPath('profile'), '/user/profile');
  assert.equal(getSettingsCenterLegacyPath('general'), '/user/settings');
  assert.equal(getSettingsCenterLegacyPath('personalization'), '/user/settings/ai');
  assert.equal(getSettingsCenterLegacyPath('help'), '/help');
  assert.equal(getSettingsCenterLegacyPath('charts'), '/user/charts');
  assert.equal(getSettingsCenterLegacyPath('knowledge-base'), '/user/knowledge-base');
  assert.equal(getSettingsCenterLegacyPath('mcp-service'), '/user/mcp');
  assert.equal(getSettingsCenterLegacyPath('admin-announcements'), '/admin/announcements');
  assert.equal(getSettingsCenterLegacyPath('admin-features'), '/admin/features');
  assert.equal(getSettingsCenterLegacyPath('admin-ai-services'), '/admin/ai-services');
  assert.equal(getSettingsCenterLegacyPath('admin-mcp'), '/admin/mcp');
  assert.equal(getSettingsCenterRouteTarget('admin-features', { subpath: 'pause' }), '/bazi#settings/admin-features/pause');
});

test('settings center close mode distinguishes pushed state from hash-only route state', () => {
  assert.equal(getSettingsCenterCloseMode({ __mingaiSettingsCenter: true }), 'back');
  assert.equal(getSettingsCenterCloseMode({}), 'replace');
  assert.equal(getSettingsCenterCloseMode(null), 'replace');
});
