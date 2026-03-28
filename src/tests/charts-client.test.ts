import test from 'node:test';
import assert from 'node:assert/strict';

test('toFortuneBaziChart should preserve full chart_data needed by daily and monthly fortune pages', async () => {
  const { toFortuneBaziChart } = await import('../lib/user/charts-client');

  const chart = toFortuneBaziChart({
    id: 'bazi-1',
    user_id: 'user-1',
    name: '测试命盘',
    gender: 'male',
    birth_date: '1990-01-01',
    birth_time: '08:30',
    birth_place: '上海',
    calendar_type: 'solar',
    is_leap_month: false,
    created_at: '2026-03-28T00:00:00.000Z',
    chart_data: {
      fourPillars: {
        year: { stem: '庚', branch: '午' },
        month: { stem: '戊', branch: '寅' },
        day: { stem: '甲', branch: '子' },
        hour: { stem: '丁', branch: '卯' },
      },
      dayMaster: '甲',
      fiveElements: { 金: 1, 木: 2, 水: 1, 火: 1, 土: 1 },
    },
  });

  assert.ok(chart);
  assert.equal(chart.id, 'bazi-1');
  assert.equal(chart.dayMaster, '甲');
  assert.equal(chart.fourPillars.day.branch, '子');
  assert.deepEqual(chart.fiveElements, { 金: 1, 木: 2, 水: 1, 火: 1, 土: 1 });
});

test('toFortuneBaziChart should reject partial chart rows that are missing chart_data essentials', async () => {
  const { toFortuneBaziChart } = await import('../lib/user/charts-client');

  const chart = toFortuneBaziChart({
    id: 'bazi-2',
    name: '残缺命盘',
    gender: 'female',
    birth_date: '1992-02-02',
    birth_time: '10:00',
    created_at: '2026-03-28T00:00:00.000Z',
  });

  assert.equal(chart, null);
});
