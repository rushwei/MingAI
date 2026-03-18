import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';

process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-anon';

test('admin ai models POST should create a primary gateway binding for the selected routing mode', async (t) => {
  const apiUtilsModule = require('../lib/api-utils') as any;
  const serverConfigModule = require('../lib/server/ai-config') as any;
  const originalRequireAdminUser = apiUtilsModule.requireAdminUser;
  const originalGetSystemAdminClient = apiUtilsModule.getSystemAdminClient;
  const originalClearModelCache = serverConfigModule.clearModelCache;

  let bindingInsertPayload: Record<string, unknown> | null = null;
  let cacheCleared = false;

  apiUtilsModule.requireAdminUser = async () => ({ user: { id: 'admin-1' } });
  apiUtilsModule.getSystemAdminClient = () => ({
    from: (table: string) => {
      if (table === 'ai_models') {
        return {
          insert: () => ({
            select: () => ({
              single: async () => ({
                data: { id: 'model-1', model_key: 'gpt-5.4' },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'ai_gateways') {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: { id: 'gateway-1' },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'ai_model_gateway_bindings') {
        return {
          insert: (payload: Record<string, unknown>) => {
            bindingInsertPayload = payload;
            return {
              select: () => ({
                single: async () => ({
                  data: { id: 'binding-1' },
                  error: null,
                }),
              }),
            };
          },
        };
      }
      throw new Error(`Unexpected table ${table}`);
    },
  });
  serverConfigModule.clearModelCache = () => {
    cacheCleared = true;
  };

  t.after(() => {
    apiUtilsModule.requireAdminUser = originalRequireAdminUser;
    apiUtilsModule.getSystemAdminClient = originalGetSystemAdminClient;
    serverConfigModule.clearModelCache = originalClearModelCache;
  });

  const { POST } = await import('../app/api/admin/ai-models/route');
  const request = new NextRequest('http://localhost/api/admin/ai-models', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      modelKey: 'gpt-5.4',
      displayName: 'ChatGPT 5.4',
      vendor: 'openai',
      routingMode: 'newapi',
    }),
  });

  const response = await POST(request);
  assert.equal(response.status, 201);
  assert.deepEqual(bindingInsertPayload, {
    model_id: 'model-1',
    gateway_id: 'gateway-1',
    model_id_override: 'gpt-5.4',
    reasoning_model_id: null,
    is_enabled: true,
    priority: 0,
    notes: 'Auto-created primary binding',
  });
  assert.equal(cacheCleared, true);
});

test('admin ai models POST should rollback created model when primary gateway binding fails', async (t) => {
  const apiUtilsModule = require('../lib/api-utils') as any;
  const serverConfigModule = require('../lib/server/ai-config') as any;
  const originalRequireAdminUser = apiUtilsModule.requireAdminUser;
  const originalGetSystemAdminClient = apiUtilsModule.getSystemAdminClient;
  const originalClearModelCache = serverConfigModule.clearModelCache;

  let deletedModelId: string | null = null;
  let cacheCleared = false;

  apiUtilsModule.requireAdminUser = async () => ({ user: { id: 'admin-1' } });
  apiUtilsModule.getSystemAdminClient = () => ({
    from: (table: string) => {
      if (table === 'ai_models') {
        return {
          insert: () => ({
            select: () => ({
              single: async () => ({
                data: { id: 'model-rollback-1', model_key: 'gpt-5.4' },
                error: null,
              }),
            }),
          }),
          delete: () => ({
            eq: async (column: string, value: string) => {
              if (column === 'id') {
                deletedModelId = value;
              }
              return { error: null };
            },
          }),
        };
      }
      if (table === 'ai_gateways') {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: { id: 'gateway-1' },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'ai_model_gateway_bindings') {
        return {
          insert: () => ({
            select: () => ({
              single: async () => ({
                data: null,
                error: { code: '23505', message: 'duplicate binding' },
              }),
            }),
          }),
        };
      }
      throw new Error(`Unexpected table ${table}`);
    },
  });
  serverConfigModule.clearModelCache = () => {
    cacheCleared = true;
  };

  t.after(() => {
    apiUtilsModule.requireAdminUser = originalRequireAdminUser;
    apiUtilsModule.getSystemAdminClient = originalGetSystemAdminClient;
    serverConfigModule.clearModelCache = originalClearModelCache;
  });

  const { POST } = await import('../app/api/admin/ai-models/route');
  const request = new NextRequest('http://localhost/api/admin/ai-models', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      modelKey: 'gpt-5.4',
      displayName: 'ChatGPT 5.4',
      vendor: 'openai',
      routingMode: 'newapi',
    }),
  });

  const response = await POST(request);
  const payload = await response.json();

  assert.equal(response.status, 500);
  assert.equal(payload.error, '创建模型失败');
  assert.equal(deletedModelId, 'model-rollback-1');
  assert.equal(cacheCleared, false);
});
