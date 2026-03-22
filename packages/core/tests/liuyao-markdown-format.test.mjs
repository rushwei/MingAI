import test from 'node:test';
import assert from 'node:assert/strict';

import { renderLiuyaoCanonicalJSON, renderToolResult } from '@mingai/core';

test('liuyao markdown preserves qualitative selection status and recommendation basis', () => {
  const markdown = renderToolResult('liuyao', {
    seed: 'seed',
    question: '事业是否顺利',
    hexagramName: '天火同人',
    hexagramGong: '离',
    hexagramElement: '火',
    hexagramBrief: '和同',
    guaCi: '同人于野，亨。利涉大川。利君子贞。',
    changedHexagramName: '天山遯',
    ganZhiTime: {
      year: { gan: '甲', zhi: '辰' },
      month: { gan: '丙', zhi: '寅' },
      day: { gan: '戊', zhi: '子' },
      hour: { gan: '庚', zhi: '申' },
      xun: '甲子旬',
    },
    kongWang: { xun: '甲子旬', kongDizhi: ['戌', '亥'] },
    kongWangByPillar: {
      year: { xun: '甲子旬', kongDizhi: ['戌', '亥'] },
      month: { xun: '甲寅旬', kongDizhi: ['子', '丑'] },
      day: { xun: '甲子旬', kongDizhi: ['戌', '亥'] },
      hour: { xun: '甲申旬', kongDizhi: ['午', '未'] },
    },
    fullYaos: [],
    yongShen: [
      {
        targetLiuQin: '官鬼',
        selectionStatus: 'from_fushen',
        selectionNote: '用神不上卦，转取伏神。',
        selected: {
          liuQin: '官鬼',
          naJia: '亥',
          element: '水',
          position: 2,
          source: 'fushen',
          strength: 'moderate',
          strengthLabel: '伏神可取',
          movementState: 'static',
          movementLabel: '伏藏待时',
          isShiYao: false,
          isYingYao: false,
          kongWangState: 'not_kong',
          evidence: ['用神官鬼不上卦', '伏神得助'],
        },
        candidates: [],
      },
    ],
    shenSystemByYongShen: [],
    globalShenSha: [],
    warnings: ['见三合仍须结合月日动静'],
    timeRecommendations: [
      {
        targetLiuQin: '官鬼',
        type: 'critical',
        earthlyBranch: '亥',
        trigger: '待出伏',
        basis: ['用神伏藏', '转取伏神'],
        description: '需待出伏、得助或飞神发动。',
      },
    ],
  }, 'markdown').content[0].text;

  assert.match(markdown, /卦辞:\s*同人于野，亨。利涉大川。利君子贞。/u);
  assert.equal(markdown.includes('卦辞: 和同'), false);
  assert.match(markdown, /伏神取用/u);
  assert.match(markdown, /依据:\s*用神官鬼不上卦、伏神得助/u);
  assert.match(markdown, /待出伏（用神伏藏、转取伏神）/u);
});

test('liuyao canonical json should keep global shensha separate from guaLevelAnalysis', () => {
  const json = renderLiuyaoCanonicalJSON({
    question: '事业是否顺利',
    hexagramName: '天火同人',
    hexagramGong: '离',
    hexagramElement: '火',
    changedHexagramName: '天山遯',
    ganZhiTime: {
      year: { gan: '甲', zhi: '辰' },
      month: { gan: '丙', zhi: '寅' },
      day: { gan: '戊', zhi: '子' },
      hour: { gan: '庚', zhi: '申' },
      xun: '甲子旬',
    },
    kongWang: { xun: '甲子旬', kongDizhi: ['戌', '亥'] },
    kongWangByPillar: {
      year: { xun: '甲子旬', kongDizhi: ['戌', '亥'] },
      month: { xun: '甲寅旬', kongDizhi: ['子', '丑'] },
      day: { xun: '甲子旬', kongDizhi: ['戌', '亥'] },
      hour: { xun: '甲申旬', kongDizhi: ['午', '未'] },
    },
    fullYaos: [],
    yongShen: [],
    shenSystemByYongShen: [],
    globalShenSha: ['天乙', '月德'],
    warnings: [],
    timeRecommendations: [],
  });

  assert.deepEqual(json.globalShenSha, ['天乙', '月德']);
  assert.equal(json.guaLevelAnalysis.some((line) => /全局神煞/u.test(line)), false);
});

test('liuyao canonical json should preserve selected snapshot fields for non-visible yongshen sources', () => {
  const json = renderLiuyaoCanonicalJSON({
    question: '测试',
    hexagramName: '水雷屯',
    hexagramGong: '坎',
    hexagramElement: '水',
    ganZhiTime: {
      year: { gan: '甲', zhi: '辰' },
      month: { gan: '丙', zhi: '寅' },
      day: { gan: '戊', zhi: '子' },
      hour: { gan: '庚', zhi: '申' },
      xun: '甲子旬',
    },
    kongWang: { xun: '甲子旬', kongDizhi: ['戌', '亥'] },
    kongWangByPillar: {
      year: { xun: '甲子旬', kongDizhi: ['戌', '亥'] },
      month: { xun: '甲寅旬', kongDizhi: ['子', '丑'] },
      day: { xun: '甲子旬', kongDizhi: ['戌', '亥'] },
      hour: { xun: '甲申旬', kongDizhi: ['午', '未'] },
    },
    fullYaos: [],
    yongShen: [{
      targetLiuQin: '妻财',
      selectionStatus: 'from_changed',
      selectionNote: '变出取用',
      selected: {
        liuQin: '妻财',
        naJia: '午',
        changedNaJia: '午',
        huaType: '回头生',
        element: '火',
        position: 4,
        source: 'changed',
        strength: 'strong',
        strengthLabel: '旺相',
        movementState: 'changing',
        movementLabel: '明动',
        isShiYao: false,
        isYingYao: true,
        kongWangState: 'empty',
        evidence: ['变出取用'],
      },
      candidates: [{
        liuQin: '妻财',
        naJia: '午',
        element: '火',
        position: 4,
        source: 'changed',
        strength: 'strong',
        strengthLabel: '旺相',
        movementState: 'changing',
        movementLabel: '明动',
        isShiYao: false,
        isYingYao: true,
        kongWangState: 'empty',
        evidence: ['并看'],
      }],
    }],
    shenSystemByYongShen: [],
    globalShenSha: [],
    warnings: [],
    timeRecommendations: [],
  });

  const selected = json.yongShenAnalysis[0]?.selected;
  assert.equal(selected?.source, 'changed');
  assert.equal(selected?.element, '火');
  assert.equal(selected?.movementState, 'changing');
  assert.equal(selected?.isYingYao, true);
  assert.equal(selected?.kongWangState, 'empty');
  assert.equal(json.yongShenAnalysis[0]?.candidates?.[0]?.source, 'changed');
});
