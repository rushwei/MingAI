import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const conversationLibPath = resolve(process.cwd(), 'src/lib/chat/conversation.ts');

test('conversation mapper should use the shared source-type normalizer instead of a local fallback table', async () => {
  const source = await readFile(conversationLibPath, 'utf-8');

  assert.match(
    source,
    /normalizeConversationSourceType/u,
    'conversation mapper should reuse the shared source contract normalizer',
  );
  assert.match(
    source,
    /sourceType:\s*normalizeConversationSourceType\(row\.source_type\)/u,
    'conversation mapper should normalize API source_type values through the shared contract',
  );
  assert.doesNotMatch(
    source,
    /const normalizeSourceType =/u,
    'conversation mapper should not keep a second local source-type registry',
  );
});
