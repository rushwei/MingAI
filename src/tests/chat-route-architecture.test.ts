import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const routePath = resolve(process.cwd(), 'src/app/api/chat/route.ts');
const requestModulePath = resolve(process.cwd(), 'src/lib/server/chat/request.ts');
const promptContextModulePath = resolve(process.cwd(), 'src/lib/server/chat/prompt-context.ts');
const streamResponsePath = resolve(process.cwd(), 'src/lib/server/chat/stream-response.ts');

test('chat route should delegate request and prompt assembly to server-only chat modules', async () => {
  assert.equal(existsSync(requestModulePath), true, 'chat request server module should exist');
  assert.equal(existsSync(promptContextModulePath), true, 'chat prompt-context server module should exist');
  assert.equal(existsSync(streamResponsePath), true, 'chat stream response module should exist');

  const [routeSource, requestSource, promptContextSource, streamResponseSource] = await Promise.all([
    readFile(routePath, 'utf-8'),
    readFile(requestModulePath, 'utf-8'),
    readFile(promptContextModulePath, 'utf-8'),
    readFile(streamResponsePath, 'utf-8'),
  ]);

  assert.equal(
    routeSource.includes("from '@/lib/server/chat/request'"),
    true,
    'chat route should import the chat request module'
  );
  assert.equal(
    routeSource.includes("from '@/lib/server/chat/stream-response'"),
    true,
    'chat route should keep stream wrapping in a dedicated server-only module'
  );
  assert.equal(
    requestSource.includes("from '@/lib/server/chat/prompt-context'"),
    true,
    'chat request module should delegate prompt assembly'
  );
  assert.equal(
    requestSource.includes("import 'server-only'"),
    true,
    'chat request module must be server-only'
  );
  assert.equal(
    promptContextSource.includes("import 'server-only'"),
    true,
    'chat prompt context module must be server-only'
  );
  assert.equal(
    streamResponseSource.includes('createChatStreamResponse'),
    true,
    'chat stream response module should keep first-token billing isolated from the route'
  );
});
