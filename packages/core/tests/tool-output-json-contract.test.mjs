import test from 'node:test';
import assert from 'node:assert/strict';

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
  assert.equal(payload.structuredContent.gender, 'male');
  assert.equal(payload.structuredContent.birthPlace, '北京');
  assert.equal(payload.structuredContent.fourPillars.year.stem, '甲');
  assert.equal(JSON.parse(payload.content[0].text).basicInfo.gender, '男');
});

test('markdown response should still keep schema-aligned structuredContent', () => {
  const payload = buildToolSuccessPayload('bazi_calculate', createBaziResult(), 'markdown');

  assert.equal(typeof payload.structuredContent, 'object');
  assert.equal(payload.structuredContent.gender, 'male');
  assert.equal(payload.structuredContent.fourPillars.year.stem, '甲');
  assert.match(payload.content[0].text, /# 八字命盘/u);
  assert.doesNotMatch(payload.content[0].text, /"basicInfo"/u, 'markdown content should remain human-readable text');
});
