import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildUserSettingsUpdatePayload } from '../lib/user/settings';

test('buildUserSettingsUpdatePayload should ignore invalid visualization settings instead of clearing them', () => {
  const payload = buildUserSettingsUpdatePayload('user-1', {
    customInstructions: 'keep it simple',
    visualizationSettings: {
      selectedDimensions: ['invalid-dimension'] as any,
      dayunDisplayCount: 99,
      chartStyle: 'invalid-style' as unknown as 'modern',
    },
  });

  assert.equal(payload.custom_instructions, 'keep it simple');
  assert.equal('visualization_settings' in payload, false);
});

test('buildUserSettingsUpdatePayload should allow explicit clearing of visualization settings', () => {
  const payload = buildUserSettingsUpdatePayload('user-1', {
    visualizationSettings: null,
  });

  assert.equal(payload.visualization_settings, null);
});

test('buildUserSettingsUpdatePayload should persist chart prompt detail level when valid', () => {
  const payload = buildUserSettingsUpdatePayload('user-1', {
    chartPromptDetailLevel: 'more',
  });

  assert.equal(payload.chart_prompt_detail_level, 'more');
});
