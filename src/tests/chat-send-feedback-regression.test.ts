import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const messagingPath = resolve(process.cwd(), 'src/lib/chat/use-chat-messaging.ts');
const chatLayoutPath = resolve(process.cwd(), 'src/components/chat/ChatLayout.tsx');

test('chat send flow should show assistant placeholder before waiting for message persistence', async () => {
  const source = await readFile(messagingPath, 'utf-8');

  const optimisticIndex = source.indexOf('const optimisticMessages = [...newMessages, initialAssistantMessage];');
  const saveIndex = source.indexOf('const saveSucceeded = await saveMessages(');
  const sessionPromiseIndex = source.indexOf('const sessionPromise = supabase.auth.getSession();');

  assert.notEqual(optimisticIndex, -1, 'send flow should build an optimistic assistant placeholder message');
  assert.notEqual(saveIndex, -1, 'send flow should still persist user messages before continuing');
  assert.notEqual(sessionPromiseIndex, -1, 'send flow should start auth session lookup before waiting for persistence');
  assert.ok(optimisticIndex < saveIndex, 'assistant placeholder should be inserted before waiting for saveMessages');
  assert.ok(sessionPromiseIndex < saveIndex, 'session lookup should overlap with conversation persistence');
});

test('chat layout should keep the assistant loading state visible while the initial send is still being persisted', async () => {
  const source = await readFile(chatLayoutPath, 'utf-8');

  assert.match(
    source,
    /isLoading=\{isLoading \|\| isSendingToList\}/u,
    'message list rendering should treat the pending-send phase as a loading state',
  );
});
