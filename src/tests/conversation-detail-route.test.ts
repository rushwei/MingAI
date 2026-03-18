import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';

process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-anon';

test('conversation detail route should fail loudly when message storage cannot be loaded', async (t) => {
  const apiUtilsModule = require('../lib/api-utils') as any;
  const conversationMessagesModule = require('../lib/server/conversation-messages') as any;

  const originalRequireUserContext = apiUtilsModule.requireUserContext;
  const originalLoadAllConversationMessages = conversationMessagesModule.loadAllConversationMessages;

  apiUtilsModule.requireUserContext = async () => ({
    user: { id: 'user-1' },
    supabase: {
      from(table: string) {
        assert.equal(table, 'conversations_with_archive_status');
        return {
          select() {
            return {
              eq() {
                return {
                  eq() {
                    return {
                      maybeSingle: async () => ({
                        data: {
                          id: 'conv-1',
                          user_id: 'user-1',
                          title: 'Test',
                          personality: 'general',
                          created_at: '2026-03-18T00:00:00.000Z',
                          updated_at: '2026-03-18T00:00:00.000Z',
                          source_type: 'chat',
                          source_data: null,
                          is_archived: false,
                          archived_kb_ids: [],
                        },
                        error: null,
                      }),
                    };
                  },
                };
              },
            };
          },
        };
      },
    },
  });

  conversationMessagesModule.loadAllConversationMessages = async () => ({
    messages: [],
    error: { code: '42P01', message: 'relation "conversation_messages" does not exist' },
  });

  t.after(() => {
    apiUtilsModule.requireUserContext = originalRequireUserContext;
    conversationMessagesModule.loadAllConversationMessages = originalLoadAllConversationMessages;
  });

  const { GET } = await import('../app/api/conversations/[id]/route');
  const response = await GET(
    new NextRequest('http://localhost/api/conversations/conv-1'),
    { params: Promise.resolve({ id: 'conv-1' }) }
  );

  assert.equal(response.status, 500);
  const body = await response.json();
  assert.equal(body.error, '加载对话失败');
});
