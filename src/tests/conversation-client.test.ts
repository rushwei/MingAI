import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type FetchLike = typeof global.fetch;

test('loadConversation should return an explicit error for non-404 responses', async () => {
  const originalFetch = global.fetch;

  global.fetch = (async () => new Response(JSON.stringify({
    error: '认证失败',
  }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  })) as FetchLike;

  try {
    const { loadConversation } = await import('../lib/chat/conversation');
    const result = await loadConversation('conv-1');

    assert.deepEqual(result, {
      ok: false,
      notFound: false,
      error: '认证失败',
    });
  } finally {
    global.fetch = originalFetch;
  }
});

test('loadConversation should return an explicit error when the request throws', async () => {
  const originalFetch = global.fetch;

  global.fetch = (async () => {
    throw new Error('网络异常');
  }) as FetchLike;

  try {
    const { loadConversation } = await import('../lib/chat/conversation');
    const result = await loadConversation('conv-2');

    assert.deepEqual(result, {
      ok: false,
      notFound: false,
      error: '网络异常',
    });
  } finally {
    global.fetch = originalFetch;
  }
});

test('loadConversations should map paginated list payloads through the browser api boundary', async () => {
  const originalFetch = global.fetch;

  global.fetch = (async (input: RequestInfo | URL) => {
    assert.equal(String(input), '/api/conversations?limit=2&offset=4');
    return new Response(JSON.stringify({
      conversations: [{
        id: 'conv-1',
        user_id: 'user-1',
        personality: 'general',
        title: '测试对话',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-02T00:00:00.000Z',
        source_type: null,
        question_preview: '最近怎么样？',
        is_archived: false,
        archived_kb_ids: ['kb-1'],
      }],
      pagination: {
        hasMore: true,
        nextOffset: 6,
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as FetchLike;

  try {
    const { loadConversations } = await import('../lib/chat/conversation');
    const result = await loadConversations({
      limit: 2,
      offset: 4,
    });

    assert.deepEqual(result, {
      conversations: [{
        id: 'conv-1',
        userId: 'user-1',
        personality: 'general',
        title: '测试对话',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
        sourceType: 'chat',
        questionPreview: '最近怎么样？',
        isArchived: false,
        archivedKbIds: ['kb-1'],
      }],
      pagination: {
        hasMore: true,
        nextOffset: 6,
      },
    });
  } finally {
    global.fetch = originalFetch;
  }
});

test('loadConversations should preserve AbortError from the browser api boundary', async () => {
  const originalFetch = global.fetch;

  global.fetch = (async () => {
    throw new DOMException('aborted', 'AbortError');
  }) as FetchLike;

  try {
    const { loadConversations } = await import('../lib/chat/conversation');

    await assert.rejects(
      () => loadConversations({ signal: new AbortController().signal }),
      (error: unknown) => {
        assert.ok(error instanceof DOMException);
        assert.equal(error.name, 'AbortError');
        return true;
      },
    );
  } finally {
    global.fetch = originalFetch;
  }
});

test('chat state clears active conversation state only after delete succeeds', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/lib/chat/use-chat-state.ts'), 'utf8');
  const contextSource = readFileSync(resolve(process.cwd(), 'src/lib/chat/ConversationListContext.tsx'), 'utf8');

  assert.match(
    source,
    /const success = await convList\.handleDeleteConversation\(id\);[\s\S]*if \(!success\) \{\s*return;\s*\}[\s\S]*resetDeletedConversationState\(id\);/u,
  );
  assert.match(
    contextSource,
    /window\.dispatchEvent\(new CustomEvent\(CHAT_CONVERSATION_DELETED_EVENT,/u,
  );
  assert.match(
    contextSource,
    /window\.addEventListener\(HISTORY_SUMMARY_DELETED_EVENT,/u,
  );
  assert.match(
    contextSource,
    /window\.addEventListener\(KNOWLEDGE_BASE_SYNC_EVENT,/u,
  );
});

test('chat state updates cached conversation detail title only after rename succeeds', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/lib/chat/use-chat-state.ts'), 'utf8');

  assert.match(
    source,
    /const success = await convList\.handleRenameConversation\(id, title\);[\s\S]*if \(!success\) \{\s*return;\s*\}[\s\S]*conversationDetailsRef\.current\.set\(id,/u,
  );
});

test('chat state clears the URL when deleting the active conversation or removing id from the address bar', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/lib/chat/use-chat-state.ts'), 'utf8');

  assert.match(
    source,
    /if \(!targetConversationId\) \{[\s\S]*if \(activeConversationIdRef\.current !== null\) \{[\s\S]*void handleNewChat\(\);/u,
  );
  assert.match(
    source,
    /if \(searchParams\.get\('id'\) === conversationId\) \{[\s\S]*router\.replace\('\/chat'\);/u,
  );
  assert.match(
    source,
    /window\.addEventListener\(CHAT_CONVERSATION_DELETED_EVENT, handler as EventListener\)/u,
  );
});

test('chat state no longer caches running task snapshots as canonical conversation detail', () => {
  const stateSource = readFileSync(resolve(process.cwd(), 'src/lib/chat/use-chat-state.ts'), 'utf8');
  const messagingSource = readFileSync(resolve(process.cwd(), 'src/lib/chat/use-chat-messaging.ts'), 'utf8');

  assert.doesNotMatch(
    stateSource,
    /getTaskMessages\(id\)[\s\S]*cacheConversationMessages\(id, runningMessages\)/u,
  );
  assert.match(
    messagingSource,
    /const shouldCachePersistedMessages = event\.type === 'task_completed'[\s\S]*event\.errorCode !== 'PERSIST_FAILED'/u,
  );
  assert.doesNotMatch(
    messagingSource,
    /mingai:knowledge-base:ingested/u,
  );
});
