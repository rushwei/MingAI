import test from 'node:test';
import assert from 'node:assert/strict';

import { DATA_SOURCE_TYPES } from '../lib/data-sources/manifest';
import {
  ARCHIVED_SOURCE_TYPES,
  CONVERSATION_SOURCE_TYPES,
  normalizeConversationSourceType,
  toFeatureUsageBucket,
} from '../lib/source-contracts';

test('conversation source registry should preserve qimen and daliuren across read/write contracts', () => {
  assert.equal(CONVERSATION_SOURCE_TYPES.includes('qimen'), true);
  assert.equal(CONVERSATION_SOURCE_TYPES.includes('daliuren'), true);
  assert.equal(normalizeConversationSourceType('qimen'), 'qimen');
  assert.equal(normalizeConversationSourceType('daliuren'), 'daliuren');
  assert.equal(toFeatureUsageBucket('qimen'), 'qimen');
  assert.equal(toFeatureUsageBucket('daliuren'), 'daliuren');
});

test('archived source registry should stay aligned with current data-source manifest additions', () => {
  for (const sourceType of ['qimen_chart', 'daliuren_divination'] as const) {
    assert.equal(DATA_SOURCE_TYPES.includes(sourceType), true, `${sourceType} should be a supported data source`);
    assert.equal(ARCHIVED_SOURCE_TYPES.includes(sourceType), true, `${sourceType} should be storable in archived_sources`);
  }
});
