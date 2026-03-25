import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  resolveAnnouncementEditorStateAfterLoad,
  type AnnouncementEditorState,
} from '../lib/announcement-admin-view';
import type { Announcement } from '../lib/announcement';

const announcementList: Announcement[] = [
  {
    id: 'announcement-1',
    title: '已存在公告',
    content: '内容',
    ctaLabel: null,
    ctaHref: null,
    status: 'published',
    priority: 'normal',
    displayOrder: 0,
    startsAt: null,
    endsAt: null,
    popupEnabled: true,
    audienceScope: 'all_visitors',
    version: 1,
    publishedAt: '2026-03-23T00:00:00.000Z',
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    createdAt: '2026-03-23T00:00:00.000Z',
    updatedAt: '2026-03-23T00:00:00.000Z',
  },
];

test('resolveAnnouncementEditorStateAfterLoad should preserve explicit create mode', () => {
  const currentState: AnnouncementEditorState = {
    mode: 'create',
    selectedId: null,
  };

  const next = resolveAnnouncementEditorStateAfterLoad(currentState, announcementList);

  assert.deepEqual(next, currentState);
});

test('resolveAnnouncementEditorStateAfterLoad should keep selected existing announcement when still present', () => {
  const currentState: AnnouncementEditorState = {
    mode: 'edit',
    selectedId: 'announcement-1',
  };

  const next = resolveAnnouncementEditorStateAfterLoad(currentState, announcementList);

  assert.deepEqual(next, currentState);
});

test('resolveAnnouncementEditorStateAfterLoad should prioritize an explicit saved selection over stale create mode', () => {
  const currentState: AnnouncementEditorState = {
    mode: 'create',
    selectedId: null,
  };

  const next = resolveAnnouncementEditorStateAfterLoad(
    currentState,
    announcementList,
    { mode: 'edit', selectedId: 'announcement-1' },
  );

  assert.deepEqual(next, {
    mode: 'edit',
    selectedId: 'announcement-1',
  });
});
