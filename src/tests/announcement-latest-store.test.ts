import test from 'node:test';
import assert from 'node:assert/strict';

test('latest announcement store should reuse inflight requests and cache the result', async () => {
  const originalFetch = global.fetch;
  let fetchCount = 0;

  global.fetch = async () => {
    fetchCount += 1;
    return new Response(JSON.stringify({
      announcement: {
        id: 'announcement-1',
        content: '最新公告',
        publishedAt: '2026-03-29T00:00:00.000Z',
        createdAt: '2026-03-29T00:00:00.000Z',
        updatedAt: '2026-03-29T00:00:00.000Z',
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }) as Response;
  };

  try {
    const {
      loadLatestAnnouncement,
      resetLatestAnnouncementStoreForTests,
    } = await import('../lib/announcement-latest-store');

    resetLatestAnnouncementStoreForTests();
    const [first, second] = await Promise.all([
      loadLatestAnnouncement(),
      loadLatestAnnouncement(),
    ]);
    const third = await loadLatestAnnouncement();

    assert.equal(fetchCount, 1);
    assert.equal(first?.id, 'announcement-1');
    assert.equal(second?.id, 'announcement-1');
    assert.equal(third?.id, 'announcement-1');
  } finally {
    global.fetch = originalFetch;
  }
});
