import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const vendorConfigPath = resolve(process.cwd(), 'src/lib/ai/vendor-config.tsx');
const lobeIconsTypesPath = resolve(
  dirname(require.resolve('@lobehub/icons/package.json')),
  'es/icons.d.ts'
);

test('vendor icon mapping should prefer color variants when the icon package provides them', async () => {
  const [source, iconTypes] = await Promise.all([
    readFile(vendorConfigPath, 'utf-8'),
    readFile(lobeIconsTypesPath, 'utf-8'),
  ]);

  assert.equal(
    source.includes('Icon.Color'),
    true,
    'vendor icon mapping should prefer Color variants for vendors like Gemini when available'
  );
  assert.equal(
    source.includes('color={Icon.colorPrimary'),
    false,
    'vendor icon mapping should not force a monochrome color prop onto colored vendor icons'
  );

  for (const iconName of [
    'OpenAI',
    'Claude',
    'Google',
    'DeepSeek',
    'Zhipu',
    'Gemini',
    'Qwen',
    'Moonshot',
    'XAI',
    'Minimax',
  ]) {
    assert.equal(
      iconTypes.includes(`export { default as ${iconName}`),
      true,
      `@lobehub/icons should export ${iconName} for vendor-config`
    );
    assert.equal(
      source.includes(iconName),
      true,
      `vendor-config should use the supported ${iconName} export`
    );
  }
});
