import { test } from 'node:test';
import assert from 'node:assert/strict';

const ingestModule = require('../lib/knowledge-base/ingest') as any;
const apiUtilsModule = require('../lib/api-utils') as any;

test('ingestChatMessageAsService stores chat_message entries with metadata', async () => {
    const originalGetServiceClient = apiUtilsModule.getSystemAdminClient;
    let rpcCall: { fn: string; args: Record<string, unknown> } | null = null;

    apiUtilsModule.getSystemAdminClient = () => ({
        rpc: (fn: string, args: Record<string, unknown>) => {
            rpcCall = { fn, args };
            return Promise.resolve({ data: 1, error: null });
        },
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
            return {};
        }
    });

    try {
        const result = await ingestModule.ingestChatMessageAsService('kb-1', 'conv-1', 'a1', 'user-1');
        assert.equal(result.chunks > 0, true);
        assert.equal(rpcCall?.fn, 'kb_replace_source_entries');
        assert.equal(rpcCall?.args.p_source_type, 'chat_message');
        assert.equal(rpcCall?.args.p_source_id, 'a1');
        assert.equal(rpcCall?.args.p_archive, true);
        const entries = (rpcCall?.args.p_entries as Array<Record<string, unknown>>) || [];
        assert.equal(entries[0]?.metadata?.conversation_id, 'conv-1');
        assert.equal(entries[0]?.metadata?.message_id, 'a1');
        assert.equal(entries[0]?.metadata?.user_message_id, 'u1');
    } finally {
        apiUtilsModule.getSystemAdminClient = originalGetServiceClient;
    }
});
