import test from 'node:test';
import assert from 'node:assert/strict';
import { LunarMonth, LunarYear, Solar } from 'lunar-javascript';

import * as mcpCore from '@mingai/core';

const SAMPLE_INPUT = {
  gender: 'male',
  birthYear: 1992,
  birthMonth: 8,
  birthDay: 16,
  birthHour: 9,
  birthMinute: 30,
  calendarType: 'solar',
};

function toPillarString(pillar) {
  return `${pillar.stem}${pillar.branch}`;
}

test('bazi_calculate should expose enhanced pillar fields', async () => {
  const result = await mcpCore.handleBaziCalculate(SAMPLE_INPUT);

  assert.ok(result.fourPillars, 'missing fourPillars');
  assert.equal(typeof result.kongWang, 'object', 'missing top-level kongWang');
  assert.equal(typeof result.kongWang.xun, 'string', 'top-level kongWang.xun missing');
  assert.ok(Array.isArray(result.kongWang.kongZhi), 'top-level kongWang.kongZhi should be array');
  assert.equal(result.kongWang.kongZhi.length, 2, 'top-level kongWang.kongZhi should contain 2 branches');

  for (const pillarKey of ['year', 'month', 'day', 'hour']) {
    const pillar = result.fourPillars[pillarKey];
    assert.ok(Array.isArray(pillar.hiddenStems), `${pillarKey}.hiddenStems should be array`);
    assert.ok(pillar.hiddenStems.length > 0, `${pillarKey}.hiddenStems should not be empty`);

    const firstHiddenStem = pillar.hiddenStems[0];
    assert.equal(typeof firstHiddenStem, 'object', `${pillarKey}.hiddenStems should be object[]`);
    assert.equal(typeof firstHiddenStem.stem, 'string', `${pillarKey}.hiddenStems[].stem missing`);
    assert.ok(['本气', '中气', '余气'].includes(firstHiddenStem.qiType), `${pillarKey}.hiddenStems[].qiType invalid`);
    assert.equal(typeof firstHiddenStem.tenGod, 'string', `${pillarKey}.hiddenStems[].tenGod missing`);

    assert.ok(Array.isArray(pillar.shenSha), `${pillarKey}.shenSha should be array`);
    assert.equal(typeof pillar.kongWang, 'object', `${pillarKey}.kongWang should be object`);
    assert.equal(typeof pillar.kongWang.isKong, 'boolean', `${pillarKey}.kongWang.isKong missing`);
    assert.ok(!('xun' in pillar.kongWang), `${pillarKey}.kongWang.xun should not exist`);
    assert.ok(!('kongZhi' in pillar.kongWang), `${pillarKey}.kongWang.kongZhi should not exist`);
  }

  assert.equal(result.daYun, undefined, 'daYun should not exist in bazi output');

  assert.ok(Array.isArray(result.relations), 'relations should be array');
  assert.ok(!('shenSha' in result), 'legacy shenSha should be removed');
});

test('bazi_calculate should output relation list with type/description/auspiciousness', async () => {
  const result = await mcpCore.handleBaziCalculate({
    gender: 'male',
    birthYear: 1980,
    birthMonth: 1,
    birthDay: 1,
    birthHour: 2,
    birthMinute: 0,
    calendarType: 'solar',
  });

  assert.ok(result.relations.length > 0, 'relations should not be empty for this sample');

  const he = result.relations.find((r) => r.type === '合');
  const chong = result.relations.find((r) => r.type === '冲');
  const hai = result.relations.find((r) => r.type === '害');
  const xing = result.relations.find((r) => r.type === '刑');

  assert.ok(he, 'should include 合 relation');
  assert.ok(chong, 'should include 冲 relation');
  assert.ok(hai, 'should include 害 relation');
  assert.ok(xing, 'should include 刑 relation');

  assert.equal(typeof he.description, 'string');
  assert.equal(typeof chong.description, 'string');
  assert.equal(typeof hai.description, 'string');
  assert.equal(typeof xing.description, 'string');
  for (const rel of result.relations) {
    for (const p of rel.pillars) {
      assert.ok(['年支', '月支', '日支', '时支'].includes(p), `invalid relation pillar label: ${p}`);
    }
  }
});

test('bazi_calculate should set consistent pillar kongWang objects', async () => {
  const result = await mcpCore.handleBaziCalculate(SAMPLE_INPUT);
  const pillars = ['year', 'month', 'day', 'hour'];
  const globalKong = result.kongWang;

  for (const key of pillars) {
    const pillar = result.fourPillars[key];
    assert.equal(
      pillar.kongWang.isKong,
      globalKong.kongZhi.includes(pillar.branch),
      `${key}.kongWang.isKong should match top-level kongWang.kongZhi`
    );
  }
});

test('bazi_calculate should return consistent chart for equivalent solar and lunar inputs', async () => {
  const solar = Solar.fromYmdHms(1992, 8, 16, 9, 30, 0);
  const lunar = solar.getLunar();
  const lunarMonth = lunar.getMonth();

  const solarResult = await mcpCore.handleBaziCalculate({
    gender: 'male',
    birthYear: 1992,
    birthMonth: 8,
    birthDay: 16,
    birthHour: 9,
    birthMinute: 30,
    calendarType: 'solar',
  });

  const lunarResult = await mcpCore.handleBaziCalculate({
    gender: 'male',
    birthYear: lunar.getYear(),
    birthMonth: Math.abs(lunarMonth),
    birthDay: lunar.getDay(),
    birthHour: 9,
    birthMinute: 30,
    calendarType: 'lunar',
    isLeapMonth: lunarMonth < 0,
  });

  assert.equal(solarResult.dayMaster, lunarResult.dayMaster);
  assert.equal(toPillarString(solarResult.fourPillars.year), toPillarString(lunarResult.fourPillars.year));
  assert.equal(toPillarString(solarResult.fourPillars.month), toPillarString(lunarResult.fourPillars.month));
  assert.equal(toPillarString(solarResult.fourPillars.day), toPillarString(lunarResult.fourPillars.day));
  assert.equal(toPillarString(solarResult.fourPillars.hour), toPillarString(lunarResult.fourPillars.hour));
});

test('bazi_calculate should reject invalid lunar leap month and out-of-range lunar day', async () => {
  let nonLeapYear = 1900;
  while (LunarYear.fromYear(nonLeapYear).getLeapMonth() !== 0) {
    nonLeapYear += 1;
  }

  await assert.rejects(
    () => mcpCore.handleBaziCalculate({
      gender: 'female',
      birthYear: nonLeapYear,
      birthMonth: 1,
      birthDay: 1,
      birthHour: 10,
      birthMinute: 0,
      calendarType: 'lunar',
      isLeapMonth: true,
    }),
    /闰月/
  );

  const leapMonth = LunarYear.fromYear(nonLeapYear).getLeapMonth();
  const month = leapMonth > 0 ? leapMonth : 1;
  const ym = leapMonth > 0 ? -Math.abs(month) : month;
  const dayCount = LunarMonth.fromYm(nonLeapYear, ym).getDayCount();

  await assert.rejects(
    () => mcpCore.handleBaziCalculate({
      gender: 'female',
      birthYear: nonLeapYear,
      birthMonth: month,
      birthDay: dayCount + 1,
      birthHour: 10,
      birthMinute: 0,
      calendarType: 'lunar',
      isLeapMonth: leapMonth > 0,
    }),
    /农历日期/
  );

  await assert.rejects(
    () => mcpCore.handleBaziCalculate({
      gender: 'female',
      birthYear: nonLeapYear,
      birthMonth: -1,
      birthDay: 1,
      birthHour: 10,
      birthMinute: 0,
      calendarType: 'lunar',
      isLeapMonth: false,
    }),
    /农历月份/
  );
});

test('bazi_calculate should keep bazi-specific shensha after shared refactor', async () => {
  const samples = [
    {
      input: { gender: 'male', birthYear: 1980, birthMonth: 1, birthDay: 1, birthHour: 9, birthMinute: 0, calendarType: 'solar' },
      pillar: 'hour',
      star: '天德贵人',
    },
    {
      input: { gender: 'male', birthYear: 1980, birthMonth: 1, birthDay: 1, birthHour: 9, birthMinute: 0, calendarType: 'solar' },
      pillar: 'day',
      star: '德秀贵人',
    },
    {
      input: { gender: 'male', birthYear: 1980, birthMonth: 1, birthDay: 1, birthHour: 9, birthMinute: 0, calendarType: 'solar' },
      pillar: 'hour',
      star: '月德合',
    },
    {
      input: { gender: 'male', birthYear: 1980, birthMonth: 1, birthDay: 3, birthHour: 9, birthMinute: 0, calendarType: 'solar' },
      pillar: 'hour',
      star: '金舆',
    },
    {
      input: { gender: 'male', birthYear: 1980, birthMonth: 1, birthDay: 8, birthHour: 9, birthMinute: 0, calendarType: 'solar' },
      pillar: 'day',
      star: '月德贵人',
    },
    {
      input: { gender: 'male', birthYear: 1980, birthMonth: 1, birthDay: 10, birthHour: 9, birthMinute: 0, calendarType: 'solar' },
      pillar: 'hour',
      star: '天德合',
    },
  ];

  for (const sample of samples) {
    const result = await mcpCore.handleBaziCalculate(sample.input);
    assert.ok(
      result.fourPillars[sample.pillar].shenSha.includes(sample.star),
      `expected ${sample.star} in ${sample.pillar} pillar`
    );
  }
});

test('tools should include bazi_pillars_resolve', () => {
  const names = mcpCore.tools.map((tool) => tool.name);
  assert.ok(names.includes('bazi_pillars_resolve'));
});

test('bazi_calculate output schema should constrain relation pillars enum', () => {
  const tool = mcpCore.tools.find((t) => t.name === 'bazi_calculate');
  assert.ok(tool, 'bazi_calculate tool missing');
  const enumValues = tool.outputSchema
    ?.properties?.relations?.items?.properties?.pillars?.items?.enum;
  assert.deepEqual(enumValues, ['年支', '月支', '日支', '时支']);
});

test('bazi_pillars_resolve output schema should expose lunar candidate contract', () => {
  const tool = mcpCore.tools.find((t) => t.name === 'bazi_pillars_resolve');
  assert.ok(tool, 'bazi_pillars_resolve tool missing');

  const candidateProps = tool.outputSchema
    ?.properties?.candidates?.items?.properties;

  assert.equal(candidateProps?.isLeapMonth?.type, 'boolean');
  assert.deepEqual(
    candidateProps?.nextCall?.properties?.arguments?.properties?.calendarType?.enum,
    ['lunar']
  );
  assert.equal(
    candidateProps?.nextCall?.properties?.arguments?.properties?.isLeapMonth?.type,
    'boolean'
  );
});

test('bazi_pillars_resolve should return candidates and next call hint', async () => {
  assert.equal(typeof mcpCore.handleBaziPillarsResolve, 'function', 'handleBaziPillarsResolve should be exported');

  const result = await mcpCore.handleBaziPillarsResolve({
    yearPillar: '壬申',
    monthPillar: '戊申',
    dayPillar: '丙午',
    hourPillar: '癸巳',
  });

  assert.equal(typeof result.count, 'number');
  assert.ok(Array.isArray(result.candidates), 'candidates should be array');

  if (result.candidates.length > 0) {
    const first = result.candidates[0];
    assert.equal(typeof first.candidateId, 'string');
    assert.equal(typeof first.birthYear, 'number');
    assert.equal(typeof first.birthMonth, 'number');
    assert.equal(typeof first.birthDay, 'number');
    assert.equal(typeof first.birthHour, 'number');
    assert.equal(typeof first.birthMinute, 'number');
    assert.equal(typeof first.isLeapMonth, 'boolean');
    assert.equal(typeof first.solarText, 'string');
    assert.equal(typeof first.lunarText, 'string');
    assert.equal(first.nextCall.tool, 'bazi_calculate');
    assert.equal(first.nextCall.arguments.birthYear, first.birthYear);
    assert.equal(first.nextCall.arguments.calendarType, 'lunar');
    assert.equal(first.nextCall.arguments.isLeapMonth, first.isLeapMonth);
  }
});

test('bazi_pillars_resolve candidates should round-trip to identical four pillars', async () => {
  const inputPillars = {
    yearPillar: '壬申',
    monthPillar: '戊申',
    dayPillar: '丙午',
    hourPillar: '癸巳',
  };

  const result = await mcpCore.handleBaziPillarsResolve(inputPillars);
  assert.ok(result.count > 0, 'expected at least one candidate');

  for (const candidate of result.candidates) {
    const chart = await mcpCore.handleBaziCalculate({
      gender: 'male',
      birthYear: candidate.birthYear,
      birthMonth: candidate.birthMonth,
      birthDay: candidate.birthDay,
      birthHour: candidate.birthHour,
      birthMinute: candidate.birthMinute,
      calendarType: 'lunar',
      isLeapMonth: candidate.isLeapMonth,
    });

    assert.equal(toPillarString(chart.fourPillars.year), inputPillars.yearPillar);
    assert.equal(toPillarString(chart.fourPillars.month), inputPillars.monthPillar);
    assert.equal(toPillarString(chart.fourPillars.day), inputPillars.dayPillar);
    assert.equal(toPillarString(chart.fourPillars.hour), inputPillars.hourPillar);
  }
});

test('bazi_pillars_resolve should reject invalid pillar strings', async () => {
  await assert.rejects(
    () => mcpCore.handleBaziPillarsResolve({
      yearPillar: '甲',
      monthPillar: '乙丑',
      dayPillar: '丙寅',
      hourPillar: '丁卯',
    }),
    /yearPillar 必须是 2 字干支/
  );

  await assert.rejects(
    () => mcpCore.handleBaziPillarsResolve({
      yearPillar: '甲子',
      monthPillar: '乙X',
      dayPillar: '丙寅',
      hourPillar: '丁卯',
    }),
    /monthPillar 地支无效/
  );

  await assert.rejects(
    () => mcpCore.handleBaziPillarsResolve({
      yearPillar: '甲子',
      monthPillar: '甲子',
      dayPillar: '甲子',
      hourPillar: '乙子',
    }),
    /hourPillar 不是有效干支组合/
  );
});

test('bazi_pillars_resolve should return empty candidates for legal but unmatched pillars', async () => {
  const result = await mcpCore.handleBaziPillarsResolve({
    yearPillar: '甲子',
    monthPillar: '乙丑',
    dayPillar: '丙寅',
    hourPillar: '丁卯',
  });

  assert.equal(result.count, 0);
  assert.deepEqual(result.candidates, []);
});
