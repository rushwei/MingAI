import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const messageItemPath = resolve(process.cwd(), 'src/components/chat/ChatMessageItem.tsx');
const modelSelectorPath = resolve(process.cwd(), 'src/components/ui/ModelSelector.tsx');

test('chat message retry tooltip should use registered model names instead of the static config fallback table', async () => {
  const source = await readFile(messageItemPath, 'utf-8');

  assert.match(
    source,
    /resolveClientModelName/u,
    'retry tooltip should resolve model names from the client-side model registry',
  );
  assert.match(
    source,
    /message\.modelName \|\| resolveClientModelName/u,
    'assistant messages should prefer the persisted model name and then fall back to the client registry',
  );
  assert.doesNotMatch(
    source,
    /getModelName\(message\.model \|\| ''\)/u,
    'retry tooltip should not fall back to the outdated static model table for admin-managed models',
  );
});

test('model selector should warm-start from local cache before awaiting the auth session', async () => {
  const source = await readFile(modelSelectorPath, 'utf-8');

  const cacheIndex = source.indexOf('const cached = refreshNonce === 0');
  const sessionIndex = source.indexOf('const { data: { session } } = await supabase.auth.getSession();');

  assert.notEqual(cacheIndex, -1, 'model selector should attempt to read the warm cache');
  assert.notEqual(sessionIndex, -1, 'model selector should still refresh with the authenticated session');
  assert.ok(cacheIndex < sessionIndex, 'warm cache lookup should happen before awaiting auth session');
  assert.match(
    source,
    /registerClientModelNames\(cached\)/u,
    'warm cache should also refresh the client-side model name registry',
  );
});
