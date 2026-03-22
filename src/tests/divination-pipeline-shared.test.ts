import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';

import { ensureRouteTestEnv } from './helpers/route-mock';

ensureRouteTestEnv();

type MutableModule = Record<string, unknown>;

function createStreamResponse(lines: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const line of lines) {
        controller.enqueue(encoder.encode(line));
      }
      controller.close();
    },
  });
}

function setupPipelineMocks(t: TestContext) {
  const apiUtils = require('../lib/api-utils') as MutableModule;
  const credits = require('../lib/user/credits') as MutableModule;
  const aiAccess = require('../lib/ai/ai-access') as MutableModule;
  const aiModule = require('../lib/ai/ai') as MutableModule;
  const aiAnalysisModule = require('../lib/ai/ai-analysis') as MutableModule;

  const originals = {
    requireBearerUser: apiUtils.requireBearerUser,
    getUserAuthInfo: credits.getUserAuthInfo,
    useCredit: credits.useCredit,
    addCredits: credits.addCredits,
    resolveModelAccessAsync: aiAccess.resolveModelAccessAsync,
    callAIStream: aiModule.callAIStream,
    readAIStream: aiModule.readAIStream,
    createAIAnalysisConversation: aiAnalysisModule.createAIAnalysisConversation,
  };

  apiUtils.requireBearerUser = async () => ({
    user: { id: 'user-1' },
    supabase: {},
  });
  credits.getUserAuthInfo = async () => ({
    credits: 10,
    effectiveMembership: 'pro',
    hasCredits: true,
  });
  credits.useCredit = async () => 1;
  credits.addCredits = async () => 1;
  aiAccess.resolveModelAccessAsync = async () => ({
    modelId: 'test-model',
    modelConfig: {
      id: 'test-model',
      modelKey: 'test-model',
      vendor: 'test',
      usageType: 'chat',
      supportsReasoning: true,
      supportsVision: false,
      requiredTier: 'free',
    },
    reasoningEnabled: false,
  });
  aiModule.callAIStream = async () => createStreamResponse([
    'data: {"choices":[{"delta":{"content":"analysis","reasoning_content":"reason"}}]}\n\n',
    'data: [DONE]\n\n',
  ]);
  aiModule.readAIStream = async () => ({
    content: 'analysis',
    reasoning: 'reason',
  });

  const createCalls: Array<Record<string, unknown>> = [];
  aiAnalysisModule.createAIAnalysisConversation = async (args: Record<string, unknown>) => {
    createCalls.push(args);
    return 'conv-1';
  };

  const pipelinePath = require.resolve('../lib/api/divination-pipeline');
  delete require.cache[pipelinePath];

  t.after(() => {
    apiUtils.requireBearerUser = originals.requireBearerUser;
    credits.getUserAuthInfo = originals.getUserAuthInfo;
    credits.useCredit = originals.useCredit;
    credits.addCredits = originals.addCredits;
    aiAccess.resolveModelAccessAsync = originals.resolveModelAccessAsync;
    aiModule.callAIStream = originals.callAIStream;
    aiModule.readAIStream = originals.readAIStream;
    aiAnalysisModule.createAIAnalysisConversation = originals.createAIAnalysisConversation;
    delete require.cache[pipelinePath];
  });

  return {
    apiUtils,
    credits,
    aiModule,
    aiAnalysisModule,
    createCalls,
    loadPipeline: () => {
      delete require.cache[pipelinePath];
      return require('../lib/api/divination-pipeline') as typeof import('../lib/api/divination-pipeline');
    },
  };
}

function createTestRequest() {
  return new NextRequest('http://localhost/api/test-divination', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer test-token',
    },
  });
}

function createTestHandler(
  createInterpretHandler: typeof import('../lib/api/divination-pipeline').createInterpretHandler,
  persistRecord?: (input: Record<string, unknown>, userId: string, conversationId: string | null) => Promise<void>,
) {
  return createInterpretHandler<Record<string, unknown>>({
    sourceType: 'test_divination',
    tag: 'test-divination',
    parseInput: (body) => (body ?? {}) as Record<string, unknown>,
    buildPrompts: () => ({
      systemPrompt: 'system prompt',
      userPrompt: 'user prompt',
    }),
    buildSourceData: (input, modelId, reasoningEnabled) => ({
      inputId: input.id ?? null,
      modelId,
      reasoningEnabled,
    }),
    generateTitle: () => 'Shared Pipeline Test',
    persistRecord,
  });
}

test('divination pipeline returns 500 when credit deduction fails', async (t) => {
  const { credits, loadPipeline } = setupPipelineMocks(t);
  credits.useCredit = async () => null;

  const { createInterpretHandler } = loadPipeline();
  const handler = createTestHandler(createInterpretHandler);

  const response = await handler(createTestRequest(), { action: 'interpret' });
  const payload = await response.json();

  assert.equal(response.status, 500);
  assert.equal(payload.error, '积分扣减失败，请稍后重试');
});

test('divination pipeline persists streamed analysis and calls persistRecord after completion', async (t) => {
  const { createCalls, loadPipeline } = setupPipelineMocks(t);
  const persistCalls: Array<{ input: Record<string, unknown>; userId: string; conversationId: string | null }> = [];

  const { createInterpretHandler } = loadPipeline();
  const handler = createTestHandler(createInterpretHandler, async (input, userId, conversationId) => {
    persistCalls.push({ input, userId, conversationId });
  });

  const response = await handler(createTestRequest(), { action: 'interpret', id: 'input-1', stream: true });
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.match(body, /"content":"analysis"/u);
  assert.ok(createCalls[0], 'createAIAnalysisConversation should be called');
  assert.equal(createCalls[0]?.sourceType, 'test_divination');
  assert.equal(createCalls[0]?.aiResponse, 'analysis');
  assert.equal((createCalls[0]?.sourceData as Record<string, unknown>)?.reasoning_text, 'reason');
  assert.deepEqual(persistCalls, [
    {
      input: { action: 'interpret', id: 'input-1', stream: true },
      userId: 'user-1',
      conversationId: 'conv-1',
    },
  ]);
});

test('divination pipeline surfaces an SSE error when stream persistence fails after content generation', async (t) => {
  const { loadPipeline } = setupPipelineMocks(t);
  const originalConsoleError = console.error;
  console.error = () => {};
  t.after(() => {
    console.error = originalConsoleError;
  });

  const { createInterpretHandler } = loadPipeline();
  const handler = createTestHandler(createInterpretHandler, async () => {
    throw new Error('persist failed');
  });

  const response = await handler(createTestRequest(), { action: 'interpret', stream: true });
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.match(body, /"content":"analysis"/u);
  assert.match(body, /"error":"保存结果失败，请稍后重试"/u);
  assert.match(body, /\[DONE\]/u);
});
