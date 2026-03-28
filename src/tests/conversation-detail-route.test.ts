import test from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';

process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-anon';

test('conversation detail route should fail loudly when message storage cannot be loaded', async (t) => {
  const apiUtilsModule = require('../lib/api-utils') as any;
  const conversationMessagesModule = require('../lib/server/conversation-messages') as any;
  const routePath = require.resolve('../app/api/conversations/[id]/route');

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
    delete require.cache[routePath];
  });

  delete require.cache[routePath];
  const { GET } = await import('../app/api/conversations/[id]/route');
  const response = await GET(
    new NextRequest('http://localhost/api/conversations/conv-1'),
    { params: Promise.resolve({ id: 'conv-1' }) }
  );

  assert.equal(response.status, 500);
  const body = await response.json();
  assert.equal(body.error, '加载对话失败');
});

test('conversation detail route returns analysis snapshot without loading full messages', async (t) => {
  const apiUtilsModule = require('../lib/api-utils') as any;
  const conversationMessagesModule = require('../lib/server/conversation-messages') as any;
  const routePath = require.resolve('../app/api/conversations/[id]/route');

  const originalRequireUserContext = apiUtilsModule.requireUserContext;
  const originalLoadAllConversationMessages = conversationMessagesModule.loadAllConversationMessages;
  const originalLoadConversationAnalysisMessage = conversationMessagesModule.loadConversationAnalysisMessage;
  let loadedFullMessages = false;

  apiUtilsModule.requireUserContext = async () => ({
    user: { id: 'user-1' },
    supabase: {
      from(table: string) {
        assert.equal(table, 'conversations_with_archive_status');
        return {
          select(columns: string) {
            assert.match(columns, /source_data/u);
            return {
              eq() {
                return {
                  eq() {
                    return {
                      maybeSingle: async () => ({
                        data: {
                          id: 'conv-1',
                          user_id: 'user-1',
                          source_data: {
                            model_id: 'glm-4',
                            reasoning_text: 'source reasoning',
                            reasoning: true,
                          },
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

  conversationMessagesModule.loadAllConversationMessages = async () => {
    loadedFullMessages = true;
    return { messages: [], error: null };
  };
  conversationMessagesModule.loadConversationAnalysisMessage = async () => ({
    message: {
      id: 'm1',
      role: 'assistant',
      content: 'saved analysis',
      createdAt: '2026-03-18T00:00:00.000Z',
    },
    error: null,
  });

  t.after(() => {
    apiUtilsModule.requireUserContext = originalRequireUserContext;
    conversationMessagesModule.loadAllConversationMessages = originalLoadAllConversationMessages;
    conversationMessagesModule.loadConversationAnalysisMessage = originalLoadConversationAnalysisMessage;
    delete require.cache[routePath];
  });

  delete require.cache[routePath];
  const { GET } = await import('../app/api/conversations/[id]/route');
  const response = await GET(
    new NextRequest('http://localhost/api/conversations/conv-1?snapshot=analysis'),
    { params: Promise.resolve({ id: 'conv-1' }) }
  );

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(loadedFullMessages, false);
  assert.deepEqual(body.snapshot, {
    analysis: 'saved analysis',
    reasoning: 'source reasoning',
    modelId: 'glm-4',
    reasoningEnabled: true,
  });
});
