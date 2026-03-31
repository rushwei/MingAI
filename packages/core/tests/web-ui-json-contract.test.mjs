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

  assert.equal(json.palaces.length, 9);
  assert.equal(typeof json.palaces[0]?.palaceIndex, 'number');
  assert.equal(typeof json.palaces[0]?.palaceName, 'string');
  assert.equal(typeof json.palaces[0]?.element, 'string');
  assert.equal('dunType' in json.basicInfo, false);
  assert.equal('juNumber' in json.basicInfo, false);
  assert.equal('juMethod' in json.basicInfo, false);
  assert.equal('zhiFu' in json.basicInfo, false);
  assert.equal('zhiShi' in json.basicInfo, false);
  assert.equal(typeof json.monthPhaseMap, 'object');
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

  assert.equal('yinYangGuiRen' in result, false);
  assert.equal(json.siKe.length, 4);
  assert.equal(json.sanChuan.length, 3);
  assert.equal('yinYangGuiRen' in json.basicInfo, false);
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
    json.gongInfos.map((item) => item.tianJiang),
    result.gongInfos.map((item) => item.tianJiang),
  );
});

test('ziwei canonical json should preserve smallLimit order while omitting removable helper fields', async () => {
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

  assert.equal(Array.isArray(json.palaces), true);
  assert.equal('decadalList' in json, false);
  assert.equal(Array.isArray(json.smallLimit), true);
  assert.deepEqual(
    json.smallLimit?.slice(0, 4).map((item) => item.palaceName),
    ['命宫', '父母', '福德', '田宅'],
  );
  assert.equal('currentTransit' in json, false);
});
