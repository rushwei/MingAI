import test from 'node:test';
import assert from 'node:assert/strict';

import {
  renderBaziCanonicalJSON,
  handleDaliurenCalculate,
  handleQimenCalculate,
  handleZiweiCalculate,
  renderDaliurenCanonicalJSON,
  renderQimenCanonicalJSON,
  renderZiweiCanonicalJSON,
} from '@mingai/core';

function createBaziResult(overrides = {}) {
  return {
    gender: 'male',
    dayMaster: '甲',
    kongWang: { xun: '甲子', kongZhi: ['戌', '亥'] },
    fourPillars: {
      year: {
        stem: '甲',
        branch: '戌',
        tenGod: '比肩',
        hiddenStems: [],
        naYin: '山头火',
        diShi: '养',
        shenSha: ['空亡', '天乙贵人'],
        kongWang: { isKong: true },
      },
      month: {
        stem: '乙',
        branch: '亥',
        tenGod: '劫财',
        hiddenStems: [],
        naYin: '山头火',
        diShi: '长生',
        shenSha: ['文昌贵人'],
        kongWang: { isKong: true },
      },
      day: {
        stem: '甲',
        branch: '子',
        hiddenStems: [],
        naYin: '海中金',
        diShi: '沐浴',
        shenSha: [],
        kongWang: { isKong: false },
      },
      hour: {
        stem: '丙',
        branch: '辰',
        tenGod: '食神',
        hiddenStems: [],
        naYin: '沙中土',
        diShi: '衰',
        shenSha: [],
        kongWang: { isKong: false },
      },
    },
    relations: [
      { type: '合', description: '子辰半合水', pillars: ['日支', '时支'] },
      { type: '会', description: '寅卯辰三会木', pillars: ['年支', '月支', '时支'] },
    ],
    tianGanWuHe: [],
    tianGanChongKe: [],
    diZhiBanHe: [{ branches: ['子', '辰'], resultElement: '水', missingBranch: '申' }],
    diZhiSanHui: [{ branches: ['寅', '卯', '辰'], resultElement: '木' }],
    ...overrides,
  };
}

test('qimen canonical json should preserve machine-readable fields needed by web ui', async () => {
  const result = await handleQimenCalculate({
    year: 2026,
    month: 3,
    day: 22,
    hour: 10,
    minute: 0,
    timezone: 'Asia/Shanghai',
    question: '项目推进',
  });

  const json = renderQimenCanonicalJSON(result);
  const fullJson = renderQimenCanonicalJSON(result, { detailLevel: 'full' });

  assert.equal(json.九宫盘.length, 9);
  assert.equal(typeof json.九宫盘[0]?.宫位序号, 'number');
  assert.equal(typeof json.九宫盘[0]?.宫名, 'string');
  assert.equal(typeof json.九宫盘[0]?.宫位五行, 'string');
  assert.equal('公历' in json.基本信息, false);
  assert.equal('农历' in json.基本信息, false);
  assert.equal('盘式' in json.基本信息, false);
  assert.equal('定局法' in json.基本信息, false);
  assert.equal('空亡信息' in json, false);
  assert.equal(typeof fullJson.空亡信息?.日空?.地支?.[0], 'string');
  assert.equal(typeof fullJson.十干月令旺衰?.甲, 'string');
});

test('daliuren canonical json should not expose fields omitted by canonical text spec', async () => {
  const result = await handleDaliurenCalculate({
    date: '2026-03-22',
    hour: 10,
    minute: 0,
    timezone: 'Asia/Shanghai',
    question: '项目推进',
  });

  const json = renderDaliurenCanonicalJSON(result);
  const fullJson = renderDaliurenCanonicalJSON(result, { detailLevel: 'full' });

  assert.equal('yinYangGuiRen' in result, false);
  assert.equal(json.四课.length, 4);
  assert.equal(json.三传.length, 3);
  assert.equal(Array.isArray(json.天地盘), true);
  assert.equal('农历' in json.基本信息, false);
  assert.equal('本命' in json.基本信息, false);
  assert.equal('附加课体' in json.基本信息, false);
  assert.equal('建除' in json.天地盘[0], false);
  assert.equal('神煞' in json, false);
  assert.equal(typeof fullJson.天地盘[0]?.建除, 'string');
});

test('bazi canonical json should de-duplicate branch relation summaries without showing missing banhe branches', () => {
  const json = renderBaziCanonicalJSON(createBaziResult());

  assert.deepEqual(json.干支关系, ['子辰半合水', '寅卯辰三会木']);
});

test('daliuren canonical json keeps full tianjiang names for palace grid color mapping', async () => {
  const result = await handleDaliurenCalculate({
    date: '2026-03-22',
    hour: 10,
    minute: 0,
    timezone: 'Asia/Shanghai',
    question: '项目推进',
  });

  const json = renderDaliurenCanonicalJSON(result);

  assert.deepEqual(
    json.天地盘.map((item) => item.天将),
    result.gongInfos.map((item) => item.tianJiang),
  );
});

test('ziwei canonical json should expose compact default output while keeping full detail opt-in', async () => {
  const result = await handleZiweiCalculate({
    gender: 'male',
    birthYear: 1990,
    birthMonth: 1,
    birthDay: 1,
    birthHour: 12,
    birthMinute: 0,
    calendarType: 'solar',
  });

  const json = renderZiweiCanonicalJSON(result);
  const fullJson = renderZiweiCanonicalJSON(result, { detailLevel: 'full' });

  assert.equal(Array.isArray(json.十二宫位), true);
  assert.equal('decadalList' in json, false);
  assert.equal(Array.isArray(json.小限), false);
  assert.equal(typeof json.基本信息.生年四化?.天干, 'string');
  assert.equal(Array.isArray(json.基本信息.生年四化?.四化星曜), true);
  assert.equal(Array.isArray(json.十二宫位[0]?.杂曜), false);
  assert.equal(Array.isArray(json.十二宫位[0]?.神煞), false);
  assert.equal(Array.isArray(json.十二宫位[0]?.小限虚岁), false);
  assert.equal(Array.isArray(json.十二宫位[0]?.流年虚岁), false);
  assert.equal('currentTransit' in json, false);

  assert.equal(Array.isArray(fullJson.小限), true);
  assert.deepEqual(
    fullJson.小限?.slice(0, 4).map((item) => item.宫位),
    ['命宫', '父母', '福德', '田宅'],
  );
  assert.ok(Array.isArray(fullJson.十二宫位[0]?.杂曜));
  assert.ok(Array.isArray(fullJson.十二宫位[0]?.神煞));
  assert.ok(Array.isArray(fullJson.十二宫位[0]?.小限虚岁));
  assert.ok(Array.isArray(fullJson.十二宫位[0]?.流年虚岁));
  assert.equal('currentTransit' in fullJson, false);
});
