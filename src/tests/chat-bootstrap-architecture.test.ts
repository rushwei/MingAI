// Architecture guard: ensures chat bootstrap module boundaries are maintained.
// If this test fails after refactoring, update assertions to match new structure.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function read(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

test('chat page should load bootstrap state through a dedicated hook', () => {
  const content = read('src/app/chat/page.tsx');

  assert.equal(content.includes('useChatBootstrap'), true);
  assert.equal(content.includes('getMembershipInfo('), false);
  assert.equal(content.includes('getCurrentUserProfileBundle('), false);
  assert.equal(content.includes("fetch('/api/knowledge-base'"), false);
});

test('chat api route should delegate orchestration to server helpers', () => {
  const content = read('src/app/api/chat/route.ts');

  assert.equal(content.includes("from('user_settings')"), false);
  assert.equal(content.includes("from('knowledge_bases')"), false);
  assert.equal(content.includes('prepareChatRequest('), true);
  assert.equal(content.includes('createChatStreamResponse('), true);
});
