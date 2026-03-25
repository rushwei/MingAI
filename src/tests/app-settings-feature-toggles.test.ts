import { test } from 'node:test';
import assert from 'node:assert/strict';

test('getFeatureToggles reads feature toggles via like filter', async (t) => {
  const apiUtilsModule = require('../lib/api-utils') as typeof import('../lib/api-utils');
  const originalGetSystemAdminClient = apiUtilsModule.getSystemAdminClient;
  const originalConsoleError = console.error;
  const errorLogs: unknown[][] = [];

  apiUtilsModule.getSystemAdminClient = (() => ({
    from(table: string) {
      assert.equal(table, 'app_settings');
      return {
        select() {
          return {
            like(column: string, pattern: string) {
              assert.equal(column, 'setting_key');
              assert.equal(pattern, 'feature_disabled:%');
              return Promise.resolve({
                data: [
                  { setting_key: 'feature_disabled:chat', setting_value: true },
                  { setting_key: 'feature_disabled:knowledge-base', setting_value: false },
                ],
                error: null,
              });
            },
          };
        },
      };
    },
  })) as unknown as typeof apiUtilsModule.getSystemAdminClient;

  console.error = (...args: unknown[]) => {
    errorLogs.push(args);
  };

  t.after(() => {
    apiUtilsModule.getSystemAdminClient = originalGetSystemAdminClient;
    console.error = originalConsoleError;
  });

  const appSettingsModule = await import('../lib/app-settings');
  const toggles = await appSettingsModule.getFeatureToggles();

  assert.equal(toggles.chat, true);
  assert.equal(toggles['knowledge-base'], false);
  assert.equal(errorLogs.length, 0);
});
