import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeAnalysisSourceData,
  normalizeAnalysisSourceType,
  getSourceDataModelId,
  getSourceDataReasoning,
} from '../lib/ai/source-contract';

test('analysis source contract should preserve qimen and daliuren and stamp source_data schema version', () => {
  assert.equal(normalizeAnalysisSourceType('qimen'), 'qimen');
  assert.equal(normalizeAnalysisSourceType('daliuren'), 'daliuren');

  const normalized = normalizeAnalysisSourceData('qimen', {
    model_id: 'deepseek-v3.2',
    reasoning_text: 'reasoning',
    ju_number: 9,
  });

  assert.equal(normalized.schema_version, 1);
  assert.equal(getSourceDataModelId(normalized), 'deepseek-v3.2');
  assert.equal(getSourceDataReasoning(normalized), 'reasoning');
});
