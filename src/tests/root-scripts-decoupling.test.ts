import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

test('root web scripts should not hard-block on mcp-core build', async () => {
  const raw = await readFile(resolve(process.cwd(), 'package.json'), 'utf-8');
  const pkg = JSON.parse(raw) as { scripts?: Record<string, string> };

  assert.equal(pkg.scripts?.dev?.includes('packages/mcp-core build'), false);
  assert.equal(pkg.scripts?.build?.includes('packages/mcp-core build'), false);
});
