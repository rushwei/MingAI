import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const featureTogglePanelPath = resolve(process.cwd(), 'src/components/admin/FeatureTogglePanel.tsx');

test('feature toggle panel should broadcast feature toggle invalidation after successful writes', async () => {
  const source = await readFile(featureTogglePanelPath, 'utf-8');

  assert.ok(
    source.includes("new CustomEvent('mingai:api-write'"),
    'feature toggle updates should emit the standard api-write invalidation event',
  );
  assert.ok(
    source.includes("pathname: '/api/feature-toggles'"),
    'feature toggle invalidation should target the feature toggle api cache key',
  );
});
