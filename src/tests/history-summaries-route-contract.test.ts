import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';

process.env.SUPABASE_URL = 'http://localhost';
process.env.SUPABASE_ANON_KEY = 'test-anon';

test('history summaries route should support qimen summaries through the shared history registry', async (t) => {
  const apiUtilsModule = require('../lib/api-utils') as typeof import('../lib/api-utils');
  type RequireUserContextResult = Awaited<ReturnType<typeof apiUtilsModule.requireUserContext>>;
  const originalRequireUserContext = apiUtilsModule.requireUserContext;

  apiUtilsModule.requireUserContext = async () => ({
    user: { id: 'user-1' } as Awaited<ReturnType<typeof import('../lib/api-utils').getAuthContext>>['user'],
    supabase: {
      from(table: string) {
        assert.equal(table, 'qimen_charts');
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                range: async (from: number, to: number) => {
                  assert.equal(from, 0);
                  assert.equal(to, 50);
                  return {
                    data: [
                      {
                        id: 'qm-1',
                        dun_type: 'yang',
                        ju_number: 9,
                        question: '事业如何',
                        created_at: '2026-03-16T00:00:00.000Z',
                      },
                    ],
                    error: null,
                  };
                },
              }),
            }),
          }),
        };
      },
    } as never,
  } as unknown as RequireUserContextResult);

  t.after(() => {
    apiUtilsModule.requireUserContext = originalRequireUserContext;
  });

  const { GET } = await import('../app/api/history-summaries/route');
  const response = await GET(new NextRequest('http://localhost/api/history-summaries?type=qimen&limit=50'));
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.items[0].id, 'qm-1');
  assert.equal(payload.items[0].title, '阳遁9局');
  assert.equal(payload.pagination.hasMore, false);
});

test('history summaries route should return qimen restore payloads from stored base inputs', async (t) => {
  const apiUtilsModule = require('../lib/api-utils') as typeof import('../lib/api-utils');
  type RequireUserContextResult = Awaited<ReturnType<typeof apiUtilsModule.requireUserContext>>;
  const originalRequireUserContext = apiUtilsModule.requireUserContext;

  apiUtilsModule.requireUserContext = async () => ({
    user: { id: 'user-1' } as Awaited<ReturnType<typeof import('../lib/api-utils').getAuthContext>>['user'],
    supabase: {
      from(table: string) {
        assert.equal(table, 'qimen_charts');
        return {
          select(selectClause: string) {
            assert.equal(selectClause, '*');
            return {
              eq() {
                return {
                  eq() {
                    return {
                      maybeSingle: async () => ({
                        data: {
                          id: 'qm-restore-1',
                          question: '合作能成吗',
                          year: 2026,
                          month: 3,
                          day: 16,
                          hour: 9,
                          minute: 30,
                          timezone: 'Asia/Shanghai',
                          pan_type: 'zhuan',
                          ju_method: 'chaibu',
                          zhi_fu_ji_gong: 'ji_wugong',
                          created_at: '2026-03-16T00:00:00.000Z',
                          conversation_id: 'conv-qm-1',
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
    } as never,
  } as unknown as RequireUserContextResult);

  t.after(() => {
    apiUtilsModule.requireUserContext = originalRequireUserContext;
  });

  const { GET } = await import('../app/api/history-summaries/route');
  const response = await GET(new NextRequest(
    'http://localhost/api/history-summaries?type=qimen&id=qm-restore-1&timezone=Asia%2FShanghai',
  ));
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.item.sessionKey, 'qimen_result');
  assert.equal(payload.item.sessionData.year, 2026);
  assert.equal(payload.item.sessionData.minute, 30);
  assert.equal(payload.item.sessionData.timezone, 'Asia/Shanghai');
  assert.equal(payload.item.sessionData.juMethod, 'chaibu');
  assert.equal(payload.item.sessionData.zhiFuJiGong, 'jiWuGong');
  assert.equal(payload.item.sessionData.conversationId, 'conv-qm-1');
});

test('history summaries route should return daliuren restore payloads through the shared history registry', async (t) => {
  const apiUtilsModule = require('../lib/api-utils') as typeof import('../lib/api-utils');
  type RequireUserContextResult = Awaited<ReturnType<typeof apiUtilsModule.requireUserContext>>;
  const originalRequireUserContext = apiUtilsModule.requireUserContext;

  apiUtilsModule.requireUserContext = async () => ({
    user: { id: 'user-1' } as Awaited<ReturnType<typeof import('../lib/api-utils').getAuthContext>>['user'],
    supabase: {
      from(table: string) {
        assert.equal(table, 'daliuren_divinations');
        return {
          select(selectClause: string) {
            assert.equal(selectClause, '*');
            return {
              eq() {
                return {
                  eq() {
                    return {
                      maybeSingle: async () => ({
                        data: {
                          id: 'lr-1',
                          solar_date: '2026-03-16',
                          question: '明天出行如何',
                          conversation_id: 'conv-1',
                          settings: {
                            hour: 10,
                            minute: 30,
                            timezone: 'Asia/Shanghai',
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
    } as never,
  } as unknown as RequireUserContextResult);

  t.after(() => {
    apiUtilsModule.requireUserContext = originalRequireUserContext;
  });

  const { GET } = await import('../app/api/history-summaries/route');
  const response = await GET(new NextRequest(
    'http://localhost/api/history-summaries?type=daliuren&id=lr-1&timezone=Asia%2FShanghai',
  ));
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.item.sessionKey, 'daliuren_params');
  assert.equal(payload.item.sessionData.timezone, 'Asia/Shanghai');
  assert.equal(payload.item.sessionData.conversationId, 'conv-1');
});

test('history summaries route should support offset pagination instead of clamping the list to the first 50 rows forever', async (t) => {
  const apiUtilsModule = require('../lib/api-utils') as typeof import('../lib/api-utils');
  type RequireUserContextResult = Awaited<ReturnType<typeof apiUtilsModule.requireUserContext>>;
  const originalRequireUserContext = apiUtilsModule.requireUserContext;

  apiUtilsModule.requireUserContext = async () => ({
    user: { id: 'user-1' } as Awaited<ReturnType<typeof import('../lib/api-utils').getAuthContext>>['user'],
    supabase: {
      from(table: string) {
        assert.equal(table, 'tarot_readings');
        return {
          select(selectClause: string) {
            assert.equal(
              selectClause,
              'id, spread_id, question, cards, conversation_id, created_at, conversation:conversations(source_data)',
            );
            return {
              eq() {
                return {
                  order() {
                    return {
                      range: async (from: number, to: number) => {
                        assert.equal(from, 100);
                        assert.equal(to, 200);
                        return {
                          data: [
                            {
                              id: 'tarot-101',
                              spread_id: 'single',
                              question: '后续如何',
                              cards: [],
                              created_at: '2026-03-16T00:00:00.000Z',
                            },
                          ],
                          error: null,
                        };
                      },
                    };
                  },
                };
              },
            };
          },
        };
      },
    } as never,
  } as unknown as RequireUserContextResult);

  t.after(() => {
    apiUtilsModule.requireUserContext = originalRequireUserContext;
  });

  const { GET } = await import('../app/api/history-summaries/route');
  const response = await GET(new NextRequest('http://localhost/api/history-summaries?type=tarot&limit=100&offset=100'));
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.items[0].id, 'tarot-101');
  assert.equal(payload.pagination.hasMore, false);
  assert.equal(payload.pagination.nextOffset, null);
});

test('history summaries route should restore tarot birthDate and numerology metadata', async (t) => {
  const apiUtilsModule = require('../lib/api-utils') as typeof import('../lib/api-utils');
  type RequireUserContextResult = Awaited<ReturnType<typeof apiUtilsModule.requireUserContext>>;
  const originalRequireUserContext = apiUtilsModule.requireUserContext;

  apiUtilsModule.requireUserContext = async () => ({
    user: { id: 'user-1' } as Awaited<ReturnType<typeof import('../lib/api-utils').getAuthContext>>['user'],
    supabase: {
      from(table: string) {
        assert.equal(table, 'tarot_readings');
        return {
          select(selectClause: string) {
            assert.equal(selectClause, '*');
            return {
              eq() {
                return {
                  eq() {
                    return {
                      maybeSingle: async () => ({
                        data: {
                          id: 'tarot-1',
                          spread_id: 'single',
                          question: '今天如何',
                          cards: [],
                          conversation_id: 'conv-1',
                          created_at: '2026-03-20T00:00:00.000Z',
                          metadata: {
                            birthDate: '1990-01-01',
                            numerology: {
                              personalityCard: { number: 1, name: 'The Magician', nameChinese: '魔术师' },
                              soulCard: { number: 2, name: 'The High Priestess', nameChinese: '女祭司' },
                              yearlyCard: { number: 19, name: 'The Sun', nameChinese: '太阳', year: 2026 },
                            },
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
    } as never,
  } as unknown as RequireUserContextResult);

  t.after(() => {
    apiUtilsModule.requireUserContext = originalRequireUserContext;
  });

  const { GET } = await import('../app/api/history-summaries/route');
  const response = await GET(new NextRequest('http://localhost/api/history-summaries?type=tarot&id=tarot-1'));
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.item.sessionKey, 'tarot_result');
  assert.equal(payload.item.sessionData.birthDate, '1990-01-01');
  assert.equal(payload.item.sessionData.numerology.personalityCard.nameChinese, '魔术师');
  assert.equal(payload.item.sessionData.conversationId, 'conv-1');
});

test('history summaries DELETE should call transactional RPC and return success', async (t) => {
  const apiUtilsModule = require('../lib/api-utils') as any;
  const originalRequireUserContext = apiUtilsModule.requireUserContext;

  let rpcArgs: Record<string, unknown> | null = null;

  apiUtilsModule.requireUserContext = async () => ({
    supabase: {
      rpc: async (fn: string, args: Record<string, unknown>) => {
        assert.equal(fn, 'delete_history_item_and_conversation');
        rpcArgs = args;
        return { data: true, error: null };
      },
    },
    user: { id: 'user-1' },
  });

  t.after(() => {
    apiUtilsModule.requireUserContext = originalRequireUserContext;
  });

  const { DELETE } = await import('../app/api/history-summaries/route');
  const response = await DELETE(
    new NextRequest('http://localhost/api/history-summaries?type=qimen&id=qm-1', {
      method: 'DELETE',
    }),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(rpcArgs, {
    p_history_type: 'qimen',
    p_history_id: 'qm-1',
  });
  assert.equal(body.success, true);
});

test('history summaries DELETE should return 404 when transactional RPC reports missing row', async (t) => {
  const apiUtilsModule = require('../lib/api-utils') as any;
  const originalRequireUserContext = apiUtilsModule.requireUserContext;

  apiUtilsModule.requireUserContext = async () => ({
    supabase: {
      rpc: async () => ({ data: false, error: null }),
    },
    user: { id: 'user-1' },
  });

  t.after(() => {
    apiUtilsModule.requireUserContext = originalRequireUserContext;
  });

  const { DELETE } = await import('../app/api/history-summaries/route');
  const response = await DELETE(
    new NextRequest('http://localhost/api/history-summaries?type=tarot&id=tarot-1', {
      method: 'DELETE',
    }),
  );
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.error, '未找到历史记录');
});

test('history summaries DELETE should return 500 when transactional RPC fails', async (t) => {
  const apiUtilsModule = require('../lib/api-utils') as any;
  const originalRequireUserContext = apiUtilsModule.requireUserContext;

  apiUtilsModule.requireUserContext = async () => ({
    supabase: {
      rpc: async () => ({
        data: null,
        error: { message: 'transaction failed' },
      }),
    },
    user: { id: 'user-1' },
  });

  t.after(() => {
    apiUtilsModule.requireUserContext = originalRequireUserContext;
  });

  const { DELETE } = await import('../app/api/history-summaries/route');
  const response = await DELETE(
    new NextRequest('http://localhost/api/history-summaries?type=liuyao&id=ly-1', {
      method: 'DELETE',
    }),
  );
  const body = await response.json();

  assert.equal(response.status, 500);
  assert.equal(body.error, '删除历史记录失败');
});
