import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const cachePath = resolve(process.cwd(), 'src/lib/cache.ts');
const authPath = resolve(process.cwd(), 'src/lib/auth.ts');
const providersPath = resolve(process.cwd(), 'src/components/providers/ClientProviders.tsx');
const userPagePath = resolve(process.cwd(), 'src/app/user/page.tsx');
const modelSelectorPath = resolve(process.cwd(), 'src/components/ui/ModelSelector.tsx');

test('cache module should expose scoped local cache invalidation helper', async () => {
  const source = await readFile(cachePath, 'utf-8');

  assert.ok(
    source.includes('export function invalidateLocalCaches(scopes: LocalCacheScope[])'),
    'cache module should provide scoped local cache invalidation helper'
  );
  assert.ok(
    source.includes("type LocalCacheScope")
      && source.includes('mingai.profile.')
      && source.includes('mingai.models.'),
    'scoped invalidation should cover profile/model namespaces'
  );
  assert.ok(
    source.includes('defaultBaziChartId'),
    'default_bazi_chart scope should clear both current and legacy default chart keys'
  );
});

test('browser auth module should not expose generic query helpers after convergence', async () => {
  const source = await readFile(authPath, 'utf-8');

  assert.ok(
    !source.includes('createQueryProxy(') && !source.includes('/api/supabase/proxy'),
    'browser auth module should not keep the old query proxy implementation'
  );
  assert.ok(
    source.includes('export const supabase = {'),
    'browser auth module should still expose the auth-compatible client shape'
  );
});

test('client providers should broadcast invalidation events for successful non-GET api writes', async () => {
  const source = await readFile(providersPath, 'utf-8');

  assert.ok(
    source.includes("window.fetch = patchedFetch"),
    'client providers should install global fetch patch for write consistency'
  );
  assert.ok(
    source.includes("new CustomEvent('mingai:api-write'"),
    'client providers should emit api-write events on successful writes'
  );
  assert.ok(
    source.includes('resolveCacheScopesByPath(pathname)') && source.includes('invalidateLocalCaches(cacheScopes);'),
    'client providers should invalidate only mapped cache scopes per api path'
  );
  assert.ok(
    source.includes("pathname.startsWith('/api/credits')"),
    'client providers should include credits write routes in scoped cache invalidation mapping'
  );
  assert.ok(
    source.includes("new CustomEvent('mingai:data-index:invalidate'"),
    'client providers should trigger data-index invalidation on domain writes'
  );
  assert.ok(
    source.includes("pathname.startsWith('/api/credits')")
      && source.includes("new CustomEvent('mingai:user-data:invalidate'"),
    'client providers should refresh user-data consumers after credits writes'
  );
});

test('user page and model selector should listen for invalidation events', async () => {
  const [userPage, modelSelector] = await Promise.all([
    readFile(userPagePath, 'utf-8'),
    readFile(modelSelectorPath, 'utf-8'),
  ]);

  assert.ok(
    userPage.includes("window.addEventListener('mingai:user-data:invalidate'"),
    'user page should refresh after user-data invalidation'
  );
  assert.ok(
    modelSelector.includes("window.addEventListener('mingai:models:invalidate'"),
    'model selector should refresh after model invalidation'
  );
});
