import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { LunarMonth, LunarYear } from 'lunar-javascript';

import * as mcpCore from '@mingai/core';

const readmePath = resolve(process.cwd(), 'packages/core/README.md');

function runQimenUnderTimeZone(timeZone) {
  const script = `
    import { handleQimenCalculate } from '@mingai/core';
    const result = await handleQimenCalculate({
      year: 2026,
      month: 3,
      day: 15,
      hour: 16,
      minute: 51,
    });
    console.log(JSON.stringify({
      siZhu: result.siZhu,
      dunType: result.dunType,
      juNumber: result.juNumber,
      xunShou: result.xunShou,
      zhiFu: result.zhiFu,
      zhiShi: result.zhiShi,
    }));
  `;

  return JSON.parse(
    execFileSync(process.execPath, ['--input-type=module', '-e', script], {
      cwd: process.cwd(),
      env: { ...process.env, TZ: timeZone },
      encoding: 'utf8',
    }).trim(),
  );
}

test('qimen should stay stable across process time zones for the same wall-clock input', () => {
  const utcResult = runQimenUnderTimeZone('UTC');
  const shanghaiResult = runQimenUnderTimeZone('Asia/Shanghai');

  assert.deepEqual(
    utcResult,
    shanghaiResult,
    'same wall-clock qimen input should not drift with process TZ',
  );
});

test('qimen and daliuren tools should expose timezone and daliuren should publish an output schema', () => {
  const qimenTool = mcpCore.tools.find((item) => item.name === 'qimen_calculate');
  const daliurenTool = mcpCore.tools.find((item) => item.name === 'daliuren');

  assert.ok(qimenTool, 'qimen_calculate tool missing');
  assert.ok(daliurenTool, 'daliuren tool missing');
  assert.equal(typeof qimenTool.inputSchema?.properties?.timezone, 'object');
  assert.equal(typeof daliurenTool.inputSchema?.properties?.timezone, 'object');
  assert.equal(typeof daliurenTool.outputSchema, 'object');
});

test('liuyao should reject date-only input because time affects the chart', async () => {
  await assert.rejects(
    () =>
      mcpCore.handleLiuyaoAnalyze({
        question: '这周项目顺利吗',
        yongShenTargets: ['官鬼'],
        method: 'auto',
        date: '2026-02-11',
      }),
    /必须包含时间|YYYY-MM-DDTHH:MM/u,
  );
});

test('liuyao number casting should reject non-positive integers with a user-facing error', async () => {
  await assert.rejects(
    () =>
      mcpCore.handleLiuyaoAnalyze({
        question: '数字起卦测试',
        yongShenTargets: ['官鬼'],
        method: 'number',
        numbers: [-1, 2],
        date: '2026-02-10T12:00:00',
      }),
    /正整数|自然数|numbers/u,
  );
});

test('almanac should reject impossible calendar dates instead of silently rolling over', async () => {
  await assert.rejects(
    () => mcpCore.handleDailyFortune({ date: '2026-02-31' }),
    /日期无效|不存在/u,
  );
});

test('daliuren should reject invalid timezones instead of silently falling back', () => {
  assert.throws(
    () =>
      mcpCore.handleDaliurenCalculate({
        date: '2024-01-01',
        hour: 10,
        minute: 0,
        timezone: 'Asia/Shanghaix',
      }),
    /timezone/u,
  );
});

test('ziwei_calculate should derive lifeMasterStar from the birth-year earthly branch', async () => {
  const result = await mcpCore.handleZiweiCalculate({
    gender: 'male',
    birthYear: 2003,
    birthMonth: 9,
    birthDay: 2,
    birthHour: 10,
    birthMinute: 30,
  });

  assert.equal(result.lifeMasterStar, '武曲');
});

test('ziwei should reject longitude correction for lunar input until that path is implemented correctly', async () => {
  await assert.rejects(
    () =>
      mcpCore.handleZiweiCalculate({
        gender: 'male',
        birthYear: 2003,
        birthMonth: 8,
        birthDay: 6,
        birthHour: 0,
        birthMinute: 10,
        calendarType: 'lunar',
        longitude: 73,
      }),
    /longitude.*solar|农历.*longitude/u,
  );
});

test('ziwei should reject invalid lunar leap months and out-of-range lunar days', async () => {
  let nonLeapYear = 1900;
  while (LunarYear.fromYear(nonLeapYear).getLeapMonth() !== 0) {
    nonLeapYear += 1;
  }

  await assert.rejects(
    () =>
      mcpCore.handleZiweiCalculate({
        gender: 'female',
        birthYear: nonLeapYear,
        birthMonth: 1,
        birthDay: 1,
        birthHour: 10,
        birthMinute: 0,
        calendarType: 'lunar',
        isLeapMonth: true,
      }),
    /闰月/u,
  );

  const leapMonth = LunarYear.fromYear(2023).getLeapMonth();
  const leapMonthDayCount = LunarMonth.fromYm(2023, -Math.abs(leapMonth)).getDayCount();

  await assert.rejects(
    () =>
      mcpCore.handleZiweiCalculate({
        gender: 'female',
        birthYear: 2023,
        birthMonth: Math.abs(leapMonth),
        birthDay: leapMonthDayCount + 1,
        birthHour: 10,
        birthMinute: 0,
        calendarType: 'lunar',
        isLeapMonth: true,
      }),
    /农历日期/u,
  );
});

test('ziwei_horoscope and ziwei_flying_star should expose longitude in the public tool schema', () => {
  const horoscopeTool = mcpCore.tools.find((item) => item.name === 'ziwei_horoscope');
  const flyingStarTool = mcpCore.tools.find((item) => item.name === 'ziwei_flying_star');

  assert.ok(horoscopeTool, 'ziwei_horoscope tool missing');
  assert.ok(flyingStarTool, 'ziwei_flying_star tool missing');
  assert.equal(typeof horoscopeTool.inputSchema?.properties?.longitude, 'object');
  assert.equal(typeof flyingStarTool.inputSchema?.properties?.longitude, 'object');
});

test('qimen_calculate output schema should expose the extended palace metadata returned at runtime', () => {
  const tool = mcpCore.tools.find((item) => item.name === 'qimen_calculate');
  assert.ok(tool, 'qimen_calculate tool missing');

  const palaceProps = tool.outputSchema?.properties?.palaces?.items?.properties;

  assert.equal(palaceProps?.starElement?.type, 'string');
  assert.equal(palaceProps?.gateElement?.type, 'string');
  assert.equal(palaceProps?.stemWangShuai?.type, 'string');
  assert.equal(palaceProps?.elementState?.type, 'string');
  assert.equal(tool.outputSchema?.properties?.panType?.type, 'string');
  assert.equal(tool.outputSchema?.properties?.juMethod?.type, 'string');
});

test('bazi_dayun should keep xiaoYun coverage aligned with the upstream startAge', async () => {
  const result = await mcpCore.handleDayunCalculate({
    gender: 'male',
    birthYear: 1990,
    birthMonth: 1,
    birthDay: 1,
    birthHour: 12,
    birthMinute: 0,
    calendarType: 'solar',
  });

  assert.ok(result.xiaoYun.some((item) => item.age === 8), 'xiaoYun should include the age right before first daYun.startAge');
  assert.equal(result.startAge, 9, 'dayun output should expose first daYun.startAge for downstream adapters');
  assert.equal(result.list[0]?.startAge, 9, 'each dayun entry should expose its own startAge');
  assert.equal(result.list[0]?.liunianList[0]?.age, 9, 'liunian entries should expose derived age for web adapters');
});

test('bazi_dayun output schema should expose full liunian payload fields for downstream consumers', () => {
  const tool = mcpCore.tools.find((item) => item.name === 'bazi_dayun');
  assert.ok(tool, 'bazi_dayun tool missing');

  const liunianProps = tool.outputSchema?.properties?.list?.items?.properties?.liunianList?.items?.properties;

  assert.equal(liunianProps?.gan?.type, 'string');
  assert.equal(liunianProps?.zhi?.type, 'string');
  assert.equal(liunianProps?.hiddenStems?.type, 'array');
  assert.equal(liunianProps?.diShi?.type, 'string');
  assert.equal(liunianProps?.shenSha?.type, 'array');
});

test('ziwei_calculate should expose structured four pillars for direct consumers', async () => {
  const result = await mcpCore.handleZiweiCalculate({
    gender: 'male',
    birthYear: 1990,
    birthMonth: 1,
    birthDay: 1,
    birthHour: 12,
    birthMinute: 0,
    calendarType: 'solar',
  });

  assert.equal(typeof result.fourPillars.year?.gan, 'string');
  assert.equal(typeof result.fourPillars.year?.zhi, 'string');
  assert.equal(result.fourPillars.year.gan + result.fourPillars.year.zhi, '己巳');
});

test('ziwei_calculate output schema should expose structured four pillars for adapters', () => {
  const tool = mcpCore.tools.find((item) => item.name === 'ziwei_calculate');
  assert.ok(tool, 'ziwei_calculate tool missing');

  const yearProps = tool.outputSchema?.properties?.fourPillars?.properties?.year?.properties;

  assert.equal(yearProps?.gan?.type, 'string');
  assert.equal(yearProps?.zhi?.type, 'string');
});

test('README should stay aligned with the current core tool surface and liuyao contract', async () => {
  const source = await readFile(readmePath, 'utf8');

  assert.match(source, /`qimen_calculate`/u, 'README should list qimen_calculate');
  assert.match(source, /`daliuren`/u, 'README should list daliuren');
  assert.match(source, /handleToolCall\('liuyao'[\s\S]*date:/u, 'README liuyao example should include date');
});
