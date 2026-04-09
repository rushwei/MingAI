import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';

process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-anon';

test('knowledge-base POST should create through transactional rpc', async (t) => {
  const apiUtilsModule = require('../lib/api-utils') as any;
  const membershipModule = require('../lib/user/membership-server') as any;
  const featureGateModule = require('../lib/feature-gate-utils') as any;
  const routePath = require.resolve('../app/api/knowledge-base/route');
  const originalRequireUserContext = apiUtilsModule.requireUserContext;
  const originalGetEffectiveMembershipType = membershipModule.getEffectiveMembershipType;
  const originalEnsureFeatureRouteEnabled = featureGateModule.ensureFeatureRouteEnabled;

  let rpcCall: { fn: string; args: Record<string, unknown> } | null = null;

  apiUtilsModule.requireUserContext = async () => ({
    user: { id: 'user-1' },
    supabase: {
      rpc: async (fn: string, args: Record<string, unknown>) => {
        rpcCall = { fn, args };
        return {
          data: {
            status: 'ok',
            knowledge_base: { id: 'kb-1', name: 'My KB' },
          },
          error: null,
        };
      },
    },
  });
  membershipModule.getEffectiveMembershipType = async () => 'plus';
  featureGateModule.ensureFeatureRouteEnabled = async () => null;
  delete require.cache[routePath];

  t.after(() => {
    apiUtilsModule.requireUserContext = originalRequireUserContext;
    membershipModule.getEffectiveMembershipType = originalGetEffectiveMembershipType;
    featureGateModule.ensureFeatureRouteEnabled = originalEnsureFeatureRouteEnabled;
    delete require.cache[routePath];
  });

  const { POST } = await import('../app/api/knowledge-base/route');
  const response = await POST(new NextRequest('http://localhost/api/knowledge-base', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'My KB',
      description: 'test',
      weight: 'high',
    }),
  }));
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.id, 'kb-1');
  assert.equal(rpcCall?.fn, 'create_knowledge_base_with_limit');
  assert.deepEqual(rpcCall?.args, {
    p_user_id: 'user-1',
    p_name: 'My KB',
    p_description: 'test',
    p_weight: 'high',
    p_limit: 3,
  });
});

test('knowledge-base POST should return 403 when transactional limit is reached', async (t) => {
  const apiUtilsModule = require('../lib/api-utils') as any;
  const membershipModule = require('../lib/user/membership-server') as any;
  const featureGateModule = require('../lib/feature-gate-utils') as any;
  const routePath = require.resolve('../app/api/knowledge-base/route');
  const originalRequireUserContext = apiUtilsModule.requireUserContext;
  const originalGetEffectiveMembershipType = membershipModule.getEffectiveMembershipType;
  const originalEnsureFeatureRouteEnabled = featureGateModule.ensureFeatureRouteEnabled;

  apiUtilsModule.requireUserContext = async () => ({
    user: { id: 'user-1' },
    supabase: {
      rpc: async () => ({ data: { status: 'limit_reached' }, error: null }),
    },
  });
  membershipModule.getEffectiveMembershipType = async () => 'plus';
  featureGateModule.ensureFeatureRouteEnabled = async () => null;
  delete require.cache[routePath];

  t.after(() => {
    apiUtilsModule.requireUserContext = originalRequireUserContext;
    membershipModule.getEffectiveMembershipType = originalGetEffectiveMembershipType;
    featureGateModule.ensureFeatureRouteEnabled = originalEnsureFeatureRouteEnabled;
    delete require.cache[routePath];
  });

  const { POST } = await import('../app/api/knowledge-base/route');
  const response = await POST(new NextRequest('http://localhost/api/knowledge-base', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'My KB' }),
  }));
  const payload = await response.json();

  assert.equal(response.status, 403);
  assert.equal(payload.error, '知识库数量已达上限');
});

test('community votes POST should toggle vote through transactional rpc', async (t) => {
  const apiUtilsModule = require('../lib/api-utils') as any;
  const routePath = require.resolve('../app/api/community/votes/route');
  const originalRequireUserContext = apiUtilsModule.requireUserContext;

  let rpcCall: { fn: string; args: Record<string, unknown> } | null = null;

  apiUtilsModule.requireUserContext = async () => ({
    user: { id: 'user-1' },
    supabase: {
      rpc: async (fn: string, args: Record<string, unknown>) => {
        rpcCall = { fn, args };
        return { data: { status: 'ok', vote: 'down' }, error: null };
      },
    },
  });
  delete require.cache[routePath];

  t.after(() => {
    apiUtilsModule.requireUserContext = originalRequireUserContext;
    delete require.cache[routePath];
  });

  const { POST } = await import('../app/api/community/votes/route');
  const response = await POST(new NextRequest('http://localhost/api/community/votes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      targetType: 'post',
      targetId: '11111111-1111-1111-1111-111111111111',
      voteType: 'down',
    }),
  }));
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.vote, 'down');
  assert.equal(rpcCall?.fn, 'toggle_community_vote');
  assert.deepEqual(rpcCall?.args, {
    p_target_type: 'post',
    p_target_id: '11111111-1111-1111-1111-111111111111',
    p_vote_type: 'down',
  });
});

test('records PUT togglePin should use transactional rpc', async (t) => {
  const apiUtilsModule = require('../lib/api-utils') as any;
  const routePath = require.resolve('../app/api/records/[id]/route');
  const originalRequireUserContext = apiUtilsModule.requireUserContext;

  let rpcCall: { fn: string; args: Record<string, unknown> } | null = null;

  apiUtilsModule.requireUserContext = async () => ({
    user: { id: 'user-1' },
    supabase: {
      rpc: async (fn: string, args: Record<string, unknown>) => {
        rpcCall = { fn, args };
        return {
          data: {
            status: 'ok',
            record: { id: 'record-1', is_pinned: true },
          },
          error: null,
        };
      },
    },
  });
  delete require.cache[routePath];

  t.after(() => {
    apiUtilsModule.requireUserContext = originalRequireUserContext;
    delete require.cache[routePath];
  });

  const { PUT } = await import('../app/api/records/[id]/route');
  const response = await PUT(new NextRequest('http://localhost/api/records/record-1', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ togglePin: true }),
  }), {
    params: Promise.resolve({ id: 'record-1' }),
  });
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.id, 'record-1');
  assert.equal(rpcCall?.fn, 'toggle_ming_record_pin');
  assert.deepEqual(rpcCall?.args, {
    p_record_id: 'record-1',
  });
});

test('records PUT togglePin should return 404 when transactional rpc reports not found', async (t) => {
  const apiUtilsModule = require('../lib/api-utils') as any;
  const routePath = require.resolve('../app/api/records/[id]/route');
  const originalRequireUserContext = apiUtilsModule.requireUserContext;

  apiUtilsModule.requireUserContext = async () => ({
    user: { id: 'user-1' },
    supabase: {
      rpc: async () => ({ data: { status: 'not_found' }, error: null }),
    },
  });
  delete require.cache[routePath];

  t.after(() => {
    apiUtilsModule.requireUserContext = originalRequireUserContext;
    delete require.cache[routePath];
  });

  const { PUT } = await import('../app/api/records/[id]/route');
  const response = await PUT(new NextRequest('http://localhost/api/records/missing', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ togglePin: true }),
  }), {
    params: Promise.resolve({ id: 'missing' }),
  });
  const payload = await response.json();

  assert.equal(response.status, 404);
  assert.equal(payload.error, '记录不存在');
});

test('community reports POST should submit and notify via transactional rpc', async (t) => {
  const apiUtils = require('../lib/api-utils') as {
    requireUserContext: typeof import('../lib/api-utils').requireUserContext;
  };
  const originalRequireUserContext = apiUtils.requireUserContext;

  let rpcCall: { fn: string; args: Record<string, unknown> } | null = null;

  apiUtils.requireUserContext = (async () => ({
    user: { id: 'user-1' },
    supabase: {
      rpc(fn: string, args: Record<string, unknown>) {
        rpcCall = { fn, args };
        return Promise.resolve({
          data: {
            status: 'ok',
            report: {
              id: 'report-1',
              reporter_id: 'user-1',
              target_type: 'comment',
              target_id: 'comment-1',
              reason: 'spam',
            },
          },
          error: null,
        });
      },
    },
  })) as unknown as typeof apiUtils.requireUserContext;

  t.after(() => {
    apiUtils.requireUserContext = originalRequireUserContext;
  });

  const { POST } = await import('../app/api/community/reports/route');
  const response = await POST(new NextRequest('http://localhost/api/community/reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      targetType: 'comment',
      targetId: 'comment-1',
      reason: 'spam',
      description: 'bad content',
    }),
  }));
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(rpcCall?.fn, 'submit_community_report_and_notify');
  assert.deepEqual(rpcCall?.args, {
    p_target_type: 'comment',
    p_target_id: 'comment-1',
    p_reason: 'spam',
    p_description: 'bad content',
  });
  assert.equal(payload.id, 'report-1');
  assert.equal(payload.reporter_id, 'user-1');
});

test('community reports POST should return 500 when transactional rpc fails', async (t) => {
  const apiUtils = require('../lib/api-utils') as {
    requireUserContext: typeof import('../lib/api-utils').requireUserContext;
  };
  const originalRequireUserContext = apiUtils.requireUserContext;

  apiUtils.requireUserContext = (async () => ({
    user: { id: 'user-1' },
    supabase: {
      rpc() {
        return Promise.resolve({
          data: null,
          error: { message: 'transaction failed' },
        });
      },
    },
  })) as unknown as typeof apiUtils.requireUserContext;

  t.after(() => {
    apiUtils.requireUserContext = originalRequireUserContext;
  });

  const { POST } = await import('../app/api/community/reports/route');
  const response = await POST(new NextRequest('http://localhost/api/community/reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      targetType: 'post',
      targetId: 'post-1',
      reason: 'spam',
    }),
  }));
  const payload = await response.json();

  assert.equal(response.status, 500);
  assert.equal(payload.error, '提交举报失败');
});

test('membership upgrade route should complete through transactional rpc', async (t) => {
  const apiUtilsModule = require('../lib/api-utils') as any;
  const settingsModule = require('../lib/app-settings') as any;
  const originalRequireUserContext = apiUtilsModule.requireUserContext;
  const originalGetSystemAdminClient = apiUtilsModule.getSystemAdminClient;
  const originalGetPaymentsPaused = settingsModule.getPaymentsPaused;

  let rpcCall: { fn: string; args: Record<string, unknown> } | null = null;

  apiUtilsModule.requireUserContext = async () => ({ user: { id: 'user-1' }, supabase: {} });
  settingsModule.getPaymentsPaused = async () => false;
  apiUtilsModule.getSystemAdminClient = () => ({
    rpc: (fn: string, args: Record<string, unknown>) => {
      rpcCall = { fn, args };
      return Promise.resolve({
        data: {
          status: 'ok',
          credits: 50,
          expires_at: '2026-05-08T00:00:00.000Z',
        },
        error: null,
      });
    },
  });

  t.after(() => {
    apiUtilsModule.requireUserContext = originalRequireUserContext;
    apiUtilsModule.getSystemAdminClient = originalGetSystemAdminClient;
    settingsModule.getPaymentsPaused = originalGetPaymentsPaused;
  });

  const { POST } = await import('../app/api/membership/upgrade/route');
  const response = await POST(new NextRequest('http://localhost/api/membership/upgrade', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ planId: 'plus' }),
  }));
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(rpcCall?.fn, 'complete_membership_upgrade_as_service');
  assert.equal(rpcCall?.args.p_user_id, 'user-1');
  assert.equal(rpcCall?.args.p_plan_id, 'plus');
  assert.equal(payload.credits, 50);
  assert.equal(payload.membership, 'plus');
});

test('purchase credits route should complete through transactional rpc', async (t) => {
  const apiUtilsModule = require('../lib/api-utils') as any;
  const settingsModule = require('../lib/app-settings') as any;
  const originalRequireUserContext = apiUtilsModule.requireUserContext;
  const originalGetSystemAdminClient = apiUtilsModule.getSystemAdminClient;
  const originalGetPaymentsPaused = settingsModule.getPaymentsPaused;

  let rpcCall: { fn: string; args: Record<string, unknown> } | null = null;

  apiUtilsModule.requireUserContext = async () => ({ user: { id: 'user-1' }, supabase: {} });
  settingsModule.getPaymentsPaused = async () => false;
  apiUtilsModule.getSystemAdminClient = () => ({
    rpc: (fn: string, args: Record<string, unknown>) => {
      rpcCall = { fn, args };
      return Promise.resolve({
        data: {
          status: 'ok',
          credits: 12,
        },
        error: null,
      });
    },
  });

  t.after(() => {
    apiUtilsModule.requireUserContext = originalRequireUserContext;
    apiUtilsModule.getSystemAdminClient = originalGetSystemAdminClient;
    settingsModule.getPaymentsPaused = originalGetPaymentsPaused;
  });

  const { POST } = await import('../app/api/membership/purchase-credits/route');
  const response = await POST(new NextRequest('http://localhost/api/membership/purchase-credits', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ count: 1, amount: 9.9 }),
  }));
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(rpcCall?.fn, 'complete_credit_purchase_as_service');
  assert.equal(rpcCall?.args.p_user_id, 'user-1');
  assert.equal(rpcCall?.args.p_credit_count, 1);
  assert.equal(payload.credits, 12);
  assert.equal(payload.purchased, 1);
});

test('records import POST should call transactional RPC and return imported counts', async (t) => {
  const apiUtilsModule = require('../lib/api-utils') as any;
  const originalRequireUserContext = apiUtilsModule.requireUserContext;

  let rpcArgs: Record<string, unknown> | null = null;

  apiUtilsModule.requireUserContext = async () => ({
    supabase: {
      rpc: async (fn: string, args: Record<string, unknown>) => {
        assert.equal(fn, 'import_ming_records_and_notes');
        rpcArgs = args;
        return {
          data: {
            recordsImported: 2,
            notesImported: 1,
          },
          error: null,
        };
      },
    },
    user: { id: 'user-1' },
  });

  t.after(() => {
    apiUtilsModule.requireUserContext = originalRequireUserContext;
  });

  const payload = {
    version: '1.0.0',
    records: [
      { title: '记录 1', content: '内容 1' },
      { title: '记录 2', content: '内容 2' },
    ],
    notes: [
      { content: '小记 1' },
    ],
  };

  const { POST } = await import('../app/api/records/import/route');
  const response = await POST(new NextRequest('http://localhost/api/records/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(rpcArgs, {
    p_records: payload.records,
    p_notes: payload.notes,
  });
  assert.equal(body.recordsImported, 2);
  assert.equal(body.notesImported, 1);
});

test('records import POST should return 500 when transactional RPC fails', async (t) => {
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

  const { POST } = await import('../app/api/records/import/route');
  const response = await POST(new NextRequest('http://localhost/api/records/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      version: '1.0.0',
      records: [{ title: '记录 1' }],
      notes: [],
    }),
  }));
  const body = await response.json();

  assert.equal(response.status, 500);
  assert.equal(body.error, '导入数据失败');
});

test('performCheckin should use transactional rpc result', async (t) => {
  const apiUtilsModule = require('../lib/api-utils') as any;
  const originalGetSystemAdminClient = apiUtilsModule.getSystemAdminClient;

  let rpcCall: { fn: string; args: Record<string, unknown> } | null = null;

  apiUtilsModule.getSystemAdminClient = () => ({
    rpc: (fn: string, args: Record<string, unknown>) => {
      rpcCall = { fn, args };
      return Promise.resolve({
        data: {
          status: 'ok',
          streak_days: 7,
          reward_credits: 2,
          reward_xp: 10,
          leveled_up: true,
        },
        error: null,
      });
    },
  });

  t.after(() => {
    apiUtilsModule.getSystemAdminClient = originalGetSystemAdminClient;
  });

  const { performCheckin } = require('../lib/user/checkin') as typeof import('../lib/user/checkin');
  const result = await performCheckin('user-1');

  assert.equal(rpcCall?.fn, 'perform_daily_checkin_as_service');
  assert.deepEqual(rpcCall?.args, { p_user_id: 'user-1' });
  assert.deepEqual(result, {
    success: true,
    streakDays: 7,
    rewardCredits: 2,
    rewardXp: 10,
    leveledUp: true,
  });
});

test('addExperience should upsert final level state for a first-time user', async (t) => {
  const apiUtilsModule = require('../lib/api-utils') as any;
  const gamificationPath = require.resolve('../lib/user/gamification');
  const originalGetSystemAdminClient = apiUtilsModule.getSystemAdminClient;

  let selectCalls = 0;
  let upsertCall: { payload: Record<string, unknown>; options: Record<string, unknown> } | null = null;

  apiUtilsModule.getSystemAdminClient = () => ({
    from(table: string) {
      assert.equal(table, 'user_levels');
      return {
        select(columns: string) {
          assert.equal(columns, 'level, total_experience');
          return {
            eq(field: string, value: string) {
              assert.equal(field, 'user_id');
              assert.equal(value, 'user-1');
              return {
                maybeSingle: async () => {
                  selectCalls += 1;
                  return { data: null, error: null };
                },
              };
            },
          };
        },
        upsert(payload: Record<string, unknown>, options: Record<string, unknown>) {
          upsertCall = { payload, options };
          return Promise.resolve({ error: null });
        },
      };
    },
  });

  delete require.cache[gamificationPath];
  const { addExperience } = require('../lib/user/gamification') as typeof import('../lib/user/gamification');

  t.after(() => {
    apiUtilsModule.getSystemAdminClient = originalGetSystemAdminClient;
    delete require.cache[gamificationPath];
  });

  const result = await addExperience('user-1', 120, 'bonus');

  assert.equal(selectCalls, 1);
  assert.equal(upsertCall?.options.onConflict, 'user_id');
  assert.equal(upsertCall?.payload.user_id, 'user-1');
  assert.equal(upsertCall?.payload.level, 2);
  assert.equal(upsertCall?.payload.experience, 20);
  assert.equal(upsertCall?.payload.total_experience, 120);
  assert.equal(upsertCall?.payload.title, '见习者');
  assert.equal(result.leveledUp, true);
  assert.equal(result.newLevel, 2);
  assert.equal(result.newTitle, '见习者');
});

test('addExperience should keep existing rows on the single upsert path', async (t) => {
  const apiUtilsModule = require('../lib/api-utils') as any;
  const gamificationPath = require.resolve('../lib/user/gamification');
  const originalGetSystemAdminClient = apiUtilsModule.getSystemAdminClient;

  let upsertCall: { payload: Record<string, unknown>; options: Record<string, unknown> } | null = null;

  apiUtilsModule.getSystemAdminClient = () => ({
    from(table: string) {
      assert.equal(table, 'user_levels');
      return {
        select() {
          return {
            eq() {
              return {
                maybeSingle: async () => ({
                  data: {
                    level: 2,
                    total_experience: 120,
                  },
                  error: null,
                }),
              };
            },
          };
        },
        upsert(payload: Record<string, unknown>, options: Record<string, unknown>) {
          upsertCall = { payload, options };
          return Promise.resolve({ error: null });
        },
      };
    },
  });

  delete require.cache[gamificationPath];
  const { addExperience } = require('../lib/user/gamification') as typeof import('../lib/user/gamification');

  t.after(() => {
    apiUtilsModule.getSystemAdminClient = originalGetSystemAdminClient;
    delete require.cache[gamificationPath];
  });

  const result = await addExperience('user-1', 10, 'chat');

  assert.equal(upsertCall?.options.onConflict, 'user_id');
  assert.equal(upsertCall?.payload.level, 2);
  assert.equal(upsertCall?.payload.experience, 30);
  assert.equal(upsertCall?.payload.total_experience, 130);
  assert.equal(upsertCall?.payload.title, '见习者');
  assert.equal(result.leveledUp, false);
  assert.equal(result.newLevel, undefined);
  assert.equal(result.newTitle, undefined);
});

test('checkRateLimit should use transactional rpc result', async (t) => {
  const apiUtilsModule = require('../lib/api-utils') as any;
  const rateLimitPath = require.resolve('../lib/rate-limit');
  const originalGetSystemAdminClient = apiUtilsModule.getSystemAdminClient;

  let rpcCall: { fn: string; args: Record<string, unknown> } | null = null;

  apiUtilsModule.getSystemAdminClient = () => ({
    rpc(fn: string, args: Record<string, unknown>) {
      rpcCall = { fn, args };
      return Promise.resolve({
        data: {
          allowed: false,
          remaining: 0,
          reset_at: '2026-04-09T00:10:00.000Z',
        },
        error: null,
      });
    },
  });

  delete require.cache[rateLimitPath];
  const { checkRateLimit } = require('../lib/rate-limit') as typeof import('../lib/rate-limit');

  t.after(() => {
    apiUtilsModule.getSystemAdminClient = originalGetSystemAdminClient;
    delete require.cache[rateLimitPath];
  });

  const result = await checkRateLimit('127.0.0.1', '/api/chat/title', {
    maxRequests: 10,
    windowMs: 60_000,
  });

  assert.equal(rpcCall?.fn, 'consume_rate_limit_slot_as_admin');
  assert.deepEqual(rpcCall?.args, {
    p_identifier: '127.0.0.1',
    p_endpoint: '/api/chat/title',
    p_max_requests: 10,
    p_window_ms: 60_000,
  });
  assert.equal(result.allowed, false);
  assert.equal(result.remaining, 0);
  assert.equal(result.resetAt.toISOString(), '2026-04-09T00:10:00.000Z');
});

test('checkRateLimit should fail open when transactional rpc errors', async (t) => {
  const apiUtilsModule = require('../lib/api-utils') as any;
  const rateLimitPath = require.resolve('../lib/rate-limit');
  const originalGetSystemAdminClient = apiUtilsModule.getSystemAdminClient;

  apiUtilsModule.getSystemAdminClient = () => ({
    rpc() {
      return Promise.resolve({
        data: null,
        error: { message: 'rpc failed' },
      });
    },
  });

  delete require.cache[rateLimitPath];
  const { checkRateLimit } = require('../lib/rate-limit') as typeof import('../lib/rate-limit');

  t.after(() => {
    apiUtilsModule.getSystemAdminClient = originalGetSystemAdminClient;
    delete require.cache[rateLimitPath];
  });

  const result = await checkRateLimit('127.0.0.1', '/api/chat/title', {
    maxRequests: 10,
    windowMs: 60_000,
  });

  assert.equal(result.allowed, true);
  assert.equal(result.remaining, 10);
});

test('mbti history DELETE should delete through transactional rpc', async (t) => {
  const apiUtilsModule = require('../lib/api-utils') as any;
  const originalRequireBearerUser = apiUtilsModule.requireBearerUser;
  const originalGetSystemAdminClient = apiUtilsModule.getSystemAdminClient;

  let rpcCall: { fn: string; args: Record<string, unknown> } | null = null;

  apiUtilsModule.requireBearerUser = async () => ({ user: { id: 'user-1' } });
  apiUtilsModule.getSystemAdminClient = () => ({
    rpc: (fn: string, args: Record<string, unknown>) => {
      rpcCall = { fn, args };
      return Promise.resolve({ data: true, error: null });
    },
    from: () => {
      throw new Error('table fallback should not be used');
    },
  });

  t.after(() => {
    apiUtilsModule.requireBearerUser = originalRequireBearerUser;
    apiUtilsModule.getSystemAdminClient = originalGetSystemAdminClient;
  });

  const { DELETE } = await import('../app/api/mbti/history/route');
  const response = await DELETE(new NextRequest('http://localhost/api/mbti/history', {
    method: 'DELETE',
    headers: {
      Authorization: 'Bearer token',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id: 'mbti-1' }),
  }));
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(rpcCall?.fn, 'delete_mbti_history_item_and_conversation_as_service');
  assert.deepEqual(rpcCall?.args, {
    p_history_id: 'mbti-1',
    p_user_id: 'user-1',
  });
  assert.equal(payload.success, true);
});
