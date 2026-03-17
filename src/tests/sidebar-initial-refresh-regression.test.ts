import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const clientProvidersPath = resolve(process.cwd(), 'src/components/providers/ClientProviders.tsx');
const featureTogglesPath = resolve(process.cwd(), 'src/lib/hooks/useFeatureToggles.ts');

test('ClientProviders should not broadcast user-data invalidation during auth session bootstrap', async () => {
  const source = await readFile(clientProvidersPath, 'utf-8');

  assert.doesNotMatch(
    source,
    /mingai:user-data:invalidate/u,
    'session bootstrap should not fan out a global user-data invalidation event',
  );
});

test('feature toggle hook should use warm cache to avoid blocking first paint when cache exists', async () => {
  const source = await readFile(featureTogglesPath, 'utf-8');

  assert.match(
    source,
    /readLocalCache/u,
    'feature toggle hook should warm-start from local cache',
  );
  assert.match(
    source,
    /writeLocalCache/u,
    'feature toggle hook should persist refreshed toggles back to local cache',
  );
  assert.doesNotMatch(
    source,
    /const\s+\[isLoading,\s*setIsLoading\]\s*=\s*useState\(true\)/u,
    'feature toggle hook should not force loading=true before checking warm cache',
  );
});
