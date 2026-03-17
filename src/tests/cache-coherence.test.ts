import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const providersPath = resolve(process.cwd(), 'src/components/providers/ClientProviders.tsx');
const userSettingsPath = resolve(process.cwd(), 'src/lib/user/settings.ts');
const userProfilePath = resolve(process.cwd(), 'src/lib/user/profile.ts');
const featureTogglesPath = resolve(process.cwd(), 'src/lib/hooks/useFeatureToggles.ts');
const paymentPausePath = resolve(process.cwd(), 'src/lib/hooks/usePaymentPause.ts');

test('client cache coherence should rely on explicit domain invalidation instead of fetch monkey patches', async () => {
  const [providersSource, userSettingsSource, userProfileSource] = await Promise.all([
    readFile(providersPath, 'utf-8'),
    readFile(userSettingsPath, 'utf-8'),
    readFile(userProfilePath, 'utf-8'),
  ]);

  assert.doesNotMatch(
    providersSource,
    /window\.fetch\s*=\s*patchedFetch/u,
    'client providers should not monkey-patch fetch globally',
  );
  assert.match(
    userSettingsSource,
    /dispatchUserDataInvalidate/u,
    'user settings helper should own user-data invalidation after successful writes',
  );
  assert.match(
    userSettingsSource,
    /dispatchPromptKnowledgeBaseUpdated/u,
    'user settings helper should explicitly refresh prompt knowledge-base consumers when kb ids change',
  );
  assert.match(
    userProfileSource,
    /dispatchUserDataInvalidate\('\/api\/user\/profile'\)/u,
    'profile updates should explicitly invalidate user-data consumers',
  );
});

test('feature toggle and payment pause hooks should refresh on window focus instead of api-write fan-out', async () => {
  const [featureTogglesSource, paymentPauseSource] = await Promise.all([
    readFile(featureTogglesPath, 'utf-8'),
    readFile(paymentPausePath, 'utf-8'),
  ]);

  for (const source of [featureTogglesSource, paymentPauseSource]) {
    assert.match(
      source,
      /window\.addEventListener\('focus'/u,
      'lightweight hooks should refresh when the window regains focus',
    );
    assert.match(
      source,
      /document\.addEventListener\('visibilitychange'/u,
      'lightweight hooks should refresh when the tab becomes visible again',
    );
    assert.doesNotMatch(
      source,
      /mingai:api-write/u,
      'lightweight hooks should not depend on the removed global api-write event fan-out',
    );
  }
});
