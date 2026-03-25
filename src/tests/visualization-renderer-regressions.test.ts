import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shouldResetChartError } from '../components/visualization/ChartRenderer';
import { getDreamSentimentLabel } from '../components/visualization/charts/DreamAssociation';

test('chart renderer should reset error boundary when payload identity changes', () => {
  const firstPayload = { chartType: 'fortune_radar', title: 'A' };
  const secondPayload = { chartType: 'fortune_radar', title: 'B' };

  assert.equal(shouldResetChartError(firstPayload, firstPayload), false);
  assert.equal(shouldResetChartError(firstPayload, secondPayload), true);
});

test('dream association legend labels should map sentiment keys correctly', () => {
  assert.equal(getDreamSentimentLabel('positive'), '积极');
  assert.equal(getDreamSentimentLabel('negative'), '消极');
  assert.equal(getDreamSentimentLabel('neutral'), '中性');
});
