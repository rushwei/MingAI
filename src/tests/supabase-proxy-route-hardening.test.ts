import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const proxyRoutePath = resolve(process.cwd(), 'src/app/api/supabase/proxy/route.ts');
const storageRoutePath = resolve(process.cwd(), 'src/app/api/supabase/storage/route.ts');

test('supabase proxy route should enforce internal client marker and block MCP verify RPC', async () => {
  const source = await readFile(proxyRoutePath, 'utf-8');

  assert.ok(
    source.includes('x-mingai-proxy-client'),
    'proxy route should validate internal proxy client header'
  );
  assert.ok(
    source.includes('if (!origin || !host)') || source.includes('Missing origin/host'),
    'proxy route should fail closed when origin/host evidence is missing'
  );
  assert.ok(
    source.includes('new URL(origin).host !== host'),
    'proxy route should enforce same-origin host matching'
  );
  assert.ok(
    source.includes('mcp_verify_api_key') && source.includes('mcp_touch_key_last_used'),
    'proxy route should block direct MCP key verification/touch RPC exposure'
  );
});

test('supabase proxy route should require user context for write-like operations', async () => {
  const source = await readFile(proxyRoutePath, 'utf-8');

  assert.ok(
    source.includes('WRITE_QUERY_METHODS'),
    'proxy route should distinguish write query methods'
  );
  assert.ok(
    source.includes('queryNeedsAuth(payload.chain)') && source.includes('requireUserContext(request)'),
    'proxy route should gate write operations with user auth context'
  );
});

test('supabase storage route should require user auth for uploads and return publicUrl', async () => {
  const source = await readFile(storageRoutePath, 'utf-8');

  assert.ok(
    source.includes('const auth = await requireUserContext(request);'),
    'storage upload should require authenticated user context'
  );
  assert.ok(
    source.includes("const ALLOWED_BUCKETS = new Set(['avatars'])"),
    'storage route should keep upload bucket allowlist'
  );
  assert.ok(
    source.includes('publicUrl: publicData.publicUrl'),
    'storage upload response should include publicUrl'
  );
});
