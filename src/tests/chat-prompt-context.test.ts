import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-anon';

test('buildChatPromptContext should load visualization_settings from user_settings', async (t) => {
  const apiUtilsModule = require('../lib/api-utils') as typeof import('../lib/api-utils');
  const promptBuilderModule = require('../lib/ai/prompt-builder') as typeof import('../lib/ai/prompt-builder');
  const appSettingsModule = require('../lib/app-settings') as typeof import('../lib/app-settings');

  const originalGetSystemAdminClient = apiUtilsModule.getSystemAdminClient;
  const originalBuildPromptWithSources = promptBuilderModule.buildPromptWithSources;
  const originalGetPromptBudget = promptBuilderModule.getPromptBudget;
  const originalFeatureEnabled = appSettingsModule.isFeatureModuleEnabled;

  let selectedColumns = '';
  let capturedVisualizationSettings: unknown = null;

  apiUtilsModule.getSystemAdminClient = (() => ({
    from(table: string) {
      if (table === 'user_settings') {
        return {
          select(columns: string) {
            selectedColumns = columns;
            return {
              eq() {
                return {
                  maybeSingle: async () => ({
                    data: {
                      expression_style: 'direct',
                      user_profile: {},
                      custom_instructions: '',
                      prompt_kb_ids: [],
                      visualization_settings: columns.includes('visualization_settings')
                        ? {
                          selectedDimensions: ['career', 'wealth'],
                          dayunDisplayCount: 6,
                          chartStyle: 'classic-chinese',
                        }
                        : undefined,
                    },
                    error: null,
                  }),
                };
              },
            };
          },
        };
      }

      if (table === 'knowledge_bases') {
        return {
          select() {
            return {
              eq() {
                return {
                  in: async () => ({ data: [], error: null }),
                };
              },
            };
          },
        };
      }

      return {
        select() {
          return {
            eq() {
              return {
                maybeSingle: async () => ({ data: null, error: null }),
              };
            },
          };
        },
      };
    },
  })) as unknown as typeof apiUtilsModule.getSystemAdminClient;

  promptBuilderModule.getPromptBudget = (async () => 1024) as typeof promptBuilderModule.getPromptBudget;
  promptBuilderModule.buildPromptWithSources = (async (context) => {
    capturedVisualizationSettings = context.userSettings?.visualizationSettings;
    return {
      systemPrompt: '',
      userMessagePrefix: '',
      userMessageTokens: 0,
      sources: [],
      diagnostics: [],
      totalTokens: 0,
      budgetTotal: 0,
    };
  }) as typeof promptBuilderModule.buildPromptWithSources;
  appSettingsModule.isFeatureModuleEnabled = (async () => false) as typeof appSettingsModule.isFeatureModuleEnabled;

  t.after(() => {
    apiUtilsModule.getSystemAdminClient = originalGetSystemAdminClient;
    promptBuilderModule.buildPromptWithSources = originalBuildPromptWithSources;
    promptBuilderModule.getPromptBudget = originalGetPromptBudget;
    appSettingsModule.isFeatureModuleEnabled = originalFeatureEnabled;
  });

  const { buildChatPromptContext } = await import('../lib/server/chat/prompt-context');
  await buildChatPromptContext({
    body: {
      messages: [
        {
          id: 'm1',
          role: 'user',
          content: '请分析',
          createdAt: new Date().toISOString(),
        },
      ],
      stream: false,
    },
    userId: 'user-1',
    canSkipCredit: false,
    accessTokenForKB: null,
    requestedModelId: 'deepseek-chat',
    membershipType: 'free',
    reasoningEnabled: false,
    creditDeducted: false,
  });

  assert.match(selectedColumns, /visualization_settings/u);
  assert.deepEqual(capturedVisualizationSettings, {
    selectedDimensions: ['career', 'wealth'],
    dayunDisplayCount: 6,
    chartStyle: 'classic-chinese',
  });
});
