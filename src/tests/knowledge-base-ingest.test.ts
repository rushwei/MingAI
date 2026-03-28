import { test } from 'node:test';
import assert from 'node:assert/strict';

const ingestModule = require('../lib/knowledge-base/ingest') as any;
const apiUtilsModule = require('../lib/api-utils') as any;

test('ingestChatMessageAsService stores chat_message entries with metadata', async () => {
    const originalGetServiceClient = apiUtilsModule.getSystemAdminClient;
    const inserted: Array<{ source_type: string; source_id: string; metadata: Record<string, unknown> }> = [];

    apiUtilsModule.getSystemAdminClient = () => ({
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
                                    },
                                    error: null
                                })
                            })
                        })
                    })
                };
            }
            if (table === 'conversation_messages') {
                return {
                    select: () => ({
                        eq(column: string) {
                            if (column === 'conversation_id') {
                                return {
                                    eq(innerColumn: string) {
                                        if (innerColumn === 'message_id') {
                                            return {
                                                maybeSingle: async () => ({
                                                    data: {
                                                        sequence: 2,
                                                        message_id: 'a1',
                                                        role: 'assistant',
                                                        content: '你好，我在',
                                                        metadata: null,
                                                        created_at: '2026-03-27T00:00:00.000Z',
                                                    },
                                                    error: null,
                                                }),
                                            };
                                        }
                                        if (innerColumn === 'role') {
                                            return {
                                                lt: () => ({
                                                    order: () => ({
                                                        limit: () => ({
                                                            maybeSingle: async () => ({
                                                                data: {
                                                                    sequence: 1,
                                                                    message_id: 'u1',
                                                                    role: 'user',
                                                                    content: '你好',
                                                                    metadata: null,
                                                                    created_at: '2026-03-27T00:00:00.000Z',
                                                                },
                                                                error: null,
                                                            }),
                                                        }),
                                                    }),
                                                }),
                                            };
                                        }
                                        throw new Error(`Unexpected conversation_messages eq: ${innerColumn}`);
                                    },
                                };
                            }
                            throw new Error(`Unexpected conversation_messages select eq: ${column}`);
                        },
                    }),
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
        assert.equal(inserted[0]?.metadata?.user_message_id, 'u1');
    } finally {
        apiUtilsModule.getSystemAdminClient = originalGetServiceClient;
    }
});
