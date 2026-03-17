import test from 'node:test';
import assert from 'node:assert/strict';

test('conversation-delete module should not export unsafe unlink helper', async () => {
  const moduleExports = await import('../lib/chat/conversation-delete');
  assert.equal('unlinkConversationFromHistoryRecords' in moduleExports, false);
});

test('deleteConversationGraph should rely on FK unlinking instead of updating history records', async () => {
  const updateCalls: string[] = [];
  const deleteCalls: string[] = [];
  const { deleteConversationGraph } = await import('../lib/chat/conversation-delete');

  const supabase = {
    from(table: string) {
      return {
        update(_payload: Record<string, unknown>) {
          return {
            eq(_field: string, _id: string) {
              return {
                eq(_nextField: string, _userId: string) {
                  updateCalls.push(table);
                  return Promise.resolve({ error: null });
                },
              };
            },
          };
        },
        delete() {
          return {
            eq(_field: string, _value: string) {
              return {
                eq(_nextField: string, _nextValue: string) {
                  deleteCalls.push(table);
                  return Promise.resolve({ error: null });
                },
              };
            },
          };
        },
      };
    },
  };

  const result = await deleteConversationGraph(supabase as never, 'user-1', 'conv-1');

  assert.equal(result.error, null);
  assert.equal(updateCalls.length, 0);
  assert.deepEqual(deleteCalls, ['knowledge_entries', 'archived_sources', 'conversations']);
});
