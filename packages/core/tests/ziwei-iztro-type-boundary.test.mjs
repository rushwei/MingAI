import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const handlerPaths = [
  resolve(process.cwd(), 'packages/core/src/handlers/ziwei-shared.ts'),
  resolve(process.cwd(), 'packages/core/src/handlers/ziwei.ts'),
  resolve(process.cwd(), 'packages/core/src/handlers/ziwei-horoscope.ts'),
  resolve(process.cwd(), 'packages/core/src/handlers/ziwei-flying-star.ts'),
];

test('ziwei handlers should not import named types from iztro root exports', async () => {
  const entries = await Promise.all(
    handlerPaths.map(async (path) => ({
      path,
      source: await readFile(path, 'utf-8'),
    })),
  );

  for (const entry of entries) {
    assert.doesNotMatch(
      entry.source,
      /import\s+type\s*\{[^}]+\}\s*from\s*'iztro'/u,
      `${entry.path} should derive iztro-related types locally instead of depending on root type exports`,
    );
    assert.doesNotMatch(
      entry.source,
      /import\s*\{[^}]*type\s+[A-Za-z0-9_]+[^}]*\}\s*from\s*'iztro'/u,
      `${entry.path} should not mix runtime imports with root named type imports from iztro`,
    );
  }
});
