import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { createPost, getPost, getPosts } from '../lib/community';

type MockResponseInit = {
  ok: boolean;
  status: number;
  statusText?: string;
  body: unknown;
};

function createMockResponse(init: MockResponseInit): Response {
  return {
    ok: init.ok,
    status: init.status,
    statusText: init.statusText ?? '',
    json: async () => init.body,
  } as Response;
}

test('community client reads post list through browser api payload normalization', async (t) => {
  const originalFetch = global.fetch;
  global.fetch = (async () => createMockResponse({
    ok: true,
    status: 200,
    body: {
      posts: [{
        id: 'post-1',
        author_name: '命理爱好者',
        author_avatar_url: null,
        title: '标题',
        content: '内容',
        category: 'general',
        tags: [],
        view_count: 0,
        upvote_count: 0,
        downvote_count: 0,
        comment_count: 0,
        is_pinned: false,
        is_featured: false,
        is_deleted: false,
        created_at: '2026-04-11T00:00:00.000Z',
        updated_at: '2026-04-11T00:00:00.000Z',
      }],
      total: 1,
    },
  })) as typeof fetch;

  t.after(() => {
    global.fetch = originalFetch;
  });

  const result = await getPosts({ sortBy: 'latest' }, 1, 10);
  assert.equal(result.total, 1);
  assert.equal(result.posts.length, 1);
  assert.equal(result.posts[0]?.id, 'post-1');
});

test('community client returns null for 404 post detail responses', async (t) => {
  const originalFetch = global.fetch;
  global.fetch = (async () => createMockResponse({
    ok: false,
    status: 404,
    statusText: 'Not Found',
    body: { error: '帖子不存在' },
  })) as typeof fetch;

  t.after(() => {
    global.fetch = originalFetch;
  });

  const result = await getPost('missing-post');
  assert.equal(result, null);
});

test('community client surfaces browser api error messages for writes', async (t) => {
  const originalFetch = global.fetch;
  global.fetch = (async () => createMockResponse({
    ok: false,
    status: 401,
    statusText: 'Unauthorized',
    body: { error: '认证失败' },
  })) as typeof fetch;

  t.after(() => {
    global.fetch = originalFetch;
  });

  await assert.rejects(
    () => createPost({ title: '标题', content: '内容', category: 'general' }),
    /认证失败/,
  );
});

test('community post detail auth keeps logged-in user state separate from admin access failures', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/app/community/[postId]/page.tsx'), 'utf8');

  assert.equal(source.includes("console.error('获取社区管理员状态失败:'"), true);
  assert.equal(source.includes("console.error('获取社区登录态失败:'"), true);
  assert.equal(source.includes("showToast('error', error instanceof Error ? error.message : '管理员权限获取失败')"), true);
  assert.equal(source.includes("showToast('error', error instanceof Error ? error.message : '认证状态获取失败')"), true);
  assert.equal(source.match(/setUser\(null\);/g)?.length ?? 0, 1);
});
