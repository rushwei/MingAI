import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';

process.env.SUPABASE_URL = 'http://localhost';
process.env.SUPABASE_ANON_KEY = 'test-anon';

test('user settings route should return normalized settings bundle for the current user', async (t) => {
  const apiUtilsModule = require('../lib/api-utils') as typeof import('../lib/api-utils');
  type RequireUserContextResult = Awaited<ReturnType<typeof apiUtilsModule.requireUserContext>>;
  const originalRequireUserContext = apiUtilsModule.requireUserContext;

  apiUtilsModule.requireUserContext = async () => ({
    user: { id: 'user-1' } as Awaited<ReturnType<typeof import('../lib/api-utils').getAuthContext>>['user'],
    supabase: {
      from(table: string) {
        assert.equal(table, 'user_settings');
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  expression_style: 'gentle',
                  custom_instructions: 'keep calm',
                  user_profile: { career: 'engineer' },
                  prompt_kb_ids: ['kb-2', 'kb-1'],
                  sidebar_config: { hiddenNavItems: ['qimen'] },
                },
                error: null,
              }),
            }),
          }),
        };
      },
    } as never,
  } as unknown as RequireUserContextResult);

  t.after(() => {
    apiUtilsModule.requireUserContext = originalRequireUserContext;
  });

  const { GET } = await import('../app/api/user/settings/route');
  const response = await GET(new NextRequest('http://localhost/api/user/settings'));
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.settings.expressionStyle, 'gentle');
  assert.deepEqual(payload.settings.promptKbIds, ['kb-2', 'kb-1']);
  assert.deepEqual(payload.settings.sidebarConfig.hiddenNavItems, ['qimen']);
});
