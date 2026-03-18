import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.MINGAI_FALLBACK_MODELS_JSON = JSON.stringify([
    {
        id: 'deepseek-v3.2',
        name: 'DeepSeek V3.2',
        vendor: 'deepseek',
        usageType: 'chat',
        supportsReasoning: false,
    },
]);

test('resolveModelAccess returns default model and disables reasoning', async () => {
    const { resolveModelAccess } = await import('../lib/ai/ai-access');
    const fallbackModelId = 'deepseek-v3.2';

    const result = resolveModelAccess(undefined, fallbackModelId, 'free', true);

    assert.equal('error' in result, false);
    if ('error' in result) return;
    assert.equal(result.modelId, fallbackModelId);
    assert.equal(result.reasoningEnabled, false);
});

test('resolveModelAccess rejects non-vision model when vision required', async () => {
    const { resolveModelAccess } = await import('../lib/ai/ai-access');
    const fallbackModelId = 'deepseek-v3.2';

    const result = resolveModelAccess(undefined, fallbackModelId, 'plus', false, { requireVision: true });

    assert.equal('error' in result, true);
    if (!('error' in result)) return;
    assert.equal(result.status, 400);
});

test('resolveModelAccess returns model unavailable for invalid id', async () => {
    const { resolveModelAccess } = await import('../lib/ai/ai-access');
    const fallbackModelId = 'deepseek-v3.2';

    const result = resolveModelAccess('invalid-model', fallbackModelId, 'plus');

    assert.equal('error' in result, true);
    if (!('error' in result)) return;
    assert.equal(result.error, '模型不可用');
});
