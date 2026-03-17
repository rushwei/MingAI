import { test } from 'node:test';
import assert from 'node:assert/strict';

test('replaceConversationMessages should fall back to conversation_messages table writes when rpc is unavailable', async () => {
  const { replaceConversationMessages } = require('../lib/server/conversation-messages') as typeof import('../lib/server/conversation-messages');

  const calls: Array<{ op: string; value?: unknown }> = [];
  const supabase = {
    from(table: string) {
      assert.equal(table, 'conversation_messages');
      return {
        delete() {
          calls.push({ op: 'delete' });
          return {
            eq: async () => ({ error: null }),
          };
        },
        insert(value: unknown) {
          calls.push({ op: 'insert', value });
          return Promise.resolve({ error: null });
        },
      };
    },
  };

  const result = await replaceConversationMessages(supabase as never, 'conv-1', [
    { id: 'm-1', role: 'assistant', content: 'hello', createdAt: '2026-03-16T00:00:00.000Z' },
  ]);

  assert.equal(result.error, null);
  assert.deepEqual(
    calls.map((entry) => entry.op),
    ['delete', 'insert'],
  );
});
