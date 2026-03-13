import test from 'node:test';
import assert from 'node:assert/strict';

import * as mcpCore from '../dist/index.js';

test('liuyao schema no longer exposes score or confidence fields', () => {
  const tool = mcpCore.tools.find((item) => item.name === 'liuyao_analyze');
  assert.ok(tool, 'liuyao_analyze tool missing');

  const fullYao = tool.outputSchema?.properties?.fullYaos?.items?.properties;
  assert.equal(fullYao?.strengthScore, undefined);

  const yongShenCandidate = tool.outputSchema?.properties?.yongShen?.items?.properties?.candidates?.items?.properties;
  assert.equal(yongShenCandidate?.strengthScore, undefined);
  assert.equal(yongShenCandidate?.rankScore, undefined);

  const timeRecommendation = tool.outputSchema?.properties?.timeRecommendations?.items?.properties;
  assert.equal(timeRecommendation?.confidence, undefined);
  assert.equal(timeRecommendation?.startDate, undefined);
  assert.equal(timeRecommendation?.endDate, undefined);
});

test('mcp liuyao uses fixed najia for 天风姤 and should not treat second yao as 妻财', async () => {
  const result = await mcpCore.handleLiuyaoAnalyze({
    question: '问财运',
    yongShenTargets: ['妻财'],
    method: 'select',
    hexagramName: '天风姤',
    date: '2026-02-10',
  });

  const naJiaList = result.fullYaos.map((yao) => yao.naJia);
  assert.deepEqual(naJiaList, ['丑', '亥', '酉', '午', '申', '戌']);
  assert.equal(result.fullYaos[1]?.liuQin, '子孙');
});

test('mcp liuyao should reject empty question instead of producing formal interpretation context', async () => {
  await assert.rejects(
    () => mcpCore.handleLiuyaoAnalyze({
      question: '',
      yongShenTargets: [],
      method: 'select',
      hexagramName: '乾为天',
      date: '2026-02-10',
    }),
    /请先明确问题后再解卦/u
  );
});
