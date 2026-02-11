import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const indexPath = resolve(process.cwd(), 'packages/mcp-server/src/index.ts');

test('session context should include auth and timing fields', async () => {
  const source = await readFile(indexPath, 'utf-8');

  assert.ok(
    source.includes('auth: McpAuthInfo'),
    'SessionContext should include auth field'
  );
  assert.ok(
    source.includes('createdAt: number'),
    'SessionContext should include createdAt'
  );
  assert.ok(
    source.includes('lastActivityAt: number'),
    'SessionContext should include lastActivityAt'
  );
});

test('session should have configurable max limit', async () => {
  const source = await readFile(indexPath, 'utf-8');

  assert.ok(
    source.includes('MAX_TOTAL_SESSIONS'),
    'should define MAX_TOTAL_SESSIONS'
  );
  assert.ok(
    source.includes('MCP_MAX_SESSIONS'),
    'should read from MCP_MAX_SESSIONS env var'
  );
  assert.ok(
    source.includes('503'),
    'should return 503 when at capacity'
  );
});

test('session should have TTL and idle timeout', async () => {
  const source = await readFile(indexPath, 'utf-8');

  assert.ok(
    source.includes('SESSION_TTL'),
    'should define SESSION_TTL'
  );
  assert.ok(
    source.includes('SESSION_IDLE'),
    'should define SESSION_IDLE'
  );
  assert.ok(
    source.includes('MCP_SESSION_TTL_MS'),
    'should read TTL from env'
  );
  assert.ok(
    source.includes('MCP_SESSION_IDLE_MS'),
    'should read idle timeout from env'
  );
});

test('session cleanup should run periodically', async () => {
  const source = await readFile(indexPath, 'utf-8');

  assert.ok(
    source.includes('setInterval'),
    'should have periodic cleanup interval'
  );
  assert.ok(
    source.includes('cleanupSession'),
    'should call cleanupSession for expired sessions'
  );
});

test('session should update lastActivityAt on requests', async () => {
  const source = await readFile(indexPath, 'utf-8');

  assert.ok(
    source.includes('lastActivityAt = Date.now()'),
    'should update lastActivityAt on existing session requests'
  );
});

test('createMcpServer should not depend on auth/request metadata', async () => {
  const source = await readFile(indexPath, 'utf-8');

  assert.ok(
    source.includes('function createMcpServer()'),
    'createMcpServer should not require auth/request metadata'
  );
});

test('server should use configurable bind address', async () => {
  const source = await readFile(indexPath, 'utf-8');

  assert.ok(
    source.includes('MCP_HOST'),
    'should read MCP_HOST env var'
  );
  assert.ok(
    source.includes("'127.0.0.1'"),
    'should default to 127.0.0.1'
  );
});

test('tool calls should not write audit logs anymore', async () => {
  const source = await readFile(indexPath, 'utf-8');

  assert.ok(
    !source.includes('writeAuditLog'),
    'tool call handler should not depend on writeAuditLog'
  );
});

test('errors should be sanitized in production', async () => {
  const source = await readFile(indexPath, 'utf-8');

  assert.ok(
    source.includes('IS_PRODUCTION'),
    'should check IS_PRODUCTION flag'
  );
  assert.ok(
    source.includes('Tool execution failed'),
    'should return generic error in production'
  );
});

test('middleware chain should include all security layers', async () => {
  const source = await readFile(indexPath, 'utf-8');

  assert.ok(
    source.includes('originValidationMiddleware'),
    'should use originValidationMiddleware'
  );
  assert.ok(
    source.includes('authMiddleware'),
    'should use authMiddleware'
  );
  assert.ok(
    source.includes('hostValidationMiddleware'),
    'should use hostValidationMiddleware'
  );
  assert.ok(
    source.includes('rateLimitMiddleware'),
    'should use rateLimitMiddleware'
  );
  assert.ok(
    source.includes('sseConnectionLimitMiddleware'),
    'should use sseConnectionLimitMiddleware'
  );
});

test('express should have body size limit', async () => {
  const source = await readFile(indexPath, 'utf-8');

  assert.ok(
    source.includes("limit: '1mb'"),
    'should limit request body to 1mb'
  );
});
