import test from 'node:test';
import assert from 'node:assert/strict';

type CreditModule = typeof import('../lib/user/credits');

test('chat stream response should cancel upstream when credit deduction fails', async (t) => {
  const creditsModule = require('../lib/user/credits') as CreditModule;
  const originalUseCredit = creditsModule.useCredit;

  let cancelCalled = false;
  const encoder = new TextEncoder();
  const upstream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"hi"}}]}\n\n'));
    },
    cancel() {
      cancelCalled = true;
    },
  });

  creditsModule.useCredit = async () => null;

  t.after(() => {
    creditsModule.useCredit = originalUseCredit;
  });

  const { createChatStreamResponse } = require('../lib/server/chat/stream-response') as typeof import('../lib/server/chat/stream-response');

  const response = createChatStreamResponse({
    streamBody: upstream,
    metadata: {},
    userId: 'user-1',
    canSkipCredit: false,
  });

  await response.text().catch(() => undefined);
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(cancelCalled, true);
});

test('chat stream response should cancel upstream when client cancels', async (t) => {
  const creditsModule = require('../lib/user/credits') as CreditModule;
  const originalUseCredit = creditsModule.useCredit;
  const originalConsoleError = console.error;
  const errors: unknown[] = [];

  let cancelCalled = false;
  const encoder = new TextEncoder();
  const upstream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"hi"}}]}\n\n'));
    },
    cancel() {
      cancelCalled = true;
    },
  });

  creditsModule.useCredit = async () => 1;

  t.after(() => {
    creditsModule.useCredit = originalUseCredit;
    console.error = originalConsoleError;
  });

  console.error = (...args: unknown[]) => {
    errors.push(args);
  };

  const { createChatStreamResponse } = require('../lib/server/chat/stream-response') as typeof import('../lib/server/chat/stream-response');

  const response = createChatStreamResponse({
    streamBody: upstream,
    metadata: {},
    userId: 'user-1',
    canSkipCredit: false,
  });

  const reader = response.body?.getReader();
  await reader?.read();
  await reader?.cancel();
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(cancelCalled, true);
  assert.equal(errors.length, 0);
});
