import test from 'node:test';
import assert from 'node:assert/strict';
import { handleBaziCalculate } from '../../packages/mcp-core/src/handlers/bazi';
import { handleZiweiCalculate } from '../../packages/mcp-core/src/handlers/ziwei';
import { calculateTrueSolarTime } from '../../packages/mcp-core/src/handlers/ziwei-shared';

test('calculateTrueSolarTime should normalize rounded minutes instead of returning impossible :60 values', () => {
  const info = calculateTrueSolarTime(
    { birthYear: 2024, birthMonth: 1, birthDay: 1, birthHour: 0, birthMinute: 0 },
    -179.1,
  );

  assert.equal(info.trueSolarTime, '04:00');
  assert.equal(info.dayOffset, -1);
});

test('handleBaziCalculate should normalize true-solar dates across month boundaries', async () => {
  const corrected = await handleBaziCalculate({
    gender: 'male',
    birthYear: 2024,
    birthMonth: 3,
    birthDay: 1,
    birthHour: 0,
    birthMinute: 5,
    calendarType: 'solar',
    longitude: -180,
  });

  const normalized = await handleBaziCalculate({
    gender: 'male',
    birthYear: 2024,
    birthMonth: 2,
    birthDay: 29,
    birthHour: 3,
    birthMinute: 52,
    calendarType: 'solar',
  });

  assert.deepEqual(corrected.fourPillars, normalized.fourPillars);
  assert.equal(corrected.dayMaster, normalized.dayMaster);
});

test('handleZiweiCalculate should apply true-solar day offsets before building the chart date', async () => {
  const corrected = await handleZiweiCalculate({
    gender: 'male',
    birthYear: 2024,
    birthMonth: 3,
    birthDay: 1,
    birthHour: 0,
    birthMinute: 5,
    calendarType: 'solar',
    longitude: -180,
  });

  const normalized = await handleZiweiCalculate({
    gender: 'male',
    birthYear: 2024,
    birthMonth: 2,
    birthDay: 29,
    birthHour: 3,
    birthMinute: 52,
    calendarType: 'solar',
  });

  assert.equal(corrected.solarDate, normalized.solarDate);
  assert.equal(corrected.lunarDate, normalized.lunarDate);
  assert.deepEqual(corrected.fourPillars, normalized.fourPillars);
  assert.equal(corrected.timeRange, normalized.timeRange);
});

test('handleZiweiCalculate should accept valid solar birthdays on the 31st', async () => {
  const result = await handleZiweiCalculate({
    gender: 'male',
    birthYear: 1990,
    birthMonth: 1,
    birthDay: 31,
    birthHour: 10,
    birthMinute: 0,
    calendarType: 'solar',
  });

  assert.equal(result.solarDate, '1990-1-31');
});
