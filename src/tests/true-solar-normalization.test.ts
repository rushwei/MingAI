import test from 'node:test';
import assert from 'node:assert/strict';
import { Lunar } from 'lunar-javascript';
import { calculateBaziData } from '../../packages/core/src/bazi-core';
import { calculateZiweiData } from '../../packages/core/src/ziwei-core';
import { calculateTrueSolarTime } from '../../packages/core/src/ziwei-shared';

test('calculateTrueSolarTime should normalize rounded minutes instead of returning impossible :60 values', () => {
  const info = calculateTrueSolarTime(
    { birthYear: 2024, birthMonth: 1, birthDay: 1, birthHour: 0, birthMinute: 0 },
    -179.1,
  );

  assert.equal(info.trueSolarTime, '04:00');
  assert.equal(info.dayOffset, -1);
});

test('calculateBaziData should normalize true-solar dates across month boundaries', async () => {
  const corrected = await calculateBaziData({
    gender: 'male',
    birthYear: 2024,
    birthMonth: 3,
    birthDay: 1,
    birthHour: 0,
    birthMinute: 5,
    calendarType: 'solar',
    longitude: -180,
  });

  const normalized = await calculateBaziData({
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

test('calculateZiweiData should apply true-solar day offsets before building the chart date', async () => {
  const corrected = await calculateZiweiData({
    gender: 'male',
    birthYear: 2024,
    birthMonth: 3,
    birthDay: 1,
    birthHour: 0,
    birthMinute: 5,
    calendarType: 'solar',
    longitude: -180,
  });

  const normalized = await calculateZiweiData({
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

test('calculateZiweiData should accept valid solar birthdays on the 31st', async () => {
  const result = await calculateZiweiData({
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

test('calculateBaziData should apply true solar correction for lunar input through the equivalent solar instant', async () => {
  const lunar = Lunar.fromYmdHms(2023, 8, 15, 23, 40, 0);
  const solar = lunar.getSolar();

  const correctedLunar = await calculateBaziData({
    gender: 'female',
    birthYear: 2023,
    birthMonth: 8,
    birthDay: 15,
    birthHour: 23,
    birthMinute: 40,
    calendarType: 'lunar',
    longitude: 73,
  });

  const correctedSolar = await calculateBaziData({
    gender: 'female',
    birthYear: solar.getYear(),
    birthMonth: solar.getMonth(),
    birthDay: solar.getDay(),
    birthHour: solar.getHour(),
    birthMinute: solar.getMinute(),
    calendarType: 'solar',
    longitude: 73,
  });

  assert.deepEqual(correctedLunar.fourPillars, correctedSolar.fourPillars);
  assert.equal(correctedLunar.dayMaster, correctedSolar.dayMaster);
  assert.deepEqual(correctedLunar.trueSolarTimeInfo, correctedSolar.trueSolarTimeInfo);
});

test('calculateZiweiData should apply true solar correction for lunar input through the equivalent solar instant', async () => {
  const lunar = Lunar.fromYmdHms(2023, 8, 15, 23, 40, 0);
  const solar = lunar.getSolar();

  const correctedLunar = await calculateZiweiData({
    gender: 'female',
    birthYear: 2023,
    birthMonth: 8,
    birthDay: 15,
    birthHour: 23,
    birthMinute: 40,
    calendarType: 'lunar',
    longitude: 73,
  });

  const correctedSolar = await calculateZiweiData({
    gender: 'female',
    birthYear: solar.getYear(),
    birthMonth: solar.getMonth(),
    birthDay: solar.getDay(),
    birthHour: solar.getHour(),
    birthMinute: solar.getMinute(),
    calendarType: 'solar',
    longitude: 73,
  });

  assert.equal(correctedLunar.solarDate, correctedSolar.solarDate);
  assert.equal(correctedLunar.lunarDate, correctedSolar.lunarDate);
  assert.deepEqual(correctedLunar.fourPillars, correctedSolar.fourPillars);
  assert.deepEqual(correctedLunar.trueSolarTimeInfo, correctedSolar.trueSolarTimeInfo);
});
