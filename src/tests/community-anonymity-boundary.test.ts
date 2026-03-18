import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

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

test('community detail routes should not expose raw author ids or anonymous mapping dependencies', async () => {
  const postRouteSource = await readFile(
    resolve(process.cwd(), 'src/app/api/community/posts/[id]/route.ts'),
    'utf-8',
  );
  const postsRouteSource = await readFile(
    resolve(process.cwd(), 'src/app/api/community/posts/route.ts'),
    'utf-8',
  );
  const commentRouteSource = await readFile(
    resolve(process.cwd(), 'src/app/api/community/comments/[id]/route.ts'),
    'utf-8',
  );
  const communityClientSource = await readFile(
    resolve(process.cwd(), 'src/lib/community.ts'),
    'utf-8',
  );
  const communityServerSource = await readFile(
    resolve(process.cwd(), 'src/lib/community-server.ts'),
    'utf-8',
  );

  assert.equal(
    postRouteSource.includes('authorId'),
    false,
    'post detail route should not expose post.user_id through authorId',
  );
  assert.equal(
    commentRouteSource.includes('authorId'),
    false,
    'comment detail route should not expose comment.user_id through authorId',
  );
  assert.equal(
    postRouteSource.includes('community_anonymous_mapping'),
    false,
    'post detail route should not depend on anonymous mapping table after removing anonymous mode',
  );
  assert.equal(
    commentRouteSource.includes('community_anonymous_mapping'),
    false,
    'comment create route should not depend on anonymous mapping table after removing anonymous mode',
  );
  assert.equal(
    communityClientSource.includes('author_name'),
    true,
    'community public client should expose author_name',
  );
  assert.equal(
    communityClientSource.includes('author_avatar_url'),
    true,
    'community public client should expose author_avatar_url',
  );
  assert.equal(
    communityClientSource.includes('anonymous_name'),
    false,
    'community public client should no longer expose anonymous_name',
  );
  assert.equal(
    communityServerSource.includes('anonymous_name'),
    false,
    'community server adapters should no longer model anonymous_name after anonymous mode removal',
  );
  assert.equal(
    postsRouteSource.includes('anonymous_name'),
    false,
    'community post create route should not keep writing anonymous_name after anonymous mode removal',
  );
});

test('community anonymity removal should drop the obsolete post anonymous_name column in a migration', async () => {
  const migrationSource = await readFile(
    resolve(process.cwd(), 'supabase/migrations/20260318_drop_community_posts_anonymous_name.sql'),
    'utf-8',
  );

  assert.match(migrationSource, /ALTER TABLE public\.community_posts/u);
  assert.match(migrationSource, /DROP COLUMN IF EXISTS anonymous_name/u);
});
