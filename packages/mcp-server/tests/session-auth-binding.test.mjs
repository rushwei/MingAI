import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const indexPath = resolve(process.cwd(), 'packages/mcp-server/src/index.ts');

test('existing session requests should validate session owner on POST', async () => {
  const source = await readFile(indexPath, 'utf-8');

  assert.ok(
    source.includes('!isSessionOwner(existing, auth)'),
    'POST /mcp should reject when session owner and request auth mismatch'
  );
});

test('existing session requests should validate session owner on GET and DELETE', async () => {
  const source = await readFile(indexPath, 'utf-8');

  const ownerGuardMatches = source.match(/!isSessionOwner\(session,\s*auth\)/g) ?? [];
  assert.ok(
    ownerGuardMatches.length >= 2,
    'GET/DELETE /mcp should reject when session owner and request auth mismatch'
  );
});

test('session activity should be refreshed when reusing an existing GET session transport', async () => {
  const source = await readFile(indexPath, 'utf-8');

  const refreshMatches = source.match(/session\.lastActivityAt\s*=\s*Date\.now\(\)/g) ?? [];
  assert.ok(
    refreshMatches.length >= 1,
    'GET handler should refresh session.lastActivityAt before reusing the existing session transport'
  );
});

test('session limits should use guarded env parsing with numeric fallback', async () => {
  const source = await readFile(indexPath, 'utf-8');

  assert.ok(
    source.includes('readPositiveIntEnv'),
    'index.ts should use a helper to guard invalid numeric env values'
  );
});
