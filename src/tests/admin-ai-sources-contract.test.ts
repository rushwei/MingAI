import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';

process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-anon';

test('admin ai source creation should reject legacy source keys', async (t) => {
  const apiUtilsModule = require('../lib/api-utils') as any;
  const originalRequireAdminUser = apiUtilsModule.requireAdminUser;

  apiUtilsModule.requireAdminUser = async () => ({ user: { id: 'admin-1' } });

  t.after(() => {
    apiUtilsModule.requireAdminUser = originalRequireAdminUser;
  });

  const { POST } = await import('../app/api/admin/ai-models/[id]/sources/route');
  const request = new NextRequest('http://localhost/api/admin/ai-models/model-1/sources', {
    method: 'POST',
    body: JSON.stringify({
      sourceKey: 'siliconflow',
      sourceName: 'Legacy',
      apiUrl: 'https://legacy.example/v1/chat/completions',
      apiKeyEnvVar: 'LEGACY_API_KEY',
    }),
    headers: { 'Content-Type': 'application/json' },
  });

  const response = await POST(request, { params: Promise.resolve({ id: 'model-1' }) });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error, '仅支持 NewAPI 和 Octopus 来源');
});
