import test from 'node:test';
import assert from 'node:assert/strict';
import * as mcpCore from '../dist/index.js';

test('handleToolCall should preserve legacy liuyao/tarot/fortune/dayun aliases', async () => {
  const liuyao = await mcpCore.handleToolCall('liuyao_analyze', {
    question: '项目进展如何',
    yongShenTargets: ['官鬼'],
    method: 'select',
    hexagramName: '天火同人',
    date: '2026-02-10',
  });
  assert.equal(typeof liuyao.hexagramName, 'string');

  const tarot = await mcpCore.handleToolCall('tarot_draw', {
    spreadType: 'single',
    question: '今天状态如何',
    allowReversed: true,
    seed: 'compat-seed',
  });
  assert.equal(Array.isArray(tarot.cards), true);

  const fortune = await mcpCore.handleToolCall('daily_fortune', {
    dayMaster: '甲',
    date: '2026-02-11',
  });
  assert.equal(typeof fortune.dayInfo?.ganZhi, 'string');

  const dayun = await mcpCore.handleToolCall('dayun_calculate', {
    gender: 'male',
    birthYear: 1992,
    birthMonth: 8,
    birthDay: 16,
    birthHour: 9,
    birthMinute: 30,
    calendarType: 'solar',
  });
  assert.equal(Array.isArray(dayun.list), true);
});
