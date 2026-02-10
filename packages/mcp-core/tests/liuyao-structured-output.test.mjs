import test from 'node:test';
import assert from 'node:assert/strict';

import * as mcpCore from '../dist/index.js';

const LIU_QIN = ['父母', '兄弟', '子孙', '妻财', '官鬼'];
const MOVEMENT_STATES = ['static', 'changing', 'hidden_moving', 'day_break'];

function assertIsoDate(value, field) {
  assert.equal(typeof value, 'string', `${field} should be string`);
  assert.match(value, /^\d{4}-\d{2}-\d{2}$/, `${field} should be YYYY-MM-DD`);
}

function computeCandidatePriority(candidate) {
  let score = candidate.strengthScore;
  if (candidate.movementState === 'changing') score += 12;
  if (candidate.movementState === 'hidden_moving') score += 10;
  if (candidate.movementState === 'day_break') score -= 25;
  if (candidate.isShiYao) score += 8;
  if (candidate.isYingYao) score += 4;
  if (candidate.kongWangState === 'kong_static') score -= 15;
  if (candidate.kongWangState === 'kong_changing') score -= 8;
  if (candidate.kongWangState === 'kong_ri_chong') score += 5;
  return Math.max(0, Math.min(100, score));
}

test('liuyao schema removes deprecated top-level fields and exposes refactored structures', () => {
  const tool = mcpCore.tools.find((t) => t.name === 'liuyao_analyze');
  assert.ok(tool, 'liuyao_analyze tool missing');

  const inputProps = tool.inputSchema?.properties;
  assert.equal(inputProps?.question?.type, 'string');
  assert.equal(inputProps?.yongShenTargets?.type, 'array');
  assert.deepEqual(inputProps?.yongShenTargets?.items?.enum, LIU_QIN);
  assert.equal(tool.inputSchema?.required?.includes('yongShenTargets'), true);

  const outputProps = tool.outputSchema?.properties;
  assert.equal(outputProps?.changedLines, undefined, 'changedLines should be removed');
  assert.equal(outputProps?.changedYaoCi, undefined, 'changedYaoCi should be removed');
  assert.equal(outputProps?.changedYaos, undefined, 'changedYaos should be removed');
  assert.equal(outputProps?.summary, undefined, 'summary should be removed');
  assert.equal(outputProps?.rankScoreNote, undefined, 'rankScoreNote should be removed');

  assert.equal(outputProps?.globalShenSha?.type, 'array');
  assert.equal(outputProps?.yongShen?.type, 'array');
  assert.equal(outputProps?.shenSystemByYongShen?.type, 'array');

  const fullYao = outputProps?.fullYaos?.items?.properties;
  assert.equal(fullYao?.isChanging?.type, 'boolean');
  assert.deepEqual(fullYao?.movementState?.enum, MOVEMENT_STATES);
  assert.equal(fullYao?.movementLabel?.type, 'string');
  assert.equal(fullYao?.shenSha?.type, 'array');
  assert.deepEqual(fullYao?.changedYao?.type, ['object', 'null']);
});

test('liuyao output uses refactored yao/yongshen/time structures', async () => {
  const result = await mcpCore.handleLiuyaoAnalyze({
    question: '考试结果和排名怎么样',
    method: 'select',
    hexagramName: '天火同人',
    changedHexagramName: '天山遯',
    date: '2026-02-10',
    yongShenTargets: ['官鬼', '父母'],
  });

  assert.equal(typeof result.question, 'string');
  assert.ok(Array.isArray(result.fullYaos), 'fullYaos should be array');
  assert.equal(result.fullYaos.length, 6, 'fullYaos should contain six yaos');

  assert.equal(result.changedLines, undefined, 'changedLines should be removed');
  assert.equal(result.changedYaoCi, undefined, 'changedYaoCi should be removed');
  assert.equal(result.changedYaos, undefined, 'changedYaos should be removed');
  assert.equal(result.summary, undefined, 'summary should be removed');

  for (const yao of result.fullYaos) {
    assert.equal(typeof yao.isChanging, 'boolean');
    assert.ok(MOVEMENT_STATES.includes(yao.movementState), `invalid movementState: ${yao.movementState}`);
    assert.equal(typeof yao.movementLabel, 'string');
    assert.ok(Array.isArray(yao.shenSha), 'shenSha should always be array');

    if (yao.isChanging) {
      assert.ok(yao.changedYao, 'changing yao should contain changedYao');
      assert.equal(typeof yao.changedYao.yaoCi, 'string');
      assert.equal(typeof yao.changedYao.relation, 'string');
      assert.ok(yao.changedYao.relation.length > 0, 'relation should not be empty');
    } else {
      assert.equal(yao.changedYao, null, 'stable yao should have null changedYao');
    }
  }

  assert.ok(Array.isArray(result.yongShen), 'yongShen should be grouped array');
  assert.ok(result.yongShen.length >= 2, 'yongShen should include requested multi targets');
  assert.equal(result.rankScoreNote, undefined, 'rankScoreNote should be removed from output');

  for (const group of result.yongShen) {
    assert.ok(LIU_QIN.includes(group.targetLiuQin), `invalid targetLiuQin: ${group.targetLiuQin}`);
    assert.equal('source' in group, false, 'group should not expose source');
    assert.equal('selected' in group, false, 'group should not expose selected');
    assert.ok(Array.isArray(group.candidates), 'candidates should always be array');
    assert.ok(group.candidates.length > 0, 'candidates should include primary candidate at index 0');

    for (const candidate of group.candidates) {
      assert.equal('rankScore' in candidate, false, 'candidate should not expose rankScore');
    }
    const priorities = group.candidates.map(computeCandidatePriority);
    for (let i = 1; i < group.candidates.length; i++) {
      assert.ok(priorities[i - 1] >= priorities[i], 'candidates should be sorted by priority desc');
    }
  }

  assert.ok(Array.isArray(result.timeRecommendations), 'timeRecommendations should be array');
  assert.ok(result.timeRecommendations.length > 0, 'timeRecommendations should not be empty');
  for (const item of result.timeRecommendations) {
    assert.ok(LIU_QIN.includes(item.targetLiuQin), `invalid targetLiuQin in time recommendation: ${item.targetLiuQin}`);
    assert.ok(['favorable', 'unfavorable', 'critical'].includes(item.type));
    assertIsoDate(item.startDate, 'startDate');
    assertIsoDate(item.endDate, 'endDate');
    assert.equal(typeof item.confidence, 'number');
    assert.ok(item.confidence >= 0 && item.confidence <= 1, 'confidence should be in [0, 1]');
    assert.equal(typeof item.description, 'string');
  }

  assert.ok(Array.isArray(result.globalShenSha), 'globalShenSha should be array');
});

test('liuyao can identify hidden_moving and day_break in sampled cases', async () => {
  const dates = ['2026-02-10', '2026-03-10', '2026-04-10', '2026-05-10', '2026-06-10', '2026-07-10'];
  const hexagrams = ['天火同人', '地天泰', '泽雷随', '火天大有', '坎为水', '离为火'];

  const seen = new Set();

  for (const date of dates) {
    for (const hexagramName of hexagrams) {
      const result = await mcpCore.handleLiuyaoAnalyze({
        question: '近期计划是否顺利',
        yongShenTargets: ['兄弟'],
        method: 'select',
        hexagramName,
        date,
      });

      for (const yao of result.fullYaos || []) {
        if (yao.movementState === 'hidden_moving' || yao.movementState === 'day_break') {
          seen.add(yao.movementState);
        }
      }

      if (seen.has('hidden_moving') && seen.has('day_break')) {
        break;
      }
    }

    if (seen.has('hidden_moving') && seen.has('day_break')) {
      break;
    }
  }

  assert.ok(seen.has('hidden_moving'), 'expected at least one hidden_moving case');
  assert.ok(seen.has('day_break'), 'expected at least one day_break case');
});

test('liuyao relation uses 伏吟 when changed branch stays the same', async () => {
  const result = await mcpCore.handleLiuyaoAnalyze({
    question: '测试伏吟关系',
    yongShenTargets: ['兄弟'],
    method: 'select',
    hexagramName: '乾为天',
    changedHexagramName: '水雷屯',
    date: '2026-02-10',
  });

  const target = result.fullYaos.find((yao) => yao.position === 2);
  assert.ok(target?.changedYao, 'position 2 should be changing yao');
  assert.equal(target.naJia, target.changedYao.naJia, 'fixture expects same branch');
  assert.equal(target.changedYao.relation, '伏吟');
});

test('liuyao uses 伏神 fallback when target liuqin is absent in main hexagram', async () => {
  const result = await mcpCore.handleLiuyaoAnalyze({
    question: '测试官鬼不上卦时伏神回退',
    yongShenTargets: ['官鬼'],
    method: 'select',
    hexagramName: '火水未济',
    date: '2026-02-10',
  });

  const group = result.yongShen.find((item) => item.targetLiuQin === '官鬼');
  assert.ok(group, 'missing 官鬼 yongShen group');
  assert.ok(group.candidates.length > 0, '伏神回退时 candidates[0] 应为主用神');
  const primary = group.candidates[0];
  assert.equal(typeof primary.position, 'number', 'primary.position should come from 伏神爻位');
  assert.equal('rankScore' in primary, false, '伏神回退结果不应暴露 rankScore');
  assert.ok(computeCandidatePriority(primary) > 0, '伏神回退候选应有基础优先级');
  assert.match(
    (primary.factors || []).join('、'),
    /伏神/u,
    'fallback factors should mention 伏神'
  );
});

test('liuyao time recommendations use selected fallback branch when target is absent', async () => {
  const result = await mcpCore.handleLiuyaoAnalyze({
    question: '测试官鬼不上卦时伏神回退',
    yongShenTargets: ['官鬼'],
    method: 'select',
    hexagramName: '火水未济',
    date: '2026-02-10',
  });

  const group = result.yongShen.find((item) => item.targetLiuQin === '官鬼');
  assert.ok(group, 'missing 官鬼 yongShen group');
  const primary = group.candidates[0];
  assert.equal(typeof primary.naJia, 'string', 'primary candidate should expose naJia');

  const targetedRec = result.timeRecommendations.find(
    (item) => item.targetLiuQin === '官鬼' && item.type === 'favorable' && typeof item.earthlyBranch === 'string'
  );
  assert.ok(targetedRec, 'should include a branch-targeted favorable recommendation');
  assert.equal(targetedRec.earthlyBranch, primary.naJia);
});
