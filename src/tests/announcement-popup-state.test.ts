import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
    getAnnouncementCenterLocalState,
    getEndOfLocalDayIso,
    getAnnouncementPromptIdentity,
    shouldPromptLatestAnnouncement,
} from '../lib/announcement';

test('getAnnouncementCenterLocalState should normalize unknown local payloads', () => {
  assert.deepEqual(getAnnouncementCenterLocalState(null), {});
  assert.deepEqual(getAnnouncementCenterLocalState({ latestPublishedAt: 123 }), {});
  assert.deepEqual(
    getAnnouncementCenterLocalState({
      latestPublishedAt: '2026-03-28T10:00:00.000Z',
      dismissedUntil: '2026-03-28T15:59:59.999Z',
    }),
    {
      latestPublishedAt: '2026-03-28T10:00:00.000Z',
      dismissedUntil: '2026-03-28T15:59:59.999Z',
    },
  );
});

test('shouldPromptLatestAnnouncement should prompt when latest announcement changes', () => {
    assert.equal(
        shouldPromptLatestAnnouncement({
            announcementKey: 'announcement-1:2026-03-28T10:00:00.000Z',
            state: {
                latestAnnouncementKey: 'announcement-1:2026-03-27T10:00:00.000Z',
                dismissedUntil: '2026-03-28T15:59:59.999Z',
            },
        }),
    true,
  );
});

test('shouldPromptLatestAnnouncement should suppress prompting for the same latest announcement until dismissed window ends', () => {
    assert.equal(
        shouldPromptLatestAnnouncement({
            announcementKey: 'announcement-1:2026-03-28T10:00:00.000Z',
            state: {
                latestAnnouncementKey: 'announcement-1:2026-03-28T10:00:00.000Z',
                dismissedUntil: '2026-03-28T15:59:59.999Z',
            },
            nowIso: '2026-03-28T12:00:00.000Z',
    }),
    false,
  );

  assert.equal(
    shouldPromptLatestAnnouncement({
      announcementKey: 'announcement-1:2026-03-28T10:00:00.000Z',
      state: {
        latestAnnouncementKey: 'announcement-1:2026-03-28T10:00:00.000Z',
        dismissedUntil: '2026-03-28T15:59:59.999Z',
      },
      nowIso: '2026-03-28T16:00:00.000Z',
    }),
    true,
  );
});

test('getEndOfLocalDayIso should return the end of the local day', () => {
  const result = getEndOfLocalDayIso(new Date('2026-03-28T08:12:34.000+08:00'));
  assert.equal(result, '2026-03-28T15:59:59.999Z');
});

test('getAnnouncementPromptIdentity should change when latest announcement content revision updates updatedAt', () => {
  assert.equal(
    getAnnouncementPromptIdentity({
      id: 'announcement-1',
      publishedAt: '2026-03-28T10:00:00.000Z',
      updatedAt: '2026-03-28T12:00:00.000Z',
    }),
    'announcement-1:2026-03-28T12:00:00.000Z',
  );
});
