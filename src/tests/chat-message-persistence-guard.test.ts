import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const messagingPath = resolve(process.cwd(), 'src/lib/chat/use-chat-messaging.ts');

test('chat messaging should abort and cleanup a new conversation when the initial save fails', async () => {
  const source = await readFile(messagingPath, 'utf-8');

  assert.equal(
    source.includes('const saveSucceeded = await saveMessages('),
    true,
    'message send flow should capture the save result before continuing'
  );
  assert.equal(
    source.includes('if (!saveSucceeded)'),
    true,
    'message send flow should abort when conversation persistence fails'
  );
  assert.equal(
    source.includes('await deleteConversation(conversationId)'),
    true,
    'new empty conversations should be cleaned up when the first message fails to persist'
  );
  assert.equal(
    source.includes("showToast('error', '保存对话失败，请重试')"),
    true,
    'save failures should surface an explicit error to the user'
  );
});
