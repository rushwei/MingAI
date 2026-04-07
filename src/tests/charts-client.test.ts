import test from 'node:test';
import assert from 'node:assert/strict';

test('toSavedBaziChart should rebuild core output from stored bazi base fields', async () => {
  const { toSavedBaziChart } = await import('../lib/user/charts-client');

  const chart = toSavedBaziChart({
    id: 'bazi-1',
    user_id: 'user-1',
    name: '测试命盘',
    gender: 'male',
    birth_date: '1990-01-01',
    birth_time: '08:30',
    birth_place: '上海',
    longitude: 121.4737,
    calendar_type: 'solar',
    is_leap_month: false,
    created_at: '2026-03-28T00:00:00.000Z',
  });

  assert.ok(chart);
  assert.equal(chart.id, 'bazi-1');
  assert.ok(chart.output.dayMaster);
  assert.ok(chart.output.fourPillars.day.branch);
  assert.equal(chart.name, '测试命盘');
});

test('toSavedBaziChart should reject rows that are missing birth date essentials', async () => {
  const { toSavedBaziChart } = await import('../lib/user/charts-client');

  const chart = toSavedBaziChart({
    id: 'bazi-2',
    name: '残缺命盘',
    gender: 'female',
    birth_time: '10:00',
    created_at: '2026-03-28T00:00:00.000Z',
  });

  assert.equal(chart, null);
});
