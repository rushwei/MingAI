import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  syncVisualizationPreferencesAfterSave,
} from '../lib/user/ai-settings-local-sync';

test('syncVisualizationPreferencesAfterSave should not mutate local storage when save fails', () => {
  const writes: Array<{ key: string; value: string }> = [];
  const storage = {
    setItem(key: string, value: string) {
      writes.push({ key, value });
    },
  };

  const synced = syncVisualizationPreferencesAfterSave(
    storage,
    {
      selectedDimensions: ['career', 'wealth'],
      dayunDisplayCount: 6,
      chartStyle: 'classic-chinese',
    },
    null,
  );

  assert.equal(synced, false);
  assert.deepEqual(writes, []);
});

test('syncVisualizationPreferencesAfterSave should persist local storage when save succeeds', () => {
  const writes: Array<{ key: string; value: string }> = [];
  const storage = {
    setItem(key: string, value: string) {
      writes.push({ key, value });
    },
  };

  const synced = syncVisualizationPreferencesAfterSave(
    storage,
    {
      selectedDimensions: ['career', 'wealth'],
      dayunDisplayCount: 6,
      chartStyle: 'classic-chinese',
    },
    { expressionStyle: 'direct' },
  );

  assert.equal(synced, true);
  assert.deepEqual(writes, [
    { key: 'fortuneDimensions', value: '["career","wealth"]' },
    { key: 'dayunPeriods', value: '6' },
    { key: 'chartStyle', value: 'classic-chinese' },
  ]);
});
