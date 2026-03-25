import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildAnnouncementLocalStateKey,
  getAnnouncementDismissState,
  shouldApplyAnnouncementLoadResult,
  resolveAnnouncementViewerScope,
  shouldSuppressAnnouncement,
  type AnnouncementDismissState,
} from '../lib/announcement';

test('buildAnnouncementLocalStateKey should include announcement id and version', () => {
  assert.equal(
    buildAnnouncementLocalStateKey('announcement-1', 4, null),
    'mingai:announcement:visitor:announcement-1:v4',
  );
});

test('buildAnnouncementLocalStateKey should scope signed-in local state to the current user', () => {
  assert.equal(
    buildAnnouncementLocalStateKey('announcement-1', 4, 'user-1'),
    'mingai:announcement:user-1:announcement-1:v4',
  );
});

test('resolveAnnouncementViewerScope should wait until auth bootstrap finishes', () => {
  assert.equal(resolveAnnouncementViewerScope('user-1', true), undefined);
  assert.equal(resolveAnnouncementViewerScope('user-1', false), 'user-1');
  assert.equal(resolveAnnouncementViewerScope(null, false), null);
});

test('shouldApplyAnnouncementLoadResult should reject stale or admin-route popup responses', () => {
  assert.equal(
    shouldApplyAnnouncementLoadResult({
      pathname: '/admin/announcements',
      requestId: 2,
      currentRequestId: 2,
      viewerScope: 'user-1',
    }),
    false,
  );

  assert.equal(
    shouldApplyAnnouncementLoadResult({
      pathname: '/chat',
      requestId: 2,
      currentRequestId: 3,
      viewerScope: 'user-1',
    }),
    false,
  );

  assert.equal(
    shouldApplyAnnouncementLoadResult({
      pathname: '/chat',
      requestId: 3,
      currentRequestId: 3,
      viewerScope: 'user-1',
    }),
    true,
  );
});

test('shouldSuppressAnnouncement should treat permanent dismiss as highest priority', () => {
  const state: AnnouncementDismissState = {
    dismissedUntil: '2026-03-23T15:59:59.999Z',
    dismissedPermanentlyAt: '2026-03-23T01:00:00.000Z',
  };

  assert.equal(
    shouldSuppressAnnouncement(state, '2026-03-23T02:00:00.000Z'),
    true,
  );
});

test('shouldSuppressAnnouncement should treat future today-dismiss window as suppressed', () => {
  assert.equal(
    shouldSuppressAnnouncement(
      { dismissedUntil: '2026-03-23T15:59:59.999Z' },
      '2026-03-23T10:00:00.000Z',
    ),
    true,
  );

  assert.equal(
    shouldSuppressAnnouncement(
      { dismissedUntil: '2026-03-23T15:59:59.999Z' },
      '2026-03-23T16:00:00.000Z',
    ),
    false,
  );
});

test('getAnnouncementDismissState should normalize unknown local payloads', () => {
  assert.deepEqual(getAnnouncementDismissState(null), {});
  assert.deepEqual(getAnnouncementDismissState({ dismissedUntil: 123 }), {});
  assert.deepEqual(
    getAnnouncementDismissState({
      dismissedUntil: '2026-03-23T15:59:59.999Z',
      dismissedPermanentlyAt: '2026-03-23T01:00:00.000Z',
    }),
    {
      dismissedUntil: '2026-03-23T15:59:59.999Z',
      dismissedPermanentlyAt: '2026-03-23T01:00:00.000Z',
    },
  );
});
