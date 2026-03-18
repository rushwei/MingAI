import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const modelSelectorPath = resolve(process.cwd(), 'src/components/ui/ModelSelector.tsx');

test('model selector should render a flat model list instead of vendor-grouped sections', async () => {
  const source = await readFile(modelSelectorPath, 'utf-8');

  assert.equal(
    source.includes('modelsByVendor'),
    false,
    'model selector should not keep a vendor-grouped intermediate structure'
  );
  assert.equal(
    source.includes('Object.keys(modelsByVendor)'),
    false,
    'model selector should not render grouped vendor buckets'
  );
  assert.equal(
    source.includes('sticky top-0'),
    false,
    'model selector should not render sticky vendor group headers'
  );
  assert.equal(
    source.includes('models.map((model) =>'),
    true,
    'model selector should render a flat list by iterating directly over models'
  );
});
