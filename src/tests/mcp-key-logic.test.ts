import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service';

test('generateMcpKeyCode uses sk-mcp-mingai- prefix', async () => {
  const { generateMcpKeyCode } = await import('../lib/mcp-keys');
  const key = generateMcpKeyCode();

  assert.ok(key.startsWith('sk-mcp-mingai-'));
  assert.equal(key.length, 'sk-mcp-mingai-'.length + 24);
});

test('resetMcpKey should not update reset_count field', async (t) => {
  const apiUtils = require('../lib/api-utils') as any;
  const originalGetServiceRoleClient = apiUtils.getServiceRoleClient;

  let updatePayload: Record<string, unknown> | null = null;

  const keyRow = {
    id: 'key-1',
    user_id: 'user-1',
    key_code: 'old-key',
    is_active: true,
    created_at: new Date().toISOString(),
    last_used_at: null,
    reset_count: 5,
  };

  const serviceClient = {
    from: (table: string) => {
      if (table !== 'mcp_api_keys') {
        throw new Error(`Unexpected table: ${table}`);
      }

      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: keyRow, error: null }),
          }),
        }),
        update: (payload: Record<string, unknown>) => {
          updatePayload = payload;
          return {
            eq: () => ({
              select: () => ({
                single: async () => ({ data: { ...keyRow, ...payload }, error: null }),
              }),
            }),
          };
        },
      };
    },
  };

  apiUtils.getServiceRoleClient = () => serviceClient;

  t.after(() => {
    apiUtils.getServiceRoleClient = originalGetServiceRoleClient;
  });

  const { resetMcpKey } = await import('../lib/mcp-keys');
  const result = await resetMcpKey('user-1');

  assert.equal(result.success, true);
  assert.ok(updatePayload, 'resetMcpKey should execute update');
  assert.equal(Object.prototype.hasOwnProperty.call(updatePayload!, 'reset_count'), false);
});

test('resetMcpKey should reject permanently revoked keys', async (t) => {
  const apiUtils = require('../lib/api-utils') as any;
  const originalGetServiceRoleClient = apiUtils.getServiceRoleClient;

  let updateCalled = false;

  const keyRow = {
    id: 'key-1',
    user_id: 'user-1',
    key_code: 'old-key',
    is_active: false,
    created_at: new Date().toISOString(),
    last_used_at: null,
  };

  const serviceClient = {
    from: (table: string) => {
      if (table !== 'mcp_api_keys') {
        throw new Error(`Unexpected table: ${table}`);
      }

      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: keyRow, error: null }),
          }),
        }),
        update: () => {
          updateCalled = true;
          return {
            eq: () => ({
              select: () => ({
                single: async () => ({ data: keyRow, error: null }),
              }),
            }),
          };
        },
      };
    },
  };

  apiUtils.getServiceRoleClient = () => serviceClient;

  t.after(() => {
    apiUtils.getServiceRoleClient = originalGetServiceRoleClient;
  });

  const { resetMcpKey } = await import('../lib/mcp-keys');
  const result = await resetMcpKey('user-1');

  assert.equal(result.success, false);
  assert.match(result.error || '', /封禁/);
  assert.equal(updateCalled, false, 'revoked key must not be reset back to active');
});

test('getAllMcpKeys should read nickname from users and email from auth admin API', async (t) => {
  const apiUtils = require('../lib/api-utils') as any;
  const originalGetServiceRoleClient = apiUtils.getServiceRoleClient;

  let usersSelectColumns = '';

  const serviceClient = {
    from: (table: string) => {
      if (table === 'mcp_api_keys') {
        return {
          select: () => ({
            order: () => Promise.resolve({
              data: [{
                id: 'key-1',
                user_id: 'user-1',
                key_code: 'sk-mcp-mingai-abcdef1234567890abcdef12',
                is_active: true,
                created_at: '2026-02-11T00:00:00.000Z',
                last_used_at: null,
              }],
              error: null,
            }),
          }),
        };
      }

      if (table === 'users') {
        return {
          select: (columns: string) => {
            usersSelectColumns = columns;
            return {
              in: () => Promise.resolve({
                data: [{ id: 'user-1', nickname: '测试用户' }],
                error: null,
              }),
            };
          },
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
    auth: {
      admin: {
        getUserById: async (userId: string) => {
          assert.equal(userId, 'user-1');
          return {
            data: { user: { id: 'user-1', email: 'user1@example.com' } },
            error: null,
          };
        },
      },
    },
  };

  apiUtils.getServiceRoleClient = () => serviceClient;

  t.after(() => {
    apiUtils.getServiceRoleClient = originalGetServiceRoleClient;
  });

  const { getAllMcpKeys } = await import('../lib/mcp-keys');
  const result = await getAllMcpKeys();

  assert.equal(usersSelectColumns, 'id, nickname');
  assert.equal(result.length, 1);
  assert.equal(result[0].user_nickname, '测试用户');
  assert.equal(result[0].user_email, 'user1@example.com');
});
