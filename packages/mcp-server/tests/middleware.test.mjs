import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const middlewarePath = resolve(process.cwd(), 'packages/mcp-server/src/middleware.ts');

// ─── 源码结构验证 ───

test('middleware should export all required middleware functions', async () => {
  const source = await readFile(middlewarePath, 'utf-8');

  assert.ok(
    source.includes('export async function authMiddleware'),
    'should export authMiddleware'
  );
  assert.ok(
    source.includes('export function rateLimitMiddleware'),
    'should export rateLimitMiddleware'
  );
  assert.ok(
    source.includes('export function originValidationMiddleware'),
    'should export originValidationMiddleware'
  );
  assert.ok(
    source.includes('export function sseConnectionLimitMiddleware'),
    'should export sseConnectionLimitMiddleware'
  );
});

test('authMiddleware should not accept query string API key', async () => {
  const source = await readFile(middlewarePath, 'utf-8');

  assert.ok(
    !source.includes('req.query.api_key'),
    'should not read api_key from query string'
  );
  assert.ok(
    !source.includes('queryKey'),
    'should not have queryKey variable'
  );
});

test('authMiddleware should not use static MCP_API_KEY', async () => {
  const source = await readFile(middlewarePath, 'utf-8');

  assert.ok(
    !source.includes('MCP_API_KEY'),
    'should not reference MCP_API_KEY env var'
  );
});

test('authMiddleware should support x-api-key and Bearer token', async () => {
  const source = await readFile(middlewarePath, 'utf-8');

  assert.ok(
    source.includes("req.headers['x-api-key']"),
    'should read x-api-key header'
  );
  assert.ok(
    source.includes('Bearer '),
    'should support Bearer token'
  );
});

test('authMiddleware should validate key via RPC functions', async () => {
  const source = await readFile(middlewarePath, 'utf-8');

  assert.ok(
    source.includes('mcp_verify_api_key'),
    'should call mcp_verify_api_key RPC instead of direct table query'
  );
  assert.ok(
    source.includes('mcp_touch_key_last_used'),
    'should call mcp_touch_key_last_used RPC for last_used_at update'
  );
});

test('authMiddleware should use key cache', async () => {
  const source = await readFile(middlewarePath, 'utf-8');

  assert.ok(
    source.includes('getCachedKey'),
    'should check cache before DB'
  );
  assert.ok(
    source.includes('setCachedKey'),
    'should cache validated keys'
  );
  assert.ok(
    source.includes('invalidateCachedKey'),
    'should invalidate cache entry when cached key revalidation fails'
  );
  assert.ok(
    source.includes('activeKey = await queryActiveKey(apiKey)'),
    'should revalidate cached key against DB to enforce revoke/reset immediately'
  );
});

test('authMiddleware should attach mcpAuth to request', async () => {
  const source = await readFile(middlewarePath, 'utf-8');

  assert.ok(
    source.includes('req.mcpAuth'),
    'should set req.mcpAuth with userId and keyId'
  );
});

test('originValidationMiddleware should check MCP_ALLOWED_ORIGINS', async () => {
  const source = await readFile(middlewarePath, 'utf-8');

  assert.ok(
    source.includes('MCP_ALLOWED_ORIGINS'),
    'should read MCP_ALLOWED_ORIGINS env var'
  );
  assert.ok(
    source.includes('req.headers.origin'),
    'should check Origin header'
  );
  assert.ok(
    source.includes('403'),
    'should return 403 for disallowed origins'
  );
});

test('originValidationMiddleware should pass through requests without Origin', async () => {
  const source = await readFile(middlewarePath, 'utf-8');

  assert.ok(
    source.includes("if (!origin) return next()"),
    'should call next() when no Origin header'
  );
});

test('originValidationMiddleware should fail closed when Origin exists but allowlist is missing', async () => {
  const source = await readFile(middlewarePath, 'utf-8');

  assert.ok(
    source.includes('if (!allowedRaw)') && source.includes('Origin allowlist not configured'),
    'should reject origin request when MCP_ALLOWED_ORIGINS is not configured'
  );
});

test('originValidationMiddleware should support wildcard allowlist', async () => {
  const source = await readFile(middlewarePath, 'utf-8');

  assert.ok(
    source.includes("allowed.includes('*')"),
    'should allow all origins when MCP_ALLOWED_ORIGINS includes *'
  );
});

test('hostValidationMiddleware should validate host against MCP_ALLOWED_HOSTS', async () => {
  const source = await readFile(middlewarePath, 'utf-8');

  assert.ok(
    source.includes('export function hostValidationMiddleware'),
    'should export hostValidationMiddleware'
  );
  assert.ok(
    source.includes('MCP_ALLOWED_HOSTS'),
    'should read MCP_ALLOWED_HOSTS env var'
  );
  assert.ok(
    source.includes('req.headers.host'),
    'should validate request host header'
  );
});

test('rateLimitMiddleware should use composite key', async () => {
  const source = await readFile(middlewarePath, 'utf-8');

  assert.ok(
    source.includes('userId'),
    'should include userId in rate limit key'
  );
  assert.ok(
    source.includes('compositeKey'),
    'should use composite key for rate limiting'
  );
  assert.ok(
    source.includes('req.path'),
    'should include path dimension in rate limit key'
  );
});

test('rateLimitMiddleware should allow 120 requests per minute', async () => {
  const source = await readFile(middlewarePath, 'utf-8');

  assert.ok(
    source.includes('120'),
    'should have 120 requests/min limit'
  );
  assert.ok(
    source.includes('429'),
    'should return 429 when rate limited'
  );
});

test('sseConnectionLimitMiddleware should limit per-user SSE connections', async () => {
  const source = await readFile(middlewarePath, 'utf-8');

  assert.ok(
    source.includes('MCP_MAX_SSE_PER_USER'),
    'should read MCP_MAX_SSE_PER_USER env var'
  );
  assert.ok(
    source.includes("res.on('close'"),
    'should decrement count on connection close'
  );
});

test('authMiddleware should return 401 for missing key', async () => {
  const source = await readFile(middlewarePath, 'utf-8');

  assert.ok(
    source.includes("'Missing API key'"),
    'should return Missing API key error'
  );
});

test('authMiddleware should return 401 for invalid key', async () => {
  const source = await readFile(middlewarePath, 'utf-8');

  assert.ok(
    source.includes("'Invalid API key'"),
    'should return Invalid API key error'
  );
});
