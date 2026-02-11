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

test('daily_fortune should be deterministic with identical seed', async () => {
  const seed = 'seed-fortune-1';
  const input = { dayMaster: '甲', date: '2026-02-11', seed };

  const a = await mcpCore.handleDailyFortune(input);
  const b = await mcpCore.handleDailyFortune(input);

  assert.equal(a.seed, seed);
  assert.equal(b.seed, seed);
  assert.deepEqual(a.scores, b.scores);
  assert.equal(a.luckyColor, b.luckyColor);
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
