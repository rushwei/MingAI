import test from 'node:test';
import assert from 'node:assert/strict';

test('latest announcement loader should return the latest announcement payload', async () => {
  const originalFetch = global.fetch;

  global.fetch = async () => new Response(JSON.stringify({
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

  try {
    const { loadLatestAnnouncement } = await import('../lib/announcement-client');
    const announcement = await loadLatestAnnouncement();

    assert.equal(announcement?.id, 'announcement-1');
    assert.equal(announcement?.content, '最新公告');
  } finally {
    global.fetch = originalFetch;
  }
});

test('latest announcement loader should throw on failed responses', async () => {
  const originalFetch = global.fetch;

  global.fetch = async () => new Response(JSON.stringify({ error: '获取公告失败' }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' },
  }) as Response;

  try {
    const { loadLatestAnnouncement } = await import('../lib/announcement-client');
    await assert.rejects(() => loadLatestAnnouncement(), /获取公告失败/u);
  } finally {
    global.fetch = originalFetch;
  }
});
