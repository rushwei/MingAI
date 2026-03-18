import test from 'node:test';
import assert from 'node:assert/strict';

process.env.NEWAPI_API_KEY = 'test-newapi-key';

test('openai-compatible provider should send Cherry-like advanced defaults and omit max_tokens when unset', async (t) => {
  const { OpenAICompatibleProvider } = await import('../lib/ai/providers/openai-compatible');

  const originalFetch = global.fetch;
  let capturedBody: Record<string, unknown> | null = null;

  global.fetch = async (_input: string | URL | Request, init?: RequestInit) => {
    capturedBody = JSON.parse(String(init?.body || '{}'));
    return Response.json({
      choices: [{ message: { content: 'ok' } }],
    });
  };

  t.after(() => {
    global.fetch = originalFetch;
  });

  const provider = new OpenAICompatibleProvider('qwen');
  await provider.chat(
    [{ role: 'user', content: 'hello' }],
    'system',
    {
      id: 'qwen-max',
      name: 'Qwen Max',
      vendor: 'qwen',
      modelId: 'qwen-max',
      apiUrl: 'https://newapi.example/v1/chat/completions',
      apiKeyEnvVar: 'NEWAPI_API_KEY',
      supportsReasoning: true,
      defaultTemperature: 0.7,
      defaultTopP: 1,
      defaultMaxTokens: undefined,
      defaultReasoningEffort: 'high',
      reasoningEffortFormat: 'reasoning_object',
      customParameters: {
        enable_search: false,
        presence_penalty: 0.5,
        frequency_penalty: 0.2,
      },
    },
    { reasoning: true }
  );

  assert.ok(capturedBody, 'request body should be captured');
  assert.equal(capturedBody?.temperature, 0.7);
  assert.equal(capturedBody?.top_p, 1);
  assert.equal(capturedBody?.presence_penalty, 0.5);
  assert.equal(capturedBody?.frequency_penalty, 0.2);
  assert.equal('max_tokens' in (capturedBody || {}), false);
  assert.deepEqual(capturedBody?.reasoning, { effort: 'high' });
  assert.equal(capturedBody?.enable_search, false);
});
