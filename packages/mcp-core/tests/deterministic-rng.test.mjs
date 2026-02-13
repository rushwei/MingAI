import test from 'node:test';
import assert from 'node:assert/strict';
import * as mcpCore from '../dist/index.js';

test('tarot_draw should be deterministic with identical seed', async () => {
  const seed = 'seed-tarot-1';
  const input = { spreadType: 'three-card', question: '感情', allowReversed: true, seed };

  const a = await mcpCore.handleTarotDraw(input);
  const b = await mcpCore.handleTarotDraw(input);

  assert.equal(a.seed, seed);
  assert.equal(b.seed, seed);
  assert.deepEqual(a.cards, b.cards);
});

test('daily_fortune should return consistent results for same date', async () => {
  const input = { dayMaster: '甲', date: '2026-02-11' };

  const a = await mcpCore.handleDailyFortune(input);
  const b = await mcpCore.handleDailyFortune(input);

  assert.equal(a.date, b.date);
  assert.equal(a.dayInfo.ganZhi, b.dayInfo.ganZhi);
  assert.equal(a.seed, undefined);
  assert.equal(a.scores, undefined);
  assert.equal(a.advice, undefined);
  assert.equal(a.luckyColor, undefined);
  assert.equal(a.luckyDirection, undefined);
});

test('daily_fortune schema should not expose removed guidance fields', async () => {
  const tool = mcpCore.tools.find((item) => item.name === 'daily_fortune');
  assert.ok(tool, 'daily_fortune tool missing');
  assert.equal(tool.outputSchema?.properties?.scores, undefined);
  assert.equal(tool.outputSchema?.properties?.advice, undefined);
  assert.equal(tool.outputSchema?.properties?.luckyColor, undefined);
  assert.equal(tool.outputSchema?.properties?.luckyDirection, undefined);
});

test('liuyao_analyze(auto) should be deterministic with identical seed', async () => {
  const seed = 'seed-liuyao-1';
  const input = {
    question: '这周项目顺利吗',
    yongShenTargets: ['官鬼'],
    method: 'auto',
    date: '2026-02-11',
    seed,
  };

  const a = await mcpCore.handleLiuyaoAnalyze(input);
  const b = await mcpCore.handleLiuyaoAnalyze(input);

  assert.equal(a.seed, seed);
  assert.equal(b.seed, seed);
  assert.equal(a.hexagramName, b.hexagramName);
  assert.deepEqual(a.changedLines, b.changedLines);
});

test('same seed should be stable within scope and different across scopes', async () => {
  const base = {
    spreadType: 'single',
    question: '同一问题',
    allowReversed: true,
    seed: 'seed-shared-1',
  };

  const userA1 = await mcpCore.handleTarotDraw({ ...base, seedScope: 'user-a' });
  const userA2 = await mcpCore.handleTarotDraw({ ...base, seedScope: 'user-a' });
  const userB = await mcpCore.handleTarotDraw({ ...base, seedScope: 'user-b' });

  assert.equal(userA1.seed, userA2.seed);
  assert.deepEqual(userA1.cards, userA2.cards);
  assert.notEqual(userA1.seed, userB.seed);
});
