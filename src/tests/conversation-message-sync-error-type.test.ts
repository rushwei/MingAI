import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const conversationMessagesPath = resolve(process.cwd(), 'src/lib/server/conversation-messages.ts');

test('replaceConversationMessages should type rpc errors with message/code fields', async () => {
  const source = await readFile(conversationMessagesPath, 'utf-8');

  assert.match(
    source,
    /type ConversationMessageSyncError = \{ message\?: string; code\?: string \};/u,
    'conversation-messages should expose a narrow sync error shape instead of leaving rpc errors as unknown',
  );
  assert.match(
    source,
    /replaceConversationMessages[\s\S]*Promise<\{ error: ConversationMessageSyncError \| null \}>/u,
    'replaceConversationMessages should return typed error with message/code fields',
  );
});
