import test from 'node:test';
import assert from 'node:assert/strict';

test('community client ownership helpers should rely on viewer flags instead of author ids', async () => {
  const originalFetch = global.fetch;

  global.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);

    if (url.includes('/api/community/posts/post-1')) {
      return new Response(JSON.stringify({
        viewer: { isAuthor: true },
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (url.includes('/api/community/comments/comment-1')) {
      return new Response(JSON.stringify({
        viewer: { isAuthor: false },
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    throw new Error(`Unexpected fetch: ${url}`);
  }) as typeof global.fetch;

  try {
    const communityModule = await import('../lib/community');

    assert.equal(await communityModule.isPostAuthor('post-1', 'user-1'), true);
    assert.equal(await communityModule.isCommentAuthor('comment-1', 'user-1'), false);
  } finally {
    global.fetch = originalFetch;
  }
});
