import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const routePath = resolve(process.cwd(), 'src/app/api/conversations/[id]/route.ts');

test('conversation detail route should read messages from conversation_messages instead of legacy JSON fallback', async () => {
  const source = await readFile(routePath, 'utf-8');

  assert.doesNotMatch(
    source,
    /'messages'/u,
    'route should no longer select or fallback to conversations.messages',
  );
  assert.match(
    source,
    /loadConversationMessagePage\(auth\.supabase, id/u,
    'route should load message pages from conversation_messages',
  );
});
