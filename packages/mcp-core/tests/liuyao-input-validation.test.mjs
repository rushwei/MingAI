import test from 'node:test';
import assert from 'node:assert/strict';

import * as mcpCore from '../dist/index.js';

test('liuyao rejects missing yongShenTargets when question is provided', async () => {
  await assert.rejects(
    () =>
      mcpCore.handleLiuyaoAnalyze({
        question: '近期事业如何',
        method: 'select',
        hexagramName: '天火同人',
        date: '2026-02-10',
      }),
    /yongShenTargets|分析目标|请选择/u,
  );
});

test('liuyao allows empty question with explicit empty yongShenTargets', async () => {
  const result = await mcpCore.handleLiuyaoAnalyze({
    question: '',
    yongShenTargets: [],
    method: 'select',
    hexagramName: '天火同人',
    date: '2026-02-10',
  });

  assert.ok(Array.isArray(result.yongShen));
  assert.equal(result.yongShen.length, 0);
});

test('liuyao rejects illegal yongShenTargets values', async () => {
  await assert.rejects(
    () =>
      mcpCore.handleLiuyaoAnalyze({
        question: '近期事业如何',
        yongShenTargets: ['官鬼', '无效目标'],
        method: 'select',
        hexagramName: '天火同人',
        date: '2026-02-10',
      }),
    /yongShenTargets|非法|无效/u,
  );
});

test('liuyao accepts explicit multiple targets in strict mode', async () => {
  const result = await mcpCore.handleLiuyaoAnalyze({
    question: '考试结果和排名怎么样',
    yongShenTargets: ['官鬼', '父母'],
    method: 'select',
    hexagramName: '天火同人',
    date: '2026-02-10',
  });

  assert.ok(Array.isArray(result.yongShen));
  assert.ok(result.yongShen.some((group) => group.targetLiuQin === '官鬼'));
  assert.ok(result.yongShen.some((group) => group.targetLiuQin === '父母'));
  for (const group of result.yongShen) {
    assert.equal(group.source, 'input');
  }
});
