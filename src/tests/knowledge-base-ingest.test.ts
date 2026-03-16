import { test } from 'node:test';
import assert from 'node:assert/strict';

const ingestModule = require('../lib/knowledge-base/ingest') as any;
const supabaseServerModule = require('../lib/supabase-server') as any;

test('ingestChatMessageAsService stores chat_message entries with metadata', async () => {
    const originalGetServiceClient = supabaseServerModule.getSystemAdminClient;
    const inserted: Array<{ source_type: string; source_id: string; metadata: Record<string, unknown> }> = [];

    supabaseServerModule.getSystemAdminClient = () => ({
        from: (table: string) => {
            if (table === 'conversations') {
                return {
                    select: () => ({
                        eq: () => ({
                            eq: () => ({
                                maybeSingle: async () => ({
                                    data: {
                                        id: 'conv-1',
                                        user_id: 'user-1',
                                        messages: [
                                            { id: 'u1', role: 'user', content: '你好' },
                                            { id: 'a1', role: 'assistant', content: '你好，我在' },
                                        ]
                                    },
                                    error: null
                                })
                            })
                        })
                    })
                };
            }
            if (table === 'knowledge_entries') {
                return {
                    delete: () => ({
                        eq: () => ({
                            eq: () => ({
                                eq: () => ({
                                    gte: async () => ({ error: null })
                                })
                            })
                        })
                    }),
                    upsert: (entries: Array<{ source_type: string; source_id: string; metadata: Record<string, unknown> }>) => ({
                        select: async () => {
                            inserted.push(...entries);
                            return { data: entries.map((_, i) => ({ id: `entry-${i}` })), error: null };
                        }
                    })
                };
            }
            return {};
        }
    });

    try {
        const result = await ingestModule.ingestChatMessageAsService('kb-1', 'conv-1', 'a1', 'user-1');
        assert.equal(result.chunks > 0, true);
        assert.equal(inserted[0]?.source_type, 'chat_message');
        assert.equal(inserted[0]?.source_id, 'a1');
        assert.equal(inserted[0]?.metadata?.conversation_id, 'conv-1');
        assert.equal(inserted[0]?.metadata?.message_id, 'a1');
    } finally {
        supabaseServerModule.getSystemAdminClient = originalGetServiceClient;
    }
});
