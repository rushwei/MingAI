import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const chatRequestPath = resolve(process.cwd(), 'src/lib/server/chat/request.ts');
const chatPreviewPath = resolve(process.cwd(), 'src/app/api/chat/preview/route.ts');
const aiSettingsPagePath = resolve(process.cwd(), 'src/app/user/ai-settings/page.tsx');

test('chat request and preview should resolve online default model through server helper', async () => {
  const [requestSource, previewSource] = await Promise.all([
    readFile(chatRequestPath, 'utf-8'),
    readFile(chatPreviewPath, 'utf-8'),
  ]);

  assert.equal(
    requestSource.includes('getDefaultModelConfigAsync'),
    true,
    'chat request should use server default model helper when body.model is empty'
  );
  assert.equal(
    previewSource.includes('getDefaultModelConfigAsync'),
    true,
    'chat preview should use server default model helper when body.model is empty'
  );
});

test('ai settings preview should not hardcode DEFAULT_MODEL_ID into preview requests', async () => {
  const source = await readFile(aiSettingsPagePath, 'utf-8');

  assert.equal(
    source.includes('model: DEFAULT_MODEL_ID'),
    false,
    'ai settings preview should omit model field when relying on online default model'
  );
});
