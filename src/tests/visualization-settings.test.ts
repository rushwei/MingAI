import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeVisualizationSettings,
  readLocalVisualizationSettings,
} from '../lib/visualization/settings';

test('normalizeVisualizationSettings should keep only valid dimensions and preferences', () => {
  const result = normalizeVisualizationSettings({
    selectedDimensions: ['career', 'wealth', 'bad-key', 1, 'career'],
    dayunDisplayCount: 6,
    chartStyle: 'classic-chinese',
  });

  assert.deepEqual(result, {
    selectedDimensions: ['career', 'wealth'],
    dayunDisplayCount: 6,
    chartStyle: 'classic-chinese',
  });
});

test('normalizeVisualizationSettings should discard malformed values instead of crashing', () => {
  const result = normalizeVisualizationSettings({
    selectedDimensions: { nope: true },
    dayunDisplayCount: 99,
    chartStyle: 'weird-style',
  });

  assert.equal(result, undefined);
});

test('readLocalVisualizationSettings should tolerate malformed local storage payloads', () => {
  const storage = {
    getItem(key: string) {
      if (key === 'fortuneDimensions') return '{"bad":true}';
      if (key === 'dayunPeriods') return 'abc';
      if (key === 'chartStyle') return 'javascript';
      return null;
    },
  };

  assert.equal(readLocalVisualizationSettings(storage), undefined);
});
