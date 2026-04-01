import test from 'node:test';
import assert from 'node:assert/strict';

import * as mcpCore from '@mingai/core';
import { buildToolSuccessPayload } from '@mingai/core/transport';

function createBaziResult() {
  return {
    gender: 'male',
    birthPlace: '北京',
    dayMaster: '甲',
    kongWang: { xun: '甲子', kongZhi: ['戌', '亥'] },
    fourPillars: {
      year: { stem: '甲', branch: '子', tenGod: '比肩', hiddenStems: [], naYin: '海中金', diShi: '沐浴', shenSha: [], kongWang: { isKong: false } },
      month: { stem: '乙', branch: '丑', tenGod: '劫财', hiddenStems: [], naYin: '海中金', diShi: '冠带', shenSha: [], kongWang: { isKong: false } },
      day: { stem: '甲', branch: '寅', tenGod: '', hiddenStems: [], naYin: '大溪水', diShi: '临官', shenSha: [], kongWang: { isKong: false } },
      hour: { stem: '丙', branch: '子', tenGod: '食神', hiddenStems: [], naYin: '涧下水', diShi: '沐浴', shenSha: [], kongWang: { isKong: false } },
    },
    relations: [],
    tianGanWuHe: [],
    tianGanChongKe: [],
    diZhiBanHe: [],
    diZhiSanHui: [],
  };
}

test('json response should keep structuredContent aligned with published outputSchema', () => {
  const payload = buildToolSuccessPayload('bazi_calculate', createBaziResult(), 'json');

  assert.equal(typeof payload.structuredContent, 'object');
  assert.equal(payload.structuredContent.基本信息.性别, '男');
  assert.equal(payload.structuredContent.基本信息.出生地, '北京');
  assert.equal(payload.structuredContent.四柱[0].柱, '年柱');
  assert.match(payload.content[0].text, /# 八字命盘/u);
  assert.doesNotMatch(payload.content[0].text, /"basicInfo"/u);
});

test('markdown response should still keep schema-aligned structuredContent', () => {
  const payload = buildToolSuccessPayload('bazi_calculate', createBaziResult(), 'markdown');

  assert.equal(typeof payload.structuredContent, 'object');
  assert.equal(payload.structuredContent.基本信息.性别, '男');
  assert.equal(payload.structuredContent.四柱[0].柱, '年柱');
  assert.match(payload.content[0].text, /# 八字命盘/u);
  assert.doesNotMatch(payload.content[0].text, /"basicInfo"/u, 'markdown content should remain human-readable text');
});

test('tarot default/full should split slim card text from detailed numerology metadata', async () => {
  const rawResult = await mcpCore.handleToolCall('tarot', {
    spreadType: 'single',
    question: '今天如何',
    birthYear: 2003,
    birthMonth: 9,
    birthDay: 2,
    seed: 'tarot-detail',
  });

  const defaultPayload = buildToolSuccessPayload('tarot', rawResult, 'markdown', { detailLevel: 'default' });
  const fullPayload = buildToolSuccessPayload('tarot', rawResult, 'markdown', { detailLevel: 'full' });

  assert.match(defaultPayload.content[0].text, /## 牌阵展开/u);
  assert.doesNotMatch(defaultPayload.content[0].text, /塔罗数秘术/u);
  assert.doesNotMatch(defaultPayload.content[0].text, /出生日期/u);
  assert.doesNotMatch(defaultPayload.content[0].text, /随机种子/u);
  assert.match(defaultPayload.content[0].text, /元素/u);
  assert.match(fullPayload.content[0].text, /求问者生命数字/u);
  assert.match(fullPayload.content[0].text, /出生日期/u);
  assert.match(fullPayload.content[0].text, /随机种子/u);
  assert.match(fullPayload.content[0].text, /元素 \| 星象/u);

  assert.equal(defaultPayload.structuredContent.问卜设定.出生日期, undefined);
  assert.equal(defaultPayload.structuredContent.问卜设定.随机种子, undefined);
  assert.equal(typeof defaultPayload.structuredContent.牌阵展开[0].元素, 'string');
  assert.equal(defaultPayload.structuredContent.求问者生命数字, undefined);
  assert.equal(typeof fullPayload.structuredContent.问卜设定.出生日期, 'string');
  assert.equal(typeof fullPayload.structuredContent.问卜设定.随机种子, 'string');
  assert.equal(typeof fullPayload.structuredContent.牌阵展开[0].元素, 'string');
  assert.equal(typeof fullPayload.structuredContent.求问者生命数字.人格牌.对应塔罗, 'string');
});

test('almanac default/full should keep default compact and full append complete calendrical details', async () => {
  const rawResult = await mcpCore.handleToolCall('almanac', {
    date: '2026-04-01',
    dayMaster: '戊',
  });

  const defaultPayload = buildToolSuccessPayload('almanac', rawResult, 'markdown', { detailLevel: 'default' });
  const fullPayload = buildToolSuccessPayload('almanac', rawResult, 'markdown', { detailLevel: 'full' });

  assert.match(defaultPayload.content[0].text, /# 每日黄历/u);
  assert.match(defaultPayload.content[0].text, /## 基础与个性化坐标/u);
  assert.match(defaultPayload.content[0].text, /## 择日宜忌/u);
  assert.match(defaultPayload.content[0].text, /吉神宜趋/u);
  assert.doesNotMatch(defaultPayload.content[0].text, /## 方位信息/u);
  assert.doesNotMatch(defaultPayload.content[0].text, /## 时辰吉凶/u);

  assert.match(fullPayload.content[0].text, /## 方位信息/u);
  assert.match(fullPayload.content[0].text, /## 值日信息/u);
  assert.match(fullPayload.content[0].text, /## 时辰吉凶/u);

  assert.equal(defaultPayload.structuredContent.方位信息, undefined);
  assert.equal(defaultPayload.structuredContent.值日信息, undefined);
  assert.equal(defaultPayload.structuredContent.时辰吉凶, undefined);
  assert.equal(typeof fullPayload.structuredContent.方位信息.财神, 'string');
  assert.equal(typeof fullPayload.structuredContent.值日信息.日柱纳音, 'string');
  assert.ok(Array.isArray(fullPayload.structuredContent.时辰吉凶));
});

test('bazi_calculate tool output should keep chart-only boundaries without implicit dayun summary', async () => {
  const rawResult = await mcpCore.handleToolCall('bazi_calculate', {
    gender: 'male',
    birthYear: 2003,
    birthMonth: 9,
    birthDay: 2,
    birthHour: 10,
    birthMinute: 20,
    calendarType: 'solar',
  });

  const payload = buildToolSuccessPayload('bazi_calculate', rawResult, 'markdown');

  assert.doesNotMatch(payload.content[0].text, /## 大运轨迹/u);
  assert.equal(typeof payload.structuredContent, 'object');
  assert.equal(payload.structuredContent.大运, undefined);
});

test('bazi_calculate detailLevel full should restore full metadata while default stays slim', async () => {
  const rawResult = await mcpCore.handleToolCall('bazi_calculate', {
    gender: 'male',
    birthYear: 2003,
    birthMonth: 9,
    birthDay: 2,
    birthHour: 10,
    birthMinute: 20,
    calendarType: 'solar',
  });

  const defaultPayload = buildToolSuccessPayload('bazi_calculate', rawResult, 'markdown', { detailLevel: 'default' });
  const fullPayload = buildToolSuccessPayload('bazi_calculate', rawResult, 'markdown', { detailLevel: 'full' });

  assert.doesNotMatch(defaultPayload.content[0].text, /命主五行/u);
  assert.doesNotMatch(defaultPayload.content[0].text, /胎元/u);
  assert.doesNotMatch(defaultPayload.content[0].text, /神煞/u);
  assert.match(fullPayload.content[0].text, /命主五行/u);
  assert.match(fullPayload.content[0].text, /胎元/u);
  assert.match(fullPayload.content[0].text, /神煞/u);

  assert.equal(defaultPayload.structuredContent.基本信息.命主五行, undefined);
  assert.equal(defaultPayload.structuredContent.基本信息.胎元, undefined);
  assert.equal(defaultPayload.structuredContent.四柱[0].纳音, undefined);
  assert.equal(defaultPayload.structuredContent.四柱[0].神煞, undefined);
  assert.equal(typeof fullPayload.structuredContent.基本信息.命主五行, 'string');
  assert.equal(typeof fullPayload.structuredContent.基本信息.胎元, 'string');
  assert.ok(Array.isArray(fullPayload.structuredContent.四柱[0].神煞));
});

test('bazi_dayun should expose slim default output and detailed full output', async () => {
  const rawResult = await mcpCore.handleToolCall('bazi_dayun', {
    gender: 'male',
    birthYear: 2003,
    birthMonth: 9,
    birthDay: 2,
    birthHour: 10,
    birthMinute: 20,
    calendarType: 'solar',
  });

  const defaultPayload = buildToolSuccessPayload('bazi_dayun', rawResult, 'markdown', { detailLevel: 'default' });
  const fullPayload = buildToolSuccessPayload('bazi_dayun', rawResult, 'markdown', { detailLevel: 'full' });

  assert.doesNotMatch(defaultPayload.content[0].text, /## 小运/u);
  assert.doesNotMatch(defaultPayload.content[0].text, /### 2012-2021/u);
  assert.match(fullPayload.content[0].text, /## 小运/u);
  assert.match(fullPayload.content[0].text, /### 2012-2021/u);
  assert.match(fullPayload.content[0].text, /\| 流年 \| 年龄 \| 干支 \|/u);

  assert.equal(defaultPayload.structuredContent.小运, undefined);
  assert.equal(defaultPayload.structuredContent.大运列表[0].流年列表, undefined);
  assert.equal(defaultPayload.structuredContent.大运列表[0].原局关系, undefined);
  assert.ok(Array.isArray(fullPayload.structuredContent.小运));
  assert.ok(Array.isArray(fullPayload.structuredContent.大运列表[0].流年列表));
  assert.ok(fullPayload.structuredContent.大运列表.some((item) => Array.isArray(item.原局关系) && item.原局关系.length > 0));
});

test('ziwei_calculate should expose compact default output and preserve full detail on demand', async () => {
  const rawResult = await mcpCore.handleToolCall('ziwei_calculate', {
    gender: 'male',
    birthYear: 2003,
    birthMonth: 9,
    birthDay: 2,
    birthHour: 10,
    birthMinute: 20,
    calendarType: 'solar',
  });

  const defaultPayload = buildToolSuccessPayload('ziwei_calculate', rawResult, 'markdown', { detailLevel: 'default' });
  const fullPayload = buildToolSuccessPayload('ziwei_calculate', rawResult, 'markdown', { detailLevel: 'full' });

  assert.match(defaultPayload.content[0].text, /## 十二宫位全盘/u);
  assert.match(defaultPayload.content[0].text, /生年四化/u);
  assert.doesNotMatch(defaultPayload.content[0].text, /子年斗君/u);
  assert.doesNotMatch(defaultPayload.content[0].text, /命主星/u);
  assert.doesNotMatch(defaultPayload.content[0].text, /身主星/u);
  assert.doesNotMatch(defaultPayload.content[0].text, /\| 流年 \| 小限 \|/u);

  assert.match(fullPayload.content[0].text, /## 十二宫位/u);
  assert.match(fullPayload.content[0].text, /斗君/u);
  assert.match(fullPayload.content[0].text, /命主星/u);
  assert.match(fullPayload.content[0].text, /身主星/u);
  assert.match(fullPayload.content[0].text, /\| 宫位 \| 干支 \| 大限 \| 主星及四化 \| 辅星 \| 杂曜 \| 神煞 \| 流年 \| 小限 \|/u);

  assert.equal(typeof defaultPayload.structuredContent.基本信息.生年四化?.天干, 'string');
  assert.equal(defaultPayload.structuredContent.基本信息.斗君, undefined);
  assert.equal(defaultPayload.structuredContent.基本信息.命主星, undefined);
  assert.equal(defaultPayload.structuredContent.基本信息.身主星, undefined);
  assert.equal(defaultPayload.structuredContent.小限, undefined);
  assert.equal(defaultPayload.structuredContent.十二宫位[0].杂曜, undefined);
  assert.equal(defaultPayload.structuredContent.十二宫位[0].神煞, undefined);
  assert.equal(defaultPayload.structuredContent.十二宫位[0].小限虚岁, undefined);
  assert.equal(defaultPayload.structuredContent.十二宫位[0].流年虚岁, undefined);

  assert.equal(typeof fullPayload.structuredContent.基本信息.斗君, 'string');
  assert.equal(typeof fullPayload.structuredContent.基本信息.命主星, 'string');
  assert.equal(typeof fullPayload.structuredContent.基本信息.身主星, 'string');
  assert.ok(Array.isArray(fullPayload.structuredContent.小限));
  assert.ok(Array.isArray(fullPayload.structuredContent.十二宫位[0].杂曜));
  assert.ok(Array.isArray(fullPayload.structuredContent.十二宫位[0].神煞));
  assert.ok(Array.isArray(fullPayload.structuredContent.十二宫位[0].小限虚岁));
  assert.ok(Array.isArray(fullPayload.structuredContent.十二宫位[0].流年虚岁));
});

test('ziwei_calculate should expose compact default output and keep full board behind detailLevel full', async () => {
  const rawResult = await mcpCore.handleToolCall('ziwei_calculate', {
    gender: 'male',
    birthYear: 2003,
    birthMonth: 9,
    birthDay: 2,
    birthHour: 10,
    birthMinute: 20,
    calendarType: 'solar',
  });

  const defaultPayload = buildToolSuccessPayload('ziwei_calculate', rawResult, 'markdown', { detailLevel: 'default' });
  const fullPayload = buildToolSuccessPayload('ziwei_calculate', rawResult, 'markdown', { detailLevel: 'full' });

  assert.match(defaultPayload.content[0].text, /生年四化/u);
  assert.match(defaultPayload.content[0].text, /主星及四化/u);
  assert.doesNotMatch(defaultPayload.content[0].text, /子年斗君/u);
  assert.doesNotMatch(defaultPayload.content[0].text, /命主星/u);
  assert.doesNotMatch(defaultPayload.content[0].text, /身主星/u);
  assert.doesNotMatch(defaultPayload.content[0].text, /杂曜/u);
  assert.doesNotMatch(defaultPayload.content[0].text, /神煞/u);
  assert.doesNotMatch(defaultPayload.content[0].text, /\| 流年 \| 小限 \|/u);

  assert.match(fullPayload.content[0].text, /斗君/u);
  assert.match(fullPayload.content[0].text, /命主星/u);
  assert.match(fullPayload.content[0].text, /身主星/u);
  assert.match(fullPayload.content[0].text, /杂曜/u);
  assert.match(fullPayload.content[0].text, /神煞/u);

  assert.equal(typeof defaultPayload.structuredContent.基本信息.生年四化?.天干, 'string');
  assert.equal(defaultPayload.structuredContent.基本信息.斗君, undefined);
  assert.equal(defaultPayload.structuredContent.基本信息.命主星, undefined);
  assert.equal(defaultPayload.structuredContent.基本信息.身主星, undefined);
  assert.equal(defaultPayload.structuredContent.基本信息.真太阳时, undefined);
  assert.equal(defaultPayload.structuredContent.小限, undefined);
  assert.equal(defaultPayload.structuredContent.十二宫位[0].杂曜, undefined);
  assert.equal(defaultPayload.structuredContent.十二宫位[0].神煞, undefined);
  assert.equal(defaultPayload.structuredContent.十二宫位[0].小限虚岁, undefined);
  assert.equal(defaultPayload.structuredContent.十二宫位[0].流年虚岁, undefined);

  assert.equal(typeof fullPayload.structuredContent.基本信息.斗君, 'string');
  assert.equal(typeof fullPayload.structuredContent.基本信息.命主星, 'string');
  assert.equal(typeof fullPayload.structuredContent.基本信息.身主星, 'string');
  assert.ok(Array.isArray(fullPayload.structuredContent.小限));
  assert.ok(Array.isArray(fullPayload.structuredContent.十二宫位[0].杂曜));
  assert.ok(Array.isArray(fullPayload.structuredContent.十二宫位[0].神煞));
  assert.ok(Array.isArray(fullPayload.structuredContent.十二宫位[0].小限虚岁));
  assert.ok(Array.isArray(fullPayload.structuredContent.十二宫位[0].流年虚岁));
});
