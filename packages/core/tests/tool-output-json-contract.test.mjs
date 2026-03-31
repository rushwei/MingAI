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

  assert.equal(defaultPayload.structuredContent.xiaoYun, undefined);
  assert.equal(defaultPayload.structuredContent.list[0].liunianList, undefined);
  assert.equal(defaultPayload.structuredContent.list[0].branchRelations, undefined);
  assert.ok(Array.isArray(fullPayload.structuredContent.xiaoYun));
  assert.ok(Array.isArray(fullPayload.structuredContent.list[0].liunianList));
  assert.ok(fullPayload.structuredContent.list.some((item) => Array.isArray(item.branchRelations) && item.branchRelations.length > 0));
});
