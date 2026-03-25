import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shouldResetChartError } from '../components/visualization/ChartRenderer';
import { buildLifeFortuneTrendSeries } from '../components/visualization/charts/LifeFortuneTrend';
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

test('life fortune trend builder should ignore invalid boundaries and dedupe valid ones', () => {
  const result = buildLifeFortuneTrendSeries({
    chartType: 'life_fortune_trend',
    title: '大运趋势',
    data: {
      currentAge: Number.NaN,
      currentYear: 2026,
      periods: [
        {
          label: '无效边界',
          startAge: Number.NaN,
          endAge: 39,
          startYear: Number.NaN,
          endYear: 2030,
          scores: { career: 80 },
          summary: '',
          highlights: [],
          warnings: [],
        },
        {
          label: '第一阶段',
          startAge: 40,
          endAge: 49,
          startYear: 2031,
          endYear: 2040,
          scores: { career: 60 },
          summary: '平稳推进',
          highlights: [],
          warnings: [],
        },
        {
          label: '重复边界',
          startAge: 40,
          endAge: 59,
          startYear: 2041,
          endYear: 2050,
          scores: { career: 70 },
          summary: '再次起势',
          highlights: [],
          warnings: [],
        },
      ],
      lifeHighlight: {
        bestPeriod: { label: '', ages: '', reason: '' },
        currentStatus: '',
        nextTurningPoint: { age: Number.NaN, direction: 'up', reason: '' },
      },
    },
  } as any, 5);

  assert.deepEqual(result.periodBoundaries, [40, 59]);
  assert.equal(result.chartData.length, 2);
  assert.ok(result.chartData.every((point) => Number.isFinite(point.age) && Number.isFinite(point.year)));
});
