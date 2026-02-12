import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.DEEPSEEK_MODEL_ID = 'deepseek-chat';
process.env.DEEPSEEK_API_KEY = 'test-key';

test('resolveModelAccess returns default model and disables reasoning', async () => {
    const { resolveModelAccess } = await import('../lib/ai/ai-access');
    const { DEFAULT_MODEL_ID } = await import('../lib/ai/ai-config');

    const result = resolveModelAccess(undefined, DEFAULT_MODEL_ID, 'free', true);

    assert.equal('error' in result, false);
    if ('error' in result) return;
    assert.equal(result.modelId, DEFAULT_MODEL_ID);
    assert.equal(result.reasoningEnabled, false);
});

test('resolveModelAccess rejects non-vision model when vision required', async () => {
    const { resolveModelAccess } = await import('../lib/ai/ai-access');
    const { DEFAULT_MODEL_ID } = await import('../lib/ai/ai-config');

    const result = resolveModelAccess(undefined, DEFAULT_MODEL_ID, 'plus', false, { requireVision: true });

    assert.equal('error' in result, true);
    if (!('error' in result)) return;
    assert.equal(result.status, 400);
});

test('resolveModelAccess returns model unavailable for invalid id', async () => {
    const { resolveModelAccess } = await import('../lib/ai/ai-access');
    const { DEFAULT_MODEL_ID } = await import('../lib/ai/ai-config');

    const result = resolveModelAccess('invalid-model', DEFAULT_MODEL_ID, 'plus');

    assert.equal('error' in result, true);
    if (!('error' in result)) return;
    assert.equal(result.error, '模型不可用');
});
