import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeConversationWindowTargetCount,
  resolveConversationViewportTargetCount,
} from '../lib/chat/conversation-list-window';

test('normalizeConversationWindowTargetCount keeps the larger loaded or requested window', () => {
  assert.equal(normalizeConversationWindowTargetCount({
    loadedCount: 7,
    requestedCount: 21,
  }), 21);

  assert.equal(normalizeConversationWindowTargetCount({
    loadedCount: 14,
    requestedCount: 7,
  }), 14);

  assert.equal(normalizeConversationWindowTargetCount({
    loadedCount: 0,
    requestedCount: 0,
  }), 7);
});

test('resolveConversationViewportTargetCount rounds visible rows up to a page-sized target', () => {
  assert.equal(resolveConversationViewportTargetCount({
    viewportHeight: 360,
    estimatedRowHeight: 48,
    bufferRows: 2,
    minimumCount: 7,
    pageSize: 7,
  }), 14);

  assert.equal(resolveConversationViewportTargetCount({
    viewportHeight: 720,
    estimatedRowHeight: 48,
    bufferRows: 2,
    minimumCount: 7,
    pageSize: 7,
  }), 21);
});
